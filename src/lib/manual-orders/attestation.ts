import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { isManualOrdersEnabled } from './feature-flags';
import { ManualPersistenceError, type ManualOperation } from './persistence-types';

function canonical(value: unknown): unknown {
 if (Array.isArray(value)) return value.map(canonical);
 if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => [k,canonical(v)]));
 return value;
}
export function manualRequestHash(operation: ManualOperation, data: unknown) {
 return createHash('sha256').update(JSON.stringify(canonical({ operation, data }))).digest('hex');
}
// Internal server protocol, not a route. Call only after the protected service
// validates session, intent and pricing. No default or production key is stored.
export function signManualCommand(operation: ManualOperation, commandId: string, requestHash: string, data: unknown) {
 if (!isManualOrdersEnabled()) throw new ManualPersistenceError('manual_module_disabled');
 const key = process.env.MANUAL_ORDERS_RPC_SIGNING_KEY;
 if (!key || !/^[a-f0-9]{64}$/i.test(key)) throw new ManualPersistenceError('manual_signing_not_configured');
 const issuedAt = Math.floor(Date.now()/1000);
 const payload = JSON.stringify({ version: 1, operation, commandId, requestHash, actor: 'shared_admin', issuedAt, expiresAt: issuedAt+300, data });
 if (Buffer.byteLength(payload,'utf8')>524288) throw new ManualPersistenceError('manual_request_too_large');
 return { p_payload: payload, p_signature: createHmac('sha256',Buffer.from(key,'hex')).update(payload).digest('hex') };
}
