import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { signManualCommand } from './attestation';
import { ManualPersistenceError, type ManualCommandResult, type ManualOperation } from './persistence-types';
const RPC = {
 create: 'manual_create_order', record_payment: 'manual_record_payment', void_payment: 'manual_void_payment',
 cancel: 'manual_cancel_order', hold: 'manual_set_order_hold', ship: 'manual_mark_order_shipped',
} as const;
function result(value: unknown): ManualCommandResult {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ManualPersistenceError('manual_invalid_result');
 const r = value as ManualCommandResult;
 if (typeof r.orderId !== 'string' || typeof r.commandId !== 'string' || typeof r.publicOrderNumber !== 'string'
  || !Number.isSafeInteger(r.version) || r.version<1 || !['pending_payment','approved','cancelled'].includes(r.status)
  || !['active','on_hold','cancelled'].includes(r.manualState) || !['pending','shipped'].includes(r.fulfillmentStatus)
  || [r.receivedCents,r.outstandingCents,r.totalCents].some(v => !Number.isSafeInteger(v) || v<0) || typeof r.replayed !== 'boolean') {
  throw new ManualPersistenceError('manual_invalid_result');
 }
 return r;
}
export async function findManualCommand(commandId: string, operation: ManualOperation, hash: string) {
 const {data,error} = await createSupabaseAdminClient().from('manual_order_commands').select('operation,request_hash,result').eq('command_id',commandId).maybeSingle();
 if (error) throw new ManualPersistenceError('manual_command_lookup_failed');
 if (!data) return null;
 if (data.operation!==operation || data.request_hash!==hash) throw new ManualPersistenceError('manual_idempotency_conflict');
 return { ...result(data.result), replayed: true };
}
export async function findManualProfile(id: string) {
 const {data,error} = await createSupabaseAdminClient().from('customer_profiles').select('id,classification,version').eq('id',id).maybeSingle();
 if (error || !data) throw new ManualPersistenceError('manual_profile_not_found');
 return data;
}
export async function executeManualCommand(operation: ManualOperation, id: string, hash: string, data: unknown) {
 const attestation = signManualCommand(operation,id,hash,data);
 const {data: response,error} = await createSupabaseAdminClient().rpc(RPC[operation],attestation);
 if (error) {
  // Never log or expose a raw SQL error, payload, customer or signature.
  if (error.code==='23505' && error.message?.includes('manual_receipt_reference_unique')) throw new ManualPersistenceError('manual_duplicate_payment_reference');
  const match = typeof error.message==='string' ? error.message.match(/^manual_[a-z_]+$/) : null;
  throw new ManualPersistenceError(match?.[0] ?? 'manual_command_failed');
 }
 return result(response);
}
