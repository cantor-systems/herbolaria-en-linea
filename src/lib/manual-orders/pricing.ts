import 'server-only';
import { createHash } from 'node:crypto';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { priceCheckoutCart } from '@/lib/checkout/serverPricing';
import { manualCommercialUnits, resolveManualVariant } from './catalog';
import { calculateSpecialDiscount, distributeDiscount, MANUAL_PRICING_POLICY_VERSION } from './discounts';
import {
  ManualPricingError,
  type ManualAuthorizationContext,
  type ManualOrderLineInput,
  type ManualPricedLine,
  type ManualQuote,
  type ManualQuoteRequest,
} from './types';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fields(value: unknown, expected: readonly string[]) {
  if (!record(value) || Object.keys(value).length !== expected.length ||
      Object.keys(value).some(key => !expected.includes(key))) {
    throw new ManualPricingError('invalid_request');
  }
  return value;
}

function identity(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 160) {
    throw new ManualPricingError('invalid_items');
  }
  return value.trim();
}

function reason(value: unknown) {
  if (typeof value !== 'string' || value.trim().length < 10 || value.trim().length > 500 ||
      /[\u0000-\u001f\u007f<>]/.test(value)) {
    throw new ManualPricingError('invalid_reason');
  }
  return value.trim();
}

function authorization(value: unknown): ManualAuthorizationContext {
  if (record(value) && value.role === 'seller') throw new ManualPricingError('seller_operations_disabled');
  const context = fields(value, ['role', 'actor', 'customerSegment']);
  if (context.role !== 'principal_admin' || context.actor !== 'shared_admin' ||
      (context.customerSegment !== 'retail' && context.customerSegment !== 'wholesale')) {
    throw new ManualPricingError('unauthorized_context');
  }
  return { role: 'principal_admin', actor: 'shared_admin', customerSegment: context.customerSegment as 'retail' | 'wholesale' };
}

const lineKey = (item: ManualOrderLineInput) => JSON.stringify([item.productId, item.variantId]);
const compareKeys = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function request(value: unknown): ManualQuoteRequest {
  const input = fields(value, ['items', 'shippingMethod', 'discount', 'standardShippingCourtesy']);
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) {
    throw new ManualPricingError('invalid_items');
  }
  const grouped = new Map<string, ManualOrderLineInput>();
  for (const raw of input.items) {
    const item = fields(raw, ['productId', 'variantId', 'packageQuantity']);
    if (!Number.isSafeInteger(item.packageQuantity) || (item.packageQuantity as number) < 1) {
      throw new ManualPricingError('invalid_quantity');
    }
    const line = { productId: identity(item.productId), variantId: identity(item.variantId), packageQuantity: item.packageQuantity as number };
    line.packageQuantity += grouped.get(lineKey(line))?.packageQuantity ?? 0;
    if (line.packageQuantity > 99) throw new ManualPricingError('invalid_quantity');
    grouped.set(lineKey(line), line);
  }
  if (input.shippingMethod !== 'standard' && input.shippingMethod !== 'express') {
    throw new ManualPricingError('invalid_request');
  }
  let discount: ManualQuoteRequest['discount'];
  if (record(input.discount) && input.discount.mode === 'normal') {
    const normal = fields(input.discount, ['mode', 'promotionCode']);
    if (normal.promotionCode !== null && typeof normal.promotionCode !== 'string') {
      throw new ManualPricingError('invalid_discount');
    }
    discount = { mode: 'normal', promotionCode: typeof normal.promotionCode === 'string' ? normal.promotionCode.trim().toUpperCase() : null };
  } else if (record(input.discount) && input.discount.mode === 'special_percentage') {
    const special = fields(input.discount, ['mode', 'percentageBps', 'reason']);
    if (!Number.isSafeInteger(special.percentageBps) || (special.percentageBps as number) < 0 || (special.percentageBps as number) > 10000) {
      throw new ManualPricingError('invalid_discount');
    }
    discount = { mode: 'special_percentage', percentageBps: special.percentageBps as number, reason: reason(special.reason) };
  } else {
    throw new ManualPricingError('invalid_discount');
  }
  const courtesy = fields(input.standardShippingCourtesy, ['requested', 'reason']);
  if (typeof courtesy.requested !== 'boolean' || (!courtesy.requested && courtesy.reason !== null)) {
    throw new ManualPricingError('invalid_request');
  }
  if (courtesy.requested && input.shippingMethod !== 'standard') throw new ManualPricingError('courtesy_requires_standard');
  return {
    items: [...grouped.values()].sort((a, b) => compareKeys(lineKey(a), lineKey(b))),
    shippingMethod: input.shippingMethod,
    discount,
    standardShippingCourtesy: { requested: courtesy.requested, reason: courtesy.requested ? reason(courtesy.reason) : null },
  };
}

// No persistence, provider clients or administrative routes. Authenticate in the
// future server caller; never forward authorizationContext from a browser.
export function quoteManualOrder(input: unknown, authorizationContext: unknown): ManualQuote {
  const context = authorization(authorizationContext);
  const intent = request(input);
  const resolved = intent.items.map(item => ({ ...item, ...resolveManualVariant(item.productId, item.variantId) }));
  let normal;
  try {
    normal = priceCheckoutCart(
      resolved.map(item => ({ slug: item.product.slug, variantId: item.variantId, quantity: item.packageQuantity })),
      intent.shippingMethod,
      intent.discount.mode === 'normal' ? intent.discount.promotionCode : null
    );
  } catch {
    throw new ManualPricingError('normal_pricing_failed');
  }
  const normalAllocation = distributeDiscount(resolved.map((item, index) => ({
    key: lineKey(item),
    baseCents: normal.wholesaleDiscountPercent > 0 && !normal.items[index].wholesaleEligible
      ? 0 : normal.items[index].unitPriceCents * item.packageQuantity,
  })), normal.discountCents);
  const eligibleBases = resolved.map((item, index) => ({
    key: lineKey(item),
    baseCents: item.eligibility.eligibility === 'eligible'
      ? normal.items[index].unitPriceCents * item.packageQuantity : 0,
  }));
  const eligibleBaseCents = eligibleBases.reduce((sum, line) => sum + line.baseCents, 0);
  if (intent.discount.mode === 'special_percentage' && eligibleBaseCents === 0) {
    throw new ManualPricingError('no_eligible_base');
  }
  const specialCents = intent.discount.mode === 'special_percentage'
    ? calculateSpecialDiscount(eligibleBaseCents, intent.discount.percentageBps, 10000) : 0;
  const specialAllocation = distributeDiscount(eligibleBases, specialCents);
  const lines: ManualPricedLine[] = resolved.map((item, index) => {
    const quoted = normal.items[index];
    const units = manualCommercialUnits(item.variant);
    const subtotalCents = quoted.unitPriceCents * item.packageQuantity;
    const totalCommercialUnits = units === null ? null : units * item.packageQuantity;
    if (totalCommercialUnits !== null && !Number.isSafeInteger(totalCommercialUnits)) {
      throw new ManualPricingError('invalid_items');
    }
    const appliedDiscountCents = intent.discount.mode === 'normal'
      ? normalAllocation.get(lineKey(item))! : specialAllocation.get(lineKey(item))!;
    return {
      key: lineKey(item), productId: item.product.id, productSlug: item.product.slug,
      productName: item.product.name, variantId: item.variant.id, variantLabel: item.variant.name,
      packageQuantity: item.packageQuantity,
      commercialUnitsPerPackage: units, totalCommercialUnits,
      composition: units === null ? 'unstructured' : 'commercial_units',
      unitPriceCents: quoted.unitPriceCents, compareAtPriceCents: item.variant.compareAtPriceCents ?? null,
      subtotalCents, eligibility: item.eligibility, eligibleBaseCents: eligibleBases[index].baseCents,
      normalDiscountAvailableCents: normalAllocation.get(lineKey(item))!,
      specialDiscountCents: specialAllocation.get(lineKey(item))!,
      appliedDiscountCents, netCents: subtotalCents - appliedDiscountCents,
    };
  });
  const discountCents = intent.discount.mode === 'normal' ? normal.discountCents : specialCents;
  const normalDiscountAvailable = { amountCents: normal.discountCents, wholesalePercentage: normal.wholesaleDiscountPercent, promotionCode: normal.promotionCode };
  const shippingCourtesyApplied = intent.standardShippingCourtesy.requested && normal.shippingCents > 0
    ? { amountCents: normal.shippingCents, reason: intent.standardShippingCourtesy.reason! } : null;
  const shippingCents = normal.shippingCents - (shippingCourtesyApplied?.amountCents ?? 0);
  const totalCents = normal.subtotalCents - discountCents + shippingCents;
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) throw new ManualPricingError('invalid_money');
  const snapshot: ManualQuote['snapshot'] = {
    currency: 'MXN', policyVersion: MANUAL_PRICING_POLICY_VERSION,
    rounding: 'special_floor_cent_largest_remainder', discountCombination: 'normal_or_special_order_level',
    authorization: context, intent, lines, subtotalCents: normal.subtotalCents, eligibleBaseCents,
    normalDiscountAvailable, discountCents, normalShippingCents: normal.shippingCents,
    shippingCourtesyApplied, shippingCents, totalCents,
    shippingRules: {
      enabled: SHIPPING_CONFIG.enabled, freeShippingThresholdCents: SHIPPING_CONFIG.freeShippingThresholdCents,
      standardShippingCents: SHIPPING_CONFIG.standardShippingCents, expressShippingCents: SHIPPING_CONFIG.expressShippingCents,
      expressUpgradeCents: SHIPPING_CONFIG.expressUpgradeCents,
    },
  };
  return {
    lines, subtotalCents: normal.subtotalCents, eligibleBaseCents, normalDiscountAvailable,
    specialDiscountRequested: intent.discount.mode === 'special_percentage'
      ? { percentageBps: intent.discount.percentageBps, reason: intent.discount.reason } : null,
    specialDiscountApplied: intent.discount.mode === 'special_percentage' && specialCents > 0
      ? { amountCents: specialCents, reason: intent.discount.reason } : null,
    discountMode: intent.discount.mode, discountCents, normalShippingCents: normal.shippingCents,
    shippingCourtesyApplied, shippingCents, totalCents,
    requiresAdministrativeConfirmation: true,
    blockingReasons: totalCents === 0 ? ['zero_total_persistence_not_authorized'] : [],
    notices: [
      ...(intent.standardShippingCourtesy.requested && normal.shippingCents === 0 ? ['courtesy_already_free' as const] : []),
      ...(lines.some(line => line.composition === 'unstructured') ? ['unstructured_composition' as const] : []),
    ],
    persistenceImplemented: false, requestFingerprint: fingerprint(intent), pricingFingerprint: fingerprint(snapshot), snapshot,
  };
}
