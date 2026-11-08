export type ManualPolicyReason =
  | 'regular_individual'
  | 'promotional_presentation'
  | 'promotional_bundle'
  | 'promotional_individual'
  | 'incompatible_promotion'
  | 'unreviewed';

export interface ManualWholesaleDiscountPolicy {
  eligibility: 'eligible' | 'excluded';
  reason: ManualPolicyReason;
  policyVersion: string;
}

export interface ManualOrderLineInput {
  productId: string;
  variantId: string;
  packageQuantity: number;
}

export type ManualDiscountRequest =
  | { mode: 'normal'; promotionCode: string | null }
  | { mode: 'special_percentage'; percentageBps: number; reason: string };

export interface ManualQuoteRequest {
  items: ManualOrderLineInput[];
  shippingMethod: 'standard' | 'express';
  discount: ManualDiscountRequest;
  standardShippingCourtesy: { requested: boolean; reason: string | null };
}

// Trusted server input, never a field accepted from a browser request.
// The caller must verify the existing session before constructing this context.
export interface ManualAuthorizationContext {
  role: 'principal_admin';
  actor: 'shared_admin';
  customerSegment: 'retail' | 'wholesale';
}

// Contract reservation only. quoteManualOrder rejects every seller in V1.
export interface ReservedSellerAuthorizationContext {
  role: 'seller';
  actor: string;
  customerSegment: 'retail' | 'wholesale';
}

export interface ManualPricedLine {
  key: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  packageQuantity: number;
  commercialUnitsPerPackage: number | null;
  totalCommercialUnits: number | null;
  composition: 'commercial_units' | 'unstructured';
  unitPriceCents: number;
  compareAtPriceCents: number | null;
  subtotalCents: number;
  eligibility: ManualWholesaleDiscountPolicy;
  eligibleBaseCents: number;
  normalDiscountAvailableCents: number;
  specialDiscountCents: number;
  appliedDiscountCents: number;
  netCents: number;
}

export interface ManualQuote {
  lines: ManualPricedLine[];
  subtotalCents: number;
  eligibleBaseCents: number;
  normalDiscountAvailable: {
    amountCents: number;
    wholesalePercentage: number;
    promotionCode: string | null;
  };
  specialDiscountRequested: { percentageBps: number; reason: string } | null;
  specialDiscountApplied: { amountCents: number; reason: string } | null;
  discountMode: ManualDiscountRequest['mode'];
  discountCents: number;
  normalShippingCents: number;
  shippingCourtesyApplied: { amountCents: number; reason: string } | null;
  shippingCents: number;
  totalCents: number;
  requiresAdministrativeConfirmation: boolean;
  blockingReasons: 'zero_total_persistence_not_authorized'[];
  notices: ('courtesy_already_free' | 'unstructured_composition')[];
  persistenceImplemented: false;
  requestFingerprint: string;
  pricingFingerprint: string;
  snapshot: {
    currency: 'MXN';
    policyVersion: string;
    rounding: 'special_floor_cent_largest_remainder';
    discountCombination: 'normal_or_special_order_level';
    authorization: ManualAuthorizationContext;
    intent: ManualQuoteRequest;
    lines: ManualPricedLine[];
    subtotalCents: number;
    eligibleBaseCents: number;
    normalDiscountAvailable: ManualQuote['normalDiscountAvailable'];
    discountCents: number;
    normalShippingCents: number;
    shippingCourtesyApplied: ManualQuote['shippingCourtesyApplied'];
    shippingCents: number;
    totalCents: number;
    shippingRules: {
      enabled: boolean;
      freeShippingThresholdCents: number;
      standardShippingCents: number;
      expressShippingCents: number;
      expressUpgradeCents: number;
    };
  };
}

export type ManualPricingErrorCode =
  | 'invalid_request'
  | 'invalid_items'
  | 'invalid_quantity'
  | 'unavailable_variant'
  | 'invalid_discount'
  | 'invalid_reason'
  | 'unauthorized_context'
  | 'seller_operations_disabled'
  | 'courtesy_requires_standard'
  | 'no_eligible_base'
  | 'invalid_money'
  | 'normal_pricing_failed';

export class ManualPricingError extends Error {
  constructor(readonly code: ManualPricingErrorCode) {
    super(code);
    this.name = 'ManualPricingError';
  }
}
