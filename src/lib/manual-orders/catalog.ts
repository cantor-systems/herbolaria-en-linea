import 'server-only';
import { PRODUCTS } from '@/data/products';
import type { ProductVariant } from '@/types';
import { ManualPricingError, type ManualWholesaleDiscountPolicy } from './types';

const EXCLUSION_REASONS = new Set([
  'promotional_presentation', 'promotional_bundle', 'promotional_individual',
  'incompatible_promotion', 'unreviewed',
]);

// Fail closed. Names, prices, unitsCount and wholesaleEligible do not grant eligibility.
export function resolveManualEligibility(policy: unknown): ManualWholesaleDiscountPolicy {
  if (policy && typeof policy === 'object' && !Array.isArray(policy)) {
    const value = policy as Record<string, unknown>;
    if (typeof value.policyVersion === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(value.policyVersion)) {
      if (value.eligibility === 'eligible' && value.reason === 'regular_individual') {
        return { eligibility: 'eligible', reason: 'regular_individual', policyVersion: value.policyVersion };
      }
      if (value.eligibility === 'excluded' && typeof value.reason === 'string' && EXCLUSION_REASONS.has(value.reason)) {
        return { eligibility: 'excluded', reason: value.reason as ManualWholesaleDiscountPolicy['reason'], policyVersion: value.policyVersion };
      }
    }
  }
  return { eligibility: 'excluded', reason: 'unreviewed', policyVersion: 'unreviewed' };
}

export function resolveManualVariant(productId: string, variantId: string) {
  const product = PRODUCTS.find(value => value.id === productId && value.status === 'active');
  const variant = product?.variants.find(value => value.id === variantId && !value.hiddenFromSelection);
  if (!product || !variant || product.stockStatus === 'out_of_stock') {
    throw new ManualPricingError('unavailable_variant');
  }
  return { product, variant, eligibility: resolveManualEligibility(variant.manualWholesaleDiscountPolicy) };
}

export function manualCommercialUnits(variant: ProductVariant) {
  const policy = resolveManualEligibility(variant.manualWholesaleDiscountPolicy);
  if (policy.reason === 'promotional_bundle' || policy.reason === 'unreviewed') return null;
  if (!Number.isSafeInteger(variant.unitsCount) || variant.unitsCount < 1) {
    throw new ManualPricingError('invalid_items');
  }
  return variant.unitsCount;
}

export function listManualCatalog() {
  return PRODUCTS.filter(product => product.status === 'active').map(product => ({
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    stockStatus: product.stockStatus,
    variants: product.variants.filter(variant => !variant.hiddenFromSelection).map(variant => ({
      variantId: variant.id,
      variantLabel: variant.name,
      priceCents: variant.priceCents,
      commercialUnitsPerPackage: manualCommercialUnits(variant),
      selectable: product.stockStatus !== 'out_of_stock',
      eligibility: resolveManualEligibility(variant.manualWholesaleDiscountPolicy),
    })),
  }));
}
