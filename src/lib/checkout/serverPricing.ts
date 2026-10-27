import 'server-only';

import { PRODUCTS } from '@/data/products';
import { validatePromotion } from '@/lib/promotions';
import { calculateShippingCents, type ShippingMethod } from '@/lib/shipping';
import {
  calculateWholesaleDiscount,
  isWholesaleEligiblePresentation,
  type WholesaleDiscountPercent,
} from '@/lib/wholesale';

const MAX_CART_LINES = 50;
const MAX_QUANTITY_PER_LINE = 99;

export class CheckoutValidationError extends Error {}

export interface CheckoutCartItemInput {
  slug: string;
  variantId: string;
  quantity: number;
}

export interface PricedCheckoutItem {
  id: string;
  slug: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
  freeShippingEligible: boolean;
  wholesaleEligible: boolean;
}

export interface PricedCheckoutCart {
  items: PricedCheckoutItem[];
  subtotalCents: number;
  promotionCode: string | null;
  discountCents: number;
  wholesaleEligibleQuantity: number;
  wholesaleEligibleSubtotalCents: number;
  wholesaleDiscountPercent: WholesaleDiscountPercent;
  shippingMethod: ShippingMethod;
  shippingCents: number;
  totalCents: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateShippingMethod(input: unknown): ShippingMethod {
  if (input !== 'standard' && input !== 'express') {
    throw new CheckoutValidationError('El método de envío no es válido.');
  }
  return input;
}

export function priceCheckoutCart(
  input: unknown,
  shippingMethodInput: unknown,
  promotionCodeInput: unknown
): PricedCheckoutCart {
  const shippingMethod = validateShippingMethod(shippingMethodInput);
  if (promotionCodeInput !== null && typeof promotionCodeInput !== 'string') {
    throw new CheckoutValidationError('El cupón no es válido.');
  }

  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_CART_LINES) {
    throw new CheckoutValidationError('El carrito no es válido.');
  }

  const aggregated = new Map<string, CheckoutCartItemInput>();

  for (const rawItem of input) {
    if (!isRecord(rawItem)) throw new CheckoutValidationError('El carrito no es válido.');
    if (Object.keys(rawItem).some((key) => !['slug', 'variantId', 'quantity'].includes(key))) {
      throw new CheckoutValidationError('El carrito contiene campos no permitidos.');
    }

    const { slug, variantId, quantity } = rawItem;
    if (
      typeof slug !== 'string' ||
      typeof variantId !== 'string' ||
      typeof quantity !== 'number' ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      throw new CheckoutValidationError('El carrito no es válido.');
    }

    const cleanSlug = slug.trim();
    const cleanVariantId = variantId.trim();
    if (!cleanSlug || !cleanVariantId || cleanSlug.length > 160 || cleanVariantId.length > 160) {
      throw new CheckoutValidationError('El carrito no es válido.');
    }

    const key = `${cleanSlug}:${cleanVariantId}`;
    const previousQuantity = aggregated.get(key)?.quantity ?? 0;
    const aggregatedQuantity = previousQuantity + quantity;
    if (aggregatedQuantity > MAX_QUANTITY_PER_LINE) {
      throw new CheckoutValidationError('La cantidad solicitada no es válida.');
    }

    aggregated.set(key, { slug: cleanSlug, variantId: cleanVariantId, quantity: aggregatedQuantity });
  }

  const items = [...aggregated.values()].map((inputItem) => {
    const product = PRODUCTS.find(
      (candidate) =>
        candidate.slug === inputItem.slug &&
        candidate.status === 'active' &&
        candidate.stockStatus !== 'out_of_stock'
    );
    if (!product) throw new CheckoutValidationError('Uno de los productos ya no está disponible.');

    const variant = product.variants.find((candidate) => candidate.id === inputItem.variantId);
    if (!variant || !Number.isSafeInteger(variant.priceCents) || variant.priceCents < 0) {
      throw new CheckoutValidationError('Una de las variantes ya no está disponible.');
    }

    return {
      id: `${product.slug}:${variant.id}`,
      slug: product.slug,
      variantId: variant.id,
      productName: product.name,
      variantLabel: variant.name,
      title: `${product.name} — ${variant.name}`.slice(0, 256),
      quantity: inputItem.quantity,
      unitPriceCents: variant.priceCents,
      freeShippingEligible: variant.freeShippingEligible,
      wholesaleEligible: isWholesaleEligiblePresentation(product, variant),
    };
  });

  const subtotalCents = items.reduce((total, item) => {
    const lineTotal = item.unitPriceCents * item.quantity;
    if (!Number.isSafeInteger(lineTotal)) throw new CheckoutValidationError('El total del carrito no es válido.');
    return total + lineTotal;
  }, 0);

  if (!Number.isSafeInteger(subtotalCents) || subtotalCents <= 0) {
    throw new CheckoutValidationError('El total del carrito no es válido.');
  }

  const wholesaleDiscount = calculateWholesaleDiscount(items);

  let promotionCode: string | null = null;
  let discountCents = wholesaleDiscount.discountCents;
  if (wholesaleDiscount.percent === 0 && typeof promotionCodeInput === 'string') {
    const promotion = validatePromotion({ code: promotionCodeInput, subtotalCents });
    if (!promotion.valid) throw new CheckoutValidationError(promotion.message);
    promotionCode = promotion.code;
    discountCents = promotion.discountCents;
  }

  if (
    !Number.isSafeInteger(discountCents) ||
    discountCents < 0 ||
    discountCents > subtotalCents
  ) {
    throw new CheckoutValidationError('El descuento calculado no es válido.');
  }

  const shippingCents = calculateShippingCents({
    subtotalCents,
    lines: items,
    method: shippingMethod,
    freeStandardShipping: wholesaleDiscount.percent > 0,
  });
  const totalCents = subtotalCents - discountCents + shippingCents;
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new CheckoutValidationError('El total del carrito no es válido.');
  }

  return {
    items,
    subtotalCents,
    promotionCode,
    discountCents,
    wholesaleEligibleQuantity: wholesaleDiscount.eligibleQuantity,
    wholesaleEligibleSubtotalCents: wholesaleDiscount.eligibleSubtotalCents,
    wholesaleDiscountPercent: wholesaleDiscount.percent,
    shippingMethod,
    shippingCents,
    totalCents,
  };
}
