import 'server-only';

import { createHash } from 'node:crypto';
import type { VerifiedPaymentSnapshot } from '@/lib/mercadopago/paymentVerification';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  CreatePendingOrderInput,
  MarkOrderShippedInput,
  OrderFulfillmentStatus,
  OrderRecord,
  OrderShippingMethod,
  OrderStatus,
  PaymentEventSource,
} from '@/lib/orders/types';

export class OrderPersistenceError extends Error {}
export class ApprovedPaymentConflictError extends OrderPersistenceError {}
export class OrderFulfillmentConflictError extends OrderPersistenceError {}

interface OrderRow {
  id: string;
  checkout_attempt_id: string;
  external_reference: string;
  public_order_number: string;
  mercadopago_preference_id: string | null;
  mercadopago_payment_id: string | null;
  status: OrderStatus;
  provider_status: string | null;
  currency: 'MXN';
  subtotal_cents: number;
  promotion_code: string | null;
  discount_cents: number;
  shipping_method: OrderShippingMethod;
  shipping_cents: number;
  total_cents: number;
  fulfillment_status: OrderFulfillmentStatus;
  whatsapp_notifications_opt_in: boolean;
  whatsapp_opt_in_at: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

const ORDER_COLUMNS = [
  'id',
  'checkout_attempt_id',
  'external_reference',
  'public_order_number',
  'mercadopago_preference_id',
  'mercadopago_payment_id',
  'status',
  'provider_status',
  'currency',
  'subtotal_cents',
  'promotion_code',
  'discount_cents',
  'shipping_method',
  'shipping_cents',
  'total_cents',
  'fulfillment_status',
  'whatsapp_notifications_opt_in',
  'whatsapp_opt_in_at',
  'shipping_carrier',
  'tracking_number',
  'tracking_url',
  'shipped_at',
  'paid_at',
  'created_at',
  'updated_at',
].join(',');

function toOrderRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    checkoutAttemptId: row.checkout_attempt_id,
    externalReference: row.external_reference,
    publicOrderNumber: row.public_order_number,
    mercadoPagoPreferenceId: row.mercadopago_preference_id,
    mercadoPagoPaymentId: row.mercadopago_payment_id,
    status: row.status,
    providerStatus: row.provider_status,
    currency: row.currency,
    subtotalCents: row.subtotal_cents,
    promotionCode: row.promotion_code,
    discountCents: row.discount_cents,
    shippingMethod: row.shipping_method,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    fulfillmentStatus: row.fulfillment_status,
    whatsappNotificationsOptIn: row.whatsapp_notifications_opt_in,
    whatsappOptInAt: row.whatsapp_opt_in_at,
    shippingCarrier: row.shipping_carrier,
    trackingNumber: row.tracking_number,
    trackingUrl: row.tracking_url,
    shippedAt: row.shipped_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function persistenceFailure(operation: string, cause: unknown) {
  return new OrderPersistenceError(`No fue posible completar ${operation}.`, { cause });
}

function internalStatusForProvider(providerStatus: string): OrderStatus | null {
  if (providerStatus === 'approved') return 'approved';
  if (providerStatus === 'pending' || providerStatus === 'in_process' || providerStatus === 'authorized') {
    return 'pending';
  }
  if (providerStatus === 'rejected') return 'rejected';
  if (providerStatus === 'cancelled') return 'cancelled';
  if (providerStatus === 'refunded') return 'refunded';
  if (providerStatus === 'charged_back') return 'charged_back';
  return null;
}

export async function createPendingOrder(input: CreatePendingOrderInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .rpc('create_pending_order', {
      p_checkout_attempt_id: input.checkoutAttemptId,
      p_external_reference: input.externalReference,
      p_currency: input.currency,
      p_subtotal_cents: input.subtotalCents,
      p_promotion_code: input.promotionCode,
      p_discount_cents: input.discountCents,
      p_shipping_method: input.shippingMethod,
      p_shipping_cents: input.shippingCents,
      p_total_cents: input.totalCents,
      p_customer_email: input.customerEmail,
      p_customer_name: input.customerName,
      p_customer_phone: input.customerPhone,
      p_whatsapp_notifications_opt_in: input.whatsappNotificationsOptIn,
      p_shipping_address: input.shippingAddress,
      p_items: input.items.map((item) => ({
        product_slug: item.productSlug,
        product_name: item.productName,
        variant_id: item.variantId,
        variant_label: item.variantLabel,
        quantity: item.quantity,
        unit_price_cents: item.unitPriceCents,
        line_total_cents: item.lineTotalCents,
      })),
    })
    .single();

  if (error || !data) throw persistenceFailure('la creación durable del pedido', error);
  return toOrderRecord(data as OrderRow);
}

export async function attachPreferenceToOrder(externalReference: string, preferenceId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .rpc('attach_preference_to_order', {
      p_external_reference: externalReference,
      p_preference_id: preferenceId,
    })
    .maybeSingle();

  if (error) throw persistenceFailure('el enlace de la preferencia', error);
  return data ? toOrderRecord(data as OrderRow) : null;
}

export async function recordPreferenceFailure(externalReference: string, errorCode: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc('record_preference_failure', {
    p_external_reference: externalReference,
    p_error_code: errorCode,
  });

  if (error) throw persistenceFailure('el registro del fallo de preferencia', error);
}

export async function recordVerifiedPayment(
  payment: VerifiedPaymentSnapshot,
  source: PaymentEventSource
) {
  const supabase = createSupabaseAdminClient();
  const internalStatus = internalStatusForProvider(payment.providerStatus);
  const statusDigest = createHash('sha256').update(payment.providerStatus).digest('hex');
  const dedupeKey = `mercadopago:${payment.paymentId}:${statusDigest}`;
  const { data, error } = await supabase
    .rpc('record_verified_payment', {
      p_external_reference: payment.externalReference,
      p_payment_id: payment.paymentId,
      p_provider_status: payment.providerStatus,
      p_internal_status: internalStatus,
      p_total_cents: payment.totalCents,
      p_event_type: source,
      p_dedupe_key: dedupeKey,
    })
    .maybeSingle();

  if (error) throw persistenceFailure('el registro del pago verificado', error);
  if (!data) return null;

  const order = toOrderRecord(data as OrderRow);
  if (
    internalStatus === 'approved' &&
    order.mercadoPagoPaymentId !== payment.paymentId
  ) {
    // The event is already durable. Escalate without silently replacing a
    // different approved payment selected as the order's final payment.
    throw new ApprovedPaymentConflictError(
      'El pedido ya tiene otro pago aprobado que requiere revisión.'
    );
  }

  return order;
}

export async function findOrderByExternalReference(externalReference: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('external_reference', externalReference)
    .maybeSingle();

  if (error) throw persistenceFailure('la consulta del pedido', error);
  return data ? toOrderRecord(data as unknown as OrderRow) : null;
}

export async function findOrderByPaymentId(paymentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('mercadopago_payment_id', paymentId)
    .maybeSingle();

  if (error) throw persistenceFailure('la consulta del pedido por pago', error);
  return data ? toOrderRecord(data as unknown as OrderRow) : null;
}

export async function persistOrderShipment(input: MarkOrderShippedInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .rpc('mark_order_shipped', {
      p_order_id: input.orderId,
      p_shipping_carrier: input.shippingCarrier,
      p_tracking_number: input.trackingNumber,
      p_tracking_url: input.trackingUrl,
    })
    .maybeSingle();

  if (error?.message.includes('order_already_shipped_conflict')) {
    throw new OrderFulfillmentConflictError(
      'El pedido ya fue enviado con datos de rastreo diferentes.',
      { cause: error }
    );
  }
  if (error || !data) throw persistenceFailure('el registro del envío', error);
  return toOrderRecord(data as OrderRow);
}
