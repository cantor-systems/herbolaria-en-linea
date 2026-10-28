export type WholesaleDiscountPercent = 0 | 35 | 39 | 43 | 46 | 48 | 50;

export interface WholesalePricingLine {
  quantity: number;
  unitPriceCents: number;
  wholesaleEligible: boolean;
}

export interface WholesaleDiscount {
  eligibleQuantity: number;
  eligibleSubtotalCents: number;
  percent: WholesaleDiscountPercent;
  discountCents: number;
  piecesUntilDiscount: number | null;
}

interface WholesaleVariantIdentity {
  wholesaleEligible: boolean;
}

export function isWholesaleEligiblePresentation(
  _product: unknown,
  variant: WholesaleVariantIdentity
) {
  return variant.wholesaleEligible;
}

export function wholesaleDiscountPercentForQuantity(
  quantity: number
): WholesaleDiscountPercent {
  if (quantity >= 90) return 50;
  if (quantity >= 70) return 48;
  if (quantity >= 50) return 46;
  if (quantity >= 40) return 43;
  if (quantity >= 30) return 39;
  if (quantity >= 20) return 35;
  return 0;
}

export function calculateWholesaleDiscount(
  lines: readonly WholesalePricingLine[]
): WholesaleDiscount {
  let eligibleQuantity = 0;
  let eligibleSubtotalCents = 0;

  for (const line of lines) {
    if (
      !Number.isSafeInteger(line.quantity) ||
      line.quantity < 0 ||
      !Number.isSafeInteger(line.unitPriceCents) ||
      line.unitPriceCents < 0
    ) {
      throw new Error('Los datos para calcular el mayoreo no son válidos.');
    }
    if (!line.wholesaleEligible) continue;

    const lineSubtotalCents = line.unitPriceCents * line.quantity;
    if (!Number.isSafeInteger(lineSubtotalCents)) {
      throw new Error('El subtotal elegible para mayoreo no es válido.');
    }

    eligibleQuantity += line.quantity;
    eligibleSubtotalCents += lineSubtotalCents;
  }

  if (
    !Number.isSafeInteger(eligibleQuantity) ||
    !Number.isSafeInteger(eligibleSubtotalCents)
  ) {
    throw new Error('El total elegible para mayoreo no es válido.');
  }

  const percent = wholesaleDiscountPercentForQuantity(eligibleQuantity);
  const discountCents = Number(
    (BigInt(eligibleSubtotalCents) * BigInt(percent) + 50n) / 100n
  );

  if (!Number.isSafeInteger(discountCents)) {
    throw new Error('El descuento de mayoreo no es válido.');
  }

  return {
    eligibleQuantity,
    eligibleSubtotalCents,
    percent,
    discountCents,
    piecesUntilDiscount:
      eligibleQuantity >= 16 && eligibleQuantity < 20 ? 20 - eligibleQuantity : null,
  };
}
