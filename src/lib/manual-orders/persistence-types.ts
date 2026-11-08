export type ManualOperation = 'create' | 'record_payment' | 'void_payment' | 'cancel' | 'hold' | 'ship';
export type CustomerClassification =
 | { relationship: 'prospect'; frequency: null; segment: 'retail' | 'wholesale' }
 | { relationship: 'customer'; frequency: 'new' | 'frequent'; segment: 'retail' | 'wholesale' };
export interface ManualCommandResult {
 commandId: string; orderId: string; publicOrderNumber: string; version: number;
 status: 'pending_payment' | 'approved' | 'cancelled'; manualState: 'active' | 'on_hold' | 'cancelled';
 receivedCents: number; outstandingCents: number; totalCents: number;
 paidAt: string | null; fulfillmentStatus: 'pending' | 'shipped'; entryId: string | null; replayed: boolean;
}
export class ManualPersistenceError extends Error {
 constructor(readonly code: string) { super(code); this.name = 'ManualPersistenceError'; }
}
