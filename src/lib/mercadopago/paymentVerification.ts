import 'server-only';

import { Payment } from 'mercadopago';
import { createMercadoPagoClient } from '@/lib/mercadopago/client';

export type VerifiedPaymentStatus = 'approved' | 'pending' | 'failed' | 'unknown';

export interface VerifiedPaymentSnapshot {
  paymentId: string;
  externalReference: string;
  status: VerifiedPaymentStatus;
  providerStatus: string;
  totalCents: number;
}

const ORDER_REFERENCE_PATTERN =
  /^order_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeProviderStatus(status: string): VerifiedPaymentStatus {
  if (status === 'approved') return 'approved';
  if (status === 'pending' || status === 'in_process' || status === 'authorized') return 'pending';
  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(status)) return 'failed';
  return 'unknown';
}

function toSafeCents(amount: number): number | null {
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > Number.EPSILON) {
    return null;
  }
  return cents;
}

export function isValidPaymentId(value: string) {
  return /^\d{1,30}$/.test(value);
}

export function isValidOrderReference(value: string) {
  return ORDER_REFERENCE_PATTERN.test(value);
}

export async function fetchVerifiedPayment(
  paymentId: string,
  expectedExternalReference?: string
): Promise<VerifiedPaymentSnapshot | null> {
  if (!isValidPaymentId(paymentId)) return null;
  if (expectedExternalReference && !isValidOrderReference(expectedExternalReference)) return null;

  const payment = await new Payment(createMercadoPagoClient()).get({ id: paymentId });
  const externalReference = payment.external_reference;
  const providerStatus = payment.status;
  const transactionAmount = payment.transaction_amount;
  const shippingAmount = payment.shipping_amount;
  const metadata = payment.metadata;

  if (
    typeof externalReference !== 'string' ||
    !isValidOrderReference(externalReference) ||
    (expectedExternalReference && externalReference !== expectedExternalReference) ||
    payment.currency_id !== 'MXN' ||
    typeof providerStatus !== 'string' ||
    typeof transactionAmount !== 'number' ||
    !Number.isFinite(transactionAmount) ||
    (shippingAmount !== undefined &&
      (typeof shippingAmount !== 'number' ||
        !Number.isFinite(shippingAmount) ||
        shippingAmount < 0)) ||
    !isRecord(metadata)
  ) {
    return null;
  }

  const transactionAmountCents = toSafeCents(transactionAmount);
  const normalizedShippingAmount = shippingAmount === undefined ? 0 : shippingAmount;
  const shippingAmountCents = toSafeCents(normalizedShippingAmount);
  const expectedTotalCents = metadata.expected_total_cents;
  const metadataOrderId = metadata.order_id;

  if (transactionAmountCents === null || shippingAmountCents === null) return null;

  const providerTotalCents = transactionAmountCents + shippingAmountCents;

  if (
    !Number.isSafeInteger(providerTotalCents) ||
    typeof expectedTotalCents !== 'number' ||
    !Number.isSafeInteger(expectedTotalCents) ||
    expectedTotalCents !== providerTotalCents ||
    metadataOrderId !== externalReference
  ) {
    return null;
  }

  return {
    paymentId,
    externalReference,
    status: normalizeProviderStatus(providerStatus),
    providerStatus,
    totalCents: providerTotalCents,
  };
}
