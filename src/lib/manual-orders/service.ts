import 'server-only';
import { requireDispatchAdminSession } from '@/lib/dispatch/auth';
import { quoteManualOrder } from './pricing';
import { isManualOrdersEnabled } from './feature-flags';
import { manualRequestHash } from './attestation';
import { executeManualCommand, findManualCommand, findManualProfile } from './repository';
import { ManualPersistenceError, type CustomerClassification, type ManualOperation } from './persistence-types';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function object(value: unknown, keys: string[]) {
 if (!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).length!==keys.length || Object.keys(value).some(k=>!keys.includes(k))) throw new ManualPersistenceError('manual_invalid_input');
 return value as Record<string,unknown>;
}
function text(value: unknown,min: number,max: number) {
 if (typeof value!=='string' || value.trim().length<min || value.trim().length>max || /[\u0000-\u001f\u007f<>]/.test(value)) throw new ManualPersistenceError('manual_invalid_input');
 return value.trim();
}
function paymentReference(value: unknown, optional: boolean): string | null {
 if(optional && (value===null || value===undefined)) return null;
 if(typeof value!=='string' || /[\u0000-\u001f\u007f<>]/.test(value)) throw new ManualPersistenceError('manual_invalid_input');
 const normalized=value.trim().toUpperCase();
 if(optional && normalized==='') return null;
 if(normalized.length<1 || normalized.length>120) throw new ManualPersistenceError('manual_invalid_input');
 return normalized;
}
function uuid(value: unknown) { const id=text(value,36,36).toLowerCase(); if(!UUID.test(id)) throw new ManualPersistenceError('manual_invalid_id'); return id; }
function classification(value: unknown): CustomerClassification {
 const c=object(value,['relationship','frequency','segment']);
 if ((c.segment!=='retail'&&c.segment!=='wholesale')) throw new ManualPersistenceError('manual_invalid_classification');
 if (c.relationship==='prospect' && c.frequency===null) return {relationship:'prospect',frequency:null,segment:c.segment as 'retail'|'wholesale'};
 if (c.relationship==='customer' && (c.frequency==='new'||c.frequency==='frequent')) return {relationship:'customer',frequency:c.frequency,segment:c.segment as 'retail'|'wholesale'};
 throw new ManualPersistenceError('manual_invalid_classification');
}
async function authorize() {
 if (!isManualOrdersEnabled()) throw new ManualPersistenceError('manual_module_disabled');
 await requireDispatchAdminSession();
}
function confirmed(value: unknown) { if(value!==true) throw new ManualPersistenceError('manual_confirmation_required'); return true; }
function version(value: unknown) { if(!Number.isSafeInteger(value)||(value as number)<1) throw new ManualPersistenceError('manual_invalid_version'); return value as number; }

// No Server Action or route is exported. Future callers use only these protected
// entry points; browser role, quote, price and total fields are not accepted.
export async function createManualOrder(input: unknown) {
 await authorize();
 const v=object(input,['commandId','acceptedPricingFingerprint','channel','otherChannelDetail','customer','classification','profileId','profileVersion','shippingAddress','quoteRequest','confirmed','reason']);
 const commandId=uuid(v.commandId), acceptedPricingFingerprint=text(v.acceptedPricingFingerprint,64,64);
 if(!/^[a-f0-9]{64}$/.test(acceptedPricingFingerprint)) throw new ManualPersistenceError('manual_pricing_changed');
 if(v.channel!=='whatsapp'&&v.channel!=='phone'&&v.channel!=='other') throw new ManualPersistenceError('manual_invalid_channel');
 const otherChannelDetail=v.channel==='other'?text(v.otherChannelDetail,2,100):null;
 if(v.channel!=='other'&&v.otherChannelDetail!==null) throw new ManualPersistenceError('manual_invalid_channel');
 const rawCustomer=object(v.customer,['name','email','phone']);
 const email=rawCustomer.email===null?null:text(rawCustomer.email,5,150).toLowerCase();
 if(email!==null&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ManualPersistenceError('manual_invalid_customer');
 const phone=text(rawCustomer.phone,10,30).replace(/\D/g,'');
 if(!/^[0-9]{10,15}$/.test(phone)) throw new ManualPersistenceError('manual_invalid_customer');
 const customer={name:text(rawCustomer.name,2,120),email,phone};
 const address=object(v.shippingAddress,['streetAddress','colonia','city','state','postalCode','country']);
 const shippingAddress={streetAddress:text(address.streetAddress,3,160),colonia:text(address.colonia,2,100),city:text(address.city,2,100),state:text(address.state,2,100),postalCode:text(address.postalCode,5,5),country:'México' as const};
 if(!/^[0-9]{5}$/.test(shippingAddress.postalCode)||address.country!=='México') throw new ManualPersistenceError('manual_invalid_customer');
 const profileId=v.profileId===null?null:uuid(v.profileId), profileVersion=profileId===null?null:version(v.profileVersion);
 if(profileId===null&&v.profileVersion!==null || profileId!==null&&v.classification!==null) throw new ManualPersistenceError('manual_invalid_profile');
 const requestedClassification=profileId===null?classification(v.classification):null;
 const intent={commandId,acceptedPricingFingerprint,channel:v.channel,otherChannelDetail,customer,shippingAddress,profileId,profileVersion,classification:requestedClassification,quoteRequest:v.quoteRequest,confirmed:confirmed(v.confirmed),reason:text(v.reason,10,500)};
 const hash=manualRequestHash('create',intent);
 const replay=await findManualCommand(commandId,'create',hash);
 if(replay) return replay; // Durable result wins even if prices/profile changed.
 const profile=profileId===null?null:await findManualProfile(profileId);
 if(profile&&profile.version!==profileVersion) throw new ManualPersistenceError('manual_profile_conflict');
 const actualClassification=profile?classification(profile.classification):requestedClassification!;
 const quote=quoteManualOrder(v.quoteRequest,{role:'principal_admin',actor:'shared_admin',customerSegment:actualClassification.segment});
 if(quote.pricingFingerprint!==acceptedPricingFingerprint) throw new ManualPersistenceError('manual_pricing_changed');
 if(quote.totalCents<=0||quote.blockingReasons.length) throw new ManualPersistenceError('manual_quote_blocked');
 return executeManualCommand('create',commandId,hash,{...intent,classification:actualClassification,quote});
}

async function mutate(operation: Exclude<ManualOperation,'create'>,input: unknown) {
 await authorize();
 const extra: Record<Exclude<ManualOperation,'create'>,string[]>={record_payment:['amountCents','method','reference','occurredAt'],void_payment:['receiptId','confirmedErroneousCapture'],cancel:[],hold:['onHold'],ship:['shippingCarrier','trackingNumber','trackingUrl']};
 const optionalCashReference=operation==='record_payment' && input!==null && typeof input==='object' && !Array.isArray(input)
  && 'method' in input && input.method==='cash' && !Object.hasOwn(input,'reference');
 const keys=['commandId','orderId','expectedVersion','confirmed','reason',...extra[operation]];
 const v=object(input,optionalCashReference?keys.filter(key=>key!=='reference'):keys);
 const commandId=uuid(v.commandId);
 const data: Record<string,unknown>={orderId:uuid(v.orderId),expectedVersion:version(v.expectedVersion),confirmed:confirmed(v.confirmed),reason:text(v.reason,10,500)};
 if(operation==='record_payment') {
  if(!Number.isSafeInteger(v.amountCents)||(v.amountCents as number)<=0||(v.method!=='bank_transfer'&&v.method!=='deposit'&&v.method!=='cash')) throw new ManualPersistenceError('manual_invalid_payment');
  const date=text(v.occurredAt,10,40), parsed=new Date(date);
  if(!Number.isFinite(parsed.getTime())||parsed.getTime()>Date.now()+300000) throw new ManualPersistenceError('manual_invalid_payment');
  Object.assign(data,{amountCents:v.amountCents,method:v.method,reference:paymentReference(v.reference,v.method==='cash'),occurredAt:parsed.toISOString()});
 } else if(operation==='void_payment') {
  Object.assign(data,{receiptId:uuid(v.receiptId),confirmedErroneousCapture:confirmed(v.confirmedErroneousCapture)});
 } else if(operation==='hold') {
  if(typeof v.onHold!=='boolean') throw new ManualPersistenceError('manual_invalid_hold'); data.onHold=v.onHold;
 } else if(operation==='ship') {
  const trackingUrl=text(v.trackingUrl,12,2048);
  let url: URL; try { url=new URL(trackingUrl); } catch { throw new ManualPersistenceError('manual_invalid_shipment'); }
  if(url.protocol!=='https:'||url.username||url.password) throw new ManualPersistenceError('manual_invalid_shipment');
  Object.assign(data,{shippingCarrier:text(v.shippingCarrier,1,100),trackingNumber:text(v.trackingNumber,1,120),trackingUrl});
 }
 const hash=manualRequestHash(operation,data), replay=await findManualCommand(commandId,operation,hash);
 return replay??executeManualCommand(operation,commandId,hash,data);
}
export const recordManualPayment=(input: unknown)=>mutate('record_payment',input);
export const voidManualPayment=(input: unknown)=>mutate('void_payment',input);
export const cancelManualOrder=(input: unknown)=>mutate('cancel',input);
export const setManualOrderHold=(input: unknown)=>mutate('hold',input);
export const shipManualOrder=(input: unknown)=>mutate('ship',input);
