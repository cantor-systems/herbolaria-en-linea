import { PROMOTIONS_CONFIG, PROMOTIONS_ENABLED } from '@/config/promotions';
import type { Promotion } from '@/types';

export type PromotionValidationReason =
  | 'invalid_code'
  | 'disabled'
  | 'not_started'
  | 'expired'
  | 'minimum_not_met'
  | 'invalid_subtotal';

export interface ValidatedPromotion {
  valid: true;
  code: string;
  type: Promotion['type'];
  value: number;
  discountCents: number;
}

export interface InvalidPromotion {
  valid: false;
  reason: PromotionValidationReason;
  message: string;
}

export type PromotionValidationResult = ValidatedPromotion | InvalidPromotion;

interface ValidatePromotionInput {
  code: string;
  subtotalCents: number;
  now?: Date;
}

export function normalizePromotionCode(code: string) {
  return code.trim().toUpperCase();
}

function dateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  if (!year || !month || !day) throw new Error('No fue posible validar la fecha del cupón.');
  return `${year}-${month}-${day}`;
}

function percentageDiscountCents(subtotalCents: number, percentage: number) {
  if (!Number.isSafeInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new Error('La configuración porcentual del cupón no es válida.');
  }

  const rounded = (BigInt(subtotalCents) * BigInt(percentage) + 50n) / 100n;
  const discountCents = Number(rounded);
  if (!Number.isSafeInteger(discountCents)) {
    throw new Error('El descuento calculado no es válido.');
  }
  return discountCents;
}

function calculateDiscountCents(promotion: Promotion, subtotalCents: number) {
  const calculated =
    promotion.type === 'percentage'
      ? percentageDiscountCents(subtotalCents, promotion.value)
      : promotion.value;
  return Math.min(subtotalCents, calculated);
}

export function validatePromotion({
  code,
  subtotalCents,
  now = new Date(),
}: ValidatePromotionInput): PromotionValidationResult {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    return {
      valid: false,
      reason: 'invalid_subtotal',
      message: 'El subtotal no es válido para aplicar el cupón.',
    };
  }

  const normalizedCode = normalizePromotionCode(code);
  const promotion = PROMOTIONS_CONFIG.find(
    (candidate) => normalizePromotionCode(candidate.code) === normalizedCode
  );
  if (!normalizedCode || !promotion) {
    return {
      valid: false,
      reason: 'invalid_code',
      message: 'El cupón ingresado no es válido.',
    };
  }

  if (!PROMOTIONS_ENABLED || !promotion.enabled) {
    return {
      valid: false,
      reason: 'disabled',
      message: 'Este cupón no está disponible.',
    };
  }

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    return {
      valid: false,
      reason: 'expired',
      message: 'No fue posible validar la vigencia del cupón.',
    };
  }

  const currentDate = dateKeyInTimeZone(now, promotion.timeZone);
  if (promotion.startsAt && currentDate < promotion.startsAt) {
    return {
      valid: false,
      reason: 'not_started',
      message: 'Este cupón todavía no está vigente.',
    };
  }
  if (promotion.endsAt && currentDate > promotion.endsAt) {
    return {
      valid: false,
      reason: 'expired',
      message: 'Este cupón expiró el 30/09/2026.',
    };
  }

  if (subtotalCents < promotion.minimumSubtotalCents) {
    return {
      valid: false,
      reason: 'minimum_not_met',
      message: 'La compra mínima para MORONEL15 es de $500 MXN.',
    };
  }

  return {
    valid: true,
    code: normalizePromotionCode(promotion.code),
    type: promotion.type,
    value: promotion.value,
    discountCents: calculateDiscountCents(promotion, subtotalCents),
  };
}
