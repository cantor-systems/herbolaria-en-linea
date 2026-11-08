import { createHash } from 'node:crypto';
import { loadSource, loadPricing } from '../helpers/isolatedModule.mjs';

export const reason = 'Autorización comercial sintética para pruebas.';
export const admin = { role: 'principal_admin', actor: 'shared_admin', customerSegment: 'retail' };
export const policy = (eligibility = 'eligible', reason = 'regular_individual') => ({ eligibility, reason, policyVersion: 'synthetic-policy-v1' });
export function product(id = 'synthetic', priceCents = 30000, overrides = {}) {
  return {
    id, slug: id, name: `Producto ${id}`, status: 'active', stockStatus: 'in_stock',
    variants: [{ id: `${id}-variant`, name: 'Presentación sintética', unitsCount: 1, priceCents,
      unitPriceCents: priceCents, freeShippingEligible: false, wholesaleEligible: false,
      manualWholesaleDiscountPolicy: policy(), ...overrides }],
  };
}
export const line = (p, packageQuantity = 1) => ({ productId: p.id, variantId: p.variants[0].id, packageQuantity });
export function request(items, overrides = {}) {
  return { items, shippingMethod: 'standard', discount: { mode: 'normal', promotionCode: null },
    standardShippingCourtesy: { requested: false, reason: null }, ...overrides };
}
export const special = (percentageBps = 3500) => ({ mode: 'special_percentage', percentageBps, reason });
export const plain = value => JSON.parse(JSON.stringify(value));
export function harness(options = {}) {
  const checkout = loadPricing(options);
  const types = loadSource('src/lib/manual-orders/types.ts');
  const discounts = loadSource('src/lib/manual-orders/discounts.ts', { './types': types });
  const catalog = loadSource('src/lib/manual-orders/catalog.ts', { 'server-only': {}, '@/data/products': checkout.catalog, './types': types });
  const pricing = loadSource('src/lib/manual-orders/pricing.ts', {
    'server-only': {}, 'node:crypto': { createHash }, '@/config/shipping': checkout.shippingConfig,
    '@/lib/checkout/serverPricing': checkout.server, './catalog': catalog, './discounts': discounts, './types': types,
  });
  return { ...checkout, types, discounts, manualCatalog: catalog, quote: pricing.quoteManualOrder };
}
export const errorCode = code => error => error?.code === code;
