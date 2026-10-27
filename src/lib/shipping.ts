import { SHIPPING_CONFIG } from '@/config/shipping';

export type ShippingMethod = 'standard' | 'express';

export interface ShippingLine {
  freeShippingEligible: boolean;
}

export interface ShippingCalculationInput {
  subtotalCents: number;
  lines: readonly ShippingLine[];
  method: ShippingMethod;
  freeStandardShipping?: boolean;
}

export function hasFreeShippingPromotion(lines: readonly ShippingLine[]) {
  return lines.some((line) => line.freeShippingEligible);
}

export function qualifiesForFreeStandardShipping(
  subtotalCents: number,
  lines: readonly ShippingLine[]
) {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new Error('El subtotal debe expresarse como centavos enteros no negativos.');
  }

  return (
    subtotalCents >= SHIPPING_CONFIG.freeShippingThresholdCents ||
    hasFreeShippingPromotion(lines)
  );
}

export function calculateShippingCents({
  subtotalCents,
  lines,
  method,
  freeStandardShipping: forcedFreeStandardShipping = false,
}: ShippingCalculationInput) {
  const freeStandardShipping =
    forcedFreeStandardShipping || qualifiesForFreeStandardShipping(subtotalCents, lines);

  if (!SHIPPING_CONFIG.enabled || subtotalCents === 0) return 0;

  if (method === 'standard') {
    return freeStandardShipping ? 0 : SHIPPING_CONFIG.standardShippingCents;
  }

  if (method === 'express') {
    return freeStandardShipping
      ? SHIPPING_CONFIG.expressUpgradeCents
      : SHIPPING_CONFIG.expressShippingCents;
  }

  throw new Error('El método de envío no es válido.');
}
