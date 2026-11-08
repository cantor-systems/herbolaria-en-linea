import assert from 'node:assert/strict';
import test from 'node:test';
import * as crypto from 'node:crypto';
import { loadSource } from '../helpers/isolatedModule.mjs';
import { admin, harness, product, line, request, reason, special } from './helpers.mjs';
const types=loadSource('src/lib/manual-orders/persistence-types.ts');
const commandId='00000000-0000-4000-8000-000000000001', orderId='00000000-0000-4000-8000-000000000002';
const p=product('synthetic-persistence',10000), engine=harness({products:[p]});
const quoteRequest=request([line(p)],{standardShippingCourtesy:{requested:true,reason}});
const quote=engine.quote(quoteRequest,admin);
const classification={relationship:'customer',frequency:'new',segment:'retail'};
function input(overrides={}) {return {commandId,acceptedPricingFingerprint:quote.pricingFingerprint,channel:'whatsapp',otherChannelDetail:null,
 customer:{name:'Cliente sintético',email:'synthetic@example.invalid',phone:'5500000000'},classification,profileId:null,profileVersion:null,
 shippingAddress:{streetAddress:'Calle sintética 1',colonia:'Colonia sintética',city:'Ciudad sintética',state:'Estado sintético',postalCode:'00000',country:'México'},
 quoteRequest,confirmed:true,reason,...overrides};}
function setup({enabled=true,session=true,replay=null,profile=null,pricing=engine.quote}={}) {
 const calls=[];
 const service=loadSource('src/lib/manual-orders/service.ts',{
  'server-only':{},'@/lib/dispatch/auth':{requireDispatchAdminSession:async()=>{calls.push('auth');if(!session)throw new Error('synthetic-session-denied');}},
  './pricing':{quoteManualOrder:(...args)=>{calls.push('price');return pricing(...args);}},'./feature-flags':{isManualOrdersEnabled:()=>enabled},
  './attestation':{manualRequestHash:(operation,data)=>crypto.createHash('sha256').update(JSON.stringify({operation,data})).digest('hex')},
  './repository':{findManualCommand:async(...args)=>{calls.push(['lookup',...args]);return replay;},findManualProfile:async()=>{calls.push('profile');return profile;},
   executeManualCommand:async(...args)=>{calls.push(['persist',...args]);return {orderId,...args[3]};}},'./persistence-types':types,
 });return {service,calls};
}
const code=expected=>e=>e.code===expected;

test('manual activation accepts only exact true, with no default activation',()=>{
 for(const value of [undefined,'','false','TRUE','1',' true','true ']) {
  const module=loadSource('src/lib/manual-orders/feature-flags.ts',{'server-only':{}}, {process:{env:{MANUAL_ORDERS_ENABLED:value}}});
  assert.equal(module.isManualOrdersEnabled(),false);
 }
 assert.equal(loadSource('src/lib/manual-orders/feature-flags.ts',{'server-only':{}}, {process:{env:{MANUAL_ORDERS_ENABLED:'true'}}}).isManualOrdersEnabled(),true);
});

test('disabled or unauthenticated operations perform no repository call',async()=>{
 const disabled=setup({enabled:false});await assert.rejects(disabled.service.createManualOrder(input()),code('manual_module_disabled'));assert.deepEqual(disabled.calls,[]);
 const denied=setup({session:false});await assert.rejects(denied.service.createManualOrder(input()),/synthetic-session-denied/);assert.deepEqual(denied.calls,['auth']);
 for(const name of ['recordManualPayment','voidManualPayment','cancelManualOrder','setManualOrderHold','shipManualOrder']) {
  const module=setup({enabled:false});await assert.rejects(module.service[name]({}),code('manual_module_disabled'));assert.deepEqual(module.calls,[]);
 }
});

test('creation recalculates commercial quote after auth and ignores no authoritative browser fields',async()=>{
 const {service,calls}=setup();await service.createManualOrder(input());
 assert.equal(calls[0],'auth');assert.ok(calls.indexOf('price')<calls.findIndex(c=>Array.isArray(c)&&c[0]==='persist'));
 const saved=calls.find(c=>Array.isArray(c)&&c[0]==='persist');assert.equal(saved[1],'create');assert.equal(saved[4].quote.totalCents,10000);assert.equal(saved[4].quote.snapshot.authorization.role,'principal_admin');
 for(const field of ['role','totalCents','quote','unitPriceCents','eligibility','status']) {
  const s=setup();await assert.rejects(s.service.createManualOrder(input({[field]:'forged'})),code('manual_invalid_input'));assert.ok(!s.calls.some(c=>Array.isArray(c)&&c[0]==='persist'));
 }
});

test('accepted fingerprint, explicit confirmation and positive unblocked total are mandatory',async()=>{
 for(const [overrides,expected] of [[{acceptedPricingFingerprint:'0'.repeat(64)},'manual_pricing_changed'],[{confirmed:false},'manual_confirmation_required'],[{reason:'short'},'manual_invalid_input']]) {
  const s=setup();await assert.rejects(s.service.createManualOrder(input(overrides)),code(expected));assert.ok(!s.calls.some(c=>Array.isArray(c)&&c[0]==='persist'));
 }
 const zeroRequest={...quoteRequest,discount:special(10000)},zero=engine.quote(zeroRequest,admin),s=setup();
 await assert.rejects(s.service.createManualOrder(input({quoteRequest:zeroRequest,acceptedPricingFingerprint:zero.pricingFingerprint})),code('manual_quote_blocked'));
 const blocked={...quote,blockingReasons:['special_discount_less_favorable']},s2=setup({pricing:()=>blocked});
 await assert.rejects(s2.service.createManualOrder(input()),code('manual_quote_blocked'));
});

test('durable replay precedes repricing and profile reads, even after catalog changes',async()=>{
 const result={orderId,replayed:true},s=setup({replay:result,pricing:()=>{throw new Error('must not reprice');}});
 assert.equal(await s.service.createManualOrder(input()),result);assert.ok(!s.calls.includes('price'));assert.ok(!s.calls.includes('profile'));
});

test('existing customer classification comes from stored profile and version, not browser',async()=>{
 const s=setup({profile:{id:orderId,version:1,classification:{...classification,segment:'wholesale'}}});
 await s.service.createManualOrder(input({profileId:orderId,profileVersion:1,classification:null,acceptedPricingFingerprint:engine.quote(quoteRequest,{...admin,customerSegment:'wholesale'}).pricingFingerprint}));
 const saved=s.calls.find(c=>Array.isArray(c)&&c[0]==='persist');assert.equal(saved[4].classification.segment,'wholesale');
 await assert.rejects(setup().service.createManualOrder(input({profileId:orderId,profileVersion:1,classification})),code('manual_invalid_profile'));
 await assert.rejects(setup({profile:{version:2,classification}}).service.createManualOrder(input({profileId:orderId,profileVersion:1,classification:null})),code('manual_profile_conflict'));
});

const mutation={commandId,orderId,expectedVersion:1,reason,confirmed:true};
test('external payment methods, exact positive cents and administrative intent are validated',async()=>{
 for(const method of ['bank_transfer','deposit','cash']) {
  const s=setup();await s.service.recordManualPayment({...mutation,method,amountCents:100,reference:' synthetic-reference ',occurredAt:'2026-01-01T00:00:00Z'});
  const data=s.calls.find(c=>Array.isArray(c)&&c[0]==='persist')[4];assert.equal(data.reference,'SYNTHETIC-REFERENCE');assert.equal(data.method,method);
 }
 for(const amountCents of [0,-1,1.2,Infinity,Number.MAX_SAFE_INTEGER+1]) await assert.rejects(setup().service.recordManualPayment({...mutation,method:'cash',amountCents,reference:'synthetic',occurredAt:'2026-01-01T00:00:00Z'}),code('manual_invalid_payment'));
 await assert.rejects(setup().service.recordManualPayment({...mutation,method:'mercadopago',amountCents:1,reference:'synthetic',occurredAt:'2026-01-01T00:00:00Z'}),code('manual_invalid_payment'));
});

test('corrections, cancellation, hold and shipping are protected operations without refunds or delivery',async()=>{
 const s=setup();await s.service.cancelManualOrder(mutation);await s.service.setManualOrderHold({...mutation,onHold:true});
 await s.service.voidManualPayment({...mutation,receiptId:orderId,confirmedErroneousCapture:true});
 await assert.rejects(s.service.voidManualPayment({...mutation,receiptId:orderId,confirmedErroneousCapture:false}),code('manual_confirmation_required'));
 await assert.rejects(s.service.shipManualOrder({...mutation,shippingCarrier:'Synthetic',trackingNumber:'QA',trackingUrl:'javascript:alert(1)'}));
 await assert.rejects(s.service.cancelManualOrder({...mutation,confirmed:false}),code('manual_confirmation_required'));
 assert.equal('refundManualPayment' in s.service,false);assert.equal('deliverManualOrder' in s.service,false);
});

test('attestation binds operation, actor, command, request and pricing with no default key',()=>{
 const env={MANUAL_ORDERS_RPC_SIGNING_KEY:'11'.repeat(32)};
 const module=loadSource('src/lib/manual-orders/attestation.ts',{'server-only':{},'node:crypto':crypto,'./feature-flags':{isManualOrdersEnabled:()=>true},'./persistence-types':types},{Buffer,process:{env}});
 const hash=module.manualRequestHash('create',{b:2,a:1});assert.equal(hash,module.manualRequestHash('create',{a:1,b:2}));
 const signed=module.signManualCommand('create',commandId,hash,{quote});const body=JSON.parse(signed.p_payload);
 assert.equal(body.actor,'shared_admin');assert.equal(body.expiresAt-body.issuedAt,300);assert.equal(body.commandId,commandId);assert.equal(body.requestHash,hash);
 assert.equal(signed.p_signature,crypto.createHmac('sha256',Buffer.from(env.MANUAL_ORDERS_RPC_SIGNING_KEY,'hex')).update(signed.p_payload).digest('hex'));
 env.MANUAL_ORDERS_RPC_SIGNING_KEY=undefined;assert.throws(()=>module.signManualCommand('create',commandId,hash,{}),code('manual_signing_not_configured'));
});

test('repository uses signed RPCs, keeps replay results and sanitizes failures',async()=>{
 const valid={commandId,orderId,publicOrderNumber:'234567',version:1,status:'pending_payment',manualState:'active',receivedCents:0,outstandingCents:10000,totalCents:10000,paidAt:null,fulfillmentStatus:'pending',entryId:null,replayed:false};
 const calls=[];let failure=null;
 const repository=loadSource('src/lib/manual-orders/repository.ts',{'server-only':{},'./persistence-types':types,
  './attestation':{signManualCommand:(...args)=>{calls.push(['sign',...args]);return {p_payload:'synthetic-ticket',p_signature:'synthetic-signature'};}},
  '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({rpc:async(...args)=>{calls.push(['rpc',...args]);return {data:valid,error:failure};},from:()=>{
   const builder={select:()=>builder,eq:()=>builder,maybeSingle:async()=>({data:{operation:'create',request_hash:'hash',result:valid},error:null})};return builder;
  }})},
 });
 for(const [operation,expected] of [['create','manual_create_order'],['record_payment','manual_record_payment'],['void_payment','manual_void_payment'],['cancel','manual_cancel_order'],['hold','manual_set_order_hold'],['ship','manual_mark_order_shipped']]) {
  await repository.executeManualCommand(operation,commandId,'hash',{});assert.equal(calls.at(-1)[1],expected);assert.equal(calls.at(-2)[0],'sign');
 }
 assert.equal((await repository.findManualCommand(commandId,'create','hash')).replayed,true);
 await assert.rejects(repository.findManualCommand(commandId,'cancel','hash'),code('manual_idempotency_conflict'));
 failure={message:'DETAIL contains synthetic private payload'};await assert.rejects(repository.executeManualCommand('create',commandId,'hash',{}),code('manual_command_failed'));
 failure={message:'manual_version_conflict'};await assert.rejects(repository.executeManualCommand('create',commandId,'hash',{}),code('manual_version_conflict'));
 failure={code:'23505',message:'duplicate key violates manual_receipt_reference_unique'};await assert.rejects(repository.executeManualCommand('record_payment',commandId,'hash',{}),code('manual_duplicate_payment_reference'));
});

test('cash accepts absent, null and blank external references without inventing a folio',async()=>{
 let expectedHash;
 for(const value of [undefined,null,'','   ']) {
  const payment={...mutation,method:'cash',amountCents:100,occurredAt:'2026-01-01T00:00:00Z'};
  if(value!==undefined) payment.reference=value;
  const s=setup();await s.service.recordManualPayment(payment);
  const saved=s.calls.find(c=>Array.isArray(c)&&c[0]==='persist');
  assert.equal(saved[4].reference,null);assert.equal(saved[2],commandId);assert.equal(saved[4].expectedVersion,1);
  expectedHash??=saved[3];assert.equal(saved[3],expectedHash,'blank forms represent the same command intent');
 }
});

test('bank transfer and deposit still require a valid nonempty external reference',async()=>{
 for(const method of ['bank_transfer','deposit']) for(const value of [undefined,null,'','   ']) {
  const payment={...mutation,method,amountCents:100,occurredAt:'2026-01-01T00:00:00Z'};
  if(value!==undefined) payment.reference=value;
  const s=setup();await assert.rejects(s.service.recordManualPayment(payment),code('manual_invalid_input'));
  assert.ok(!s.calls.some(c=>Array.isArray(c)&&c[0]==='persist'));
 }
});

test('provided cash references are preserved normalized and invalid values are rejected',async()=>{
 const base={...mutation,method:'cash',amountCents:100,occurredAt:'2026-01-01T00:00:00Z'};
 const s=setup();await s.service.recordManualPayment({...base,reference:' customer note 42 '});
 assert.equal(s.calls.find(c=>Array.isArray(c)&&c[0]==='persist')[4].reference,'CUSTOMER NOTE 42');
 for(const reference of [123,{},'x'.repeat(121),'unsafe\nreference','<invalid>']) {
  await assert.rejects(setup().service.recordManualPayment({...base,reference}),code('manual_invalid_input'));
 }
});
