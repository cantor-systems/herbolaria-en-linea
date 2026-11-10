import type { ManualQuote } from './types';

export type DemoClassification = {
  relationship: 'prospect' | 'customer';
  frequency: 'new' | 'frequent' | null;
  segment: 'retail' | 'wholesale';
};
export type DemoCatalogProduct = {
  productId: string; productSlug: string; productName: string; stockStatus: string;
  variants: { variantId: string; variantLabel: string; priceCents: number;
    commercialUnitsPerPackage: number | null; selectable: boolean;
    eligibility: { eligibility: 'eligible' | 'excluded'; reason: string; policyVersion: string } }[];
};
export interface DemoOrder {
  id: string; folio: string; origin: 'online_checkout' | 'manual';
  channel: 'online' | 'whatsapp' | 'phone' | 'other'; otherChannelDetail: string | null;
  customer: { name: string; email: string; phone: string }; classification: DemoClassification;
  createdAt: string; receivedCents: number; status: 'pending_payment' | 'approved';
  fulfillmentStatus: 'pending' | 'shipped'; quote: ManualQuote;
  shippingAddress: { streetAddress: string; colonia: string; city: string; state: string; postalCode: string; country: string };
}
export interface DemoQuoteState {
  status: 'idle' | 'error' | 'success'; revision: string;
  errors: Record<string, string>; quote: ManualQuote | null; normal: ManualQuote | null;
}
export const DEMO_INITIAL_STATE: DemoQuoteState = { status: 'idle', revision: '', errors: {}, quote: null, normal: null };

export const DEMO_CHANNELS = { online: 'Tienda en línea', whatsapp: 'WhatsApp', phone: 'Teléfono', other: 'Otro' } as const;
export function demoMoney(cents: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100);
}
export function demoPaymentLabel(order: Pick<DemoOrder, 'receivedCents' | 'status'>) {
  return order.status === 'approved' ? 'Pago completo' : order.receivedCents > 0 ? 'Pago parcial' : 'Pendiente de pago';
}
export function demoClassificationLabel(c: DemoClassification) {
  return [c.relationship === 'prospect' ? 'Prospecto' : 'Cliente', c.frequency === null ? null : c.frequency === 'new' ? 'Nuevo' : 'Frecuente', c.segment === 'wholesale' ? 'Mayorista' : 'Minorista'].filter(Boolean).join(' · ');
}
