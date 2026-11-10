import 'server-only';
import { listManualCatalog } from './catalog';
import { quoteManualOrder } from './pricing';
import type { DemoOrder } from './demo-types';

export const DEMO_FORM_DEFAULTS: Record<string, string> = {
  customerName: 'Cliente DEMO (ficticio)', customerPhone: '5500000000', customerEmail: 'cliente@example.invalid',
  streetAddress: 'Calle sintética 123', colonia: 'Colonia de demostración', city: 'Ciudad ficticia', state: 'Estado ficticio', postalCode: '00000',
};

// Constructed only after route authorization. No repository, contacts or provider clients.
export function getDemoOrders(): DemoOrder[] {
  const product = listManualCatalog().find(p => p.variants.some(v => v.selectable && v.eligibility.eligibility === 'eligible'));
  const variant = product?.variants.find(v => v.selectable && v.eligibility.eligibility === 'eligible');
  if (!product || !variant) return [];
  const templates = [
    { id: 'demo-whatsapp-001', channel: 'whatsapp', origin: 'manual', paid: 0, shipped: false, segment: 'retail', frequency: 'new' },
    { id: 'demo-phone-002', channel: 'phone', origin: 'manual', paid: 0.5, shipped: false, segment: 'wholesale', frequency: 'frequent' },
    { id: 'demo-online-003', channel: 'online', origin: 'online_checkout', paid: 1, shipped: true, segment: 'retail', frequency: 'frequent' },
    { id: 'demo-other-004', channel: 'other', origin: 'manual', paid: 1, shipped: false, segment: 'retail', frequency: null },
  ] as const;
  return templates.map((t, index) => {
    const quote = quoteManualOrder({ items: [{ productId: product.productId, variantId: variant.variantId, packageQuantity: index + 1 }],
      shippingMethod: 'standard', discount: { mode: 'normal', promotionCode: null }, standardShippingCourtesy: { requested: false, reason: null } },
    { role: 'principal_admin', actor: 'shared_admin', customerSegment: t.segment });
    return { id: t.id, folio: `DEMO-00${index + 1}`, channel: t.channel, origin: t.origin,
      otherChannelDetail: t.channel === 'other' ? 'Canal sintético de demostración' : null,
      customer: { name: `Cliente DEMO ${index + 1} (ficticio)`, email: `cliente-${index + 1}@example.invalid`, phone: '5500000000' },
      classification: { relationship: t.frequency === null ? 'prospect' : 'customer', frequency: t.frequency, segment: t.segment },
      createdAt: `2026-11-0${index + 1}T18:00:00Z`, receivedCents: Math.floor(quote.totalCents * t.paid), status: t.paid === 1 ? 'approved' : 'pending_payment',
      fulfillmentStatus: t.shipped ? 'shipped' : 'pending', quote,
      shippingAddress: { streetAddress: 'Calle sintética 123', colonia: 'Colonia de demostración', city: 'Ciudad ficticia', state: 'Estado ficticio', postalCode: '00000', country: 'México' } };
  });
}

export function filterDemoOrders(orders: DemoOrder[], filters: { q?: string; channel?: string; payment?: string }) {
  const query = (filters.q ?? '').trim().slice(0, 120).toLocaleLowerCase('es-MX');
  return orders.filter(order => (!query || `${order.folio} ${order.customer.name}`.toLocaleLowerCase('es-MX').includes(query))
    && (!filters.channel || filters.channel === 'all' || order.channel === filters.channel)
    && (!filters.payment || filters.payment === 'all' || (filters.payment === 'paid' ? order.status === 'approved'
      : filters.payment === 'partial' ? order.receivedCents > 0 && order.status !== 'approved' : filters.payment === 'unpaid' ? order.receivedCents === 0 : false)));
}
