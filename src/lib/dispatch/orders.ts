import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  OrderFulfillmentStatus,
  OrderShippingAddress,
  OrderShippingMethod,
  OrderStatus,
} from '@/lib/orders/types';

export type ShippingEmailNotificationStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed';

export type DispatchOrderSort = 'newest' | 'oldest';

export interface DispatchOrderListFilters {
  search?: string;
  fulfillmentStatus?: OrderFulfillmentStatus;
  shippingMethod?: OrderShippingMethod;
  sort?: DispatchOrderSort;
}

export interface DispatchOrderListItem {
  id: string;
  externalReference: string;
  publicOrderNumber: string;
  status: OrderStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  totalCents: number;
  shippingMethod: OrderShippingMethod;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  whatsappNotificationsOptIn: boolean;
  whatsappShippingNotifiedAt: string | null;
  shippingEmailNotification: ShippingEmailNotification | null;
  createdAt: string;
}

export interface DispatchOrderItem {
  id: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface ShippingEmailNotification {
  status: ShippingEmailNotificationStatus;
  sentAt: string | null;
  updatedAt: string;
}

export interface DispatchOrderDetail extends DispatchOrderListItem {
  currency: 'MXN';
  shippingCents: number;
  shippingAddress: OrderShippingAddress | null;
  whatsappOptInAt: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  paidAt: string | null;
  items: DispatchOrderItem[];
  shippingEmailNotification: ShippingEmailNotification | null;
}

interface DispatchOrderRow {
  id: string;
  external_reference: string;
  public_order_number: string;
  status: OrderStatus;
  fulfillment_status: OrderFulfillmentStatus;
  currency?: 'MXN';
  total_cents: number | string;
  shipping_cents?: number | string;
  shipping_method: OrderShippingMethod;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address?: unknown;
  whatsapp_notifications_opt_in?: boolean;
  whatsapp_opt_in_at?: string | null;
  whatsapp_shipping_notified_at?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  paid_at?: string | null;
  created_at: string;
}

interface DispatchOrderItemRow {
  id: string;
  product_name: string;
  variant_label: string;
  quantity: number;
  unit_price_cents: number | string;
  line_total_cents: number | string;
}

interface ShippingEmailNotificationRow {
  order_id?: string;
  status: ShippingEmailNotificationStatus;
  sent_at: string | null;
  updated_at: string;
}

const LIST_COLUMNS = [
  'id',
  'external_reference',
  'public_order_number',
  'status',
  'fulfillment_status',
  'customer_name',
  'customer_email',
  'customer_phone',
  'total_cents',
  'shipping_method',
  'shipping_carrier',
  'tracking_number',
  'whatsapp_notifications_opt_in',
  'whatsapp_shipping_notified_at',
  'created_at',
].join(',');

const DETAIL_COLUMNS = [
  LIST_COLUMNS,
  'currency',
  'shipping_cents',
  'shipping_address',
  'whatsapp_opt_in_at',
  'tracking_url',
  'shipped_at',
  'paid_at',
].join(',');

export class DispatchOrderDataError extends Error {}

function dataFailure(operation: string, cause: unknown) {
  return new DispatchOrderDataError(`No fue posible completar ${operation}.`, { cause });
}

function cents(value: number | string | undefined) {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isSafeInteger(parsed) || parsed < 0) {
    throw new DispatchOrderDataError('Los importes del pedido no son válidos.');
  }
  return parsed;
}

function textOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function quotedPostgrestValue(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function ilikeContains(column: string, value: string) {
  const escapedValue = value.replace(/[%_]/g, '\\$&');
  return `${column}.ilike.${quotedPostgrestValue(`%${escapedValue}%`)}`;
}

function shippingAddress(value: unknown): OrderShippingAddress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const streetAddress = textOrNull(record.streetAddress);
  const colonia = textOrNull(record.colonia);
  const city = textOrNull(record.city);
  const state = textOrNull(record.state);
  const postalCode = textOrNull(record.postalCode);
  const country = textOrNull(record.country);
  if (!streetAddress || !colonia || !city || !state || !postalCode || country !== 'México') {
    return null;
  }

  return { streetAddress, colonia, city, state, postalCode, country };
}

function toListItem(
  row: DispatchOrderRow,
  notification: ShippingEmailNotification | null = null
): DispatchOrderListItem {
  return {
    id: row.id,
    externalReference: row.external_reference,
    publicOrderNumber: row.public_order_number,
    status: row.status,
    fulfillmentStatus: row.fulfillment_status,
    customerName: textOrNull(row.customer_name),
    customerEmail: textOrNull(row.customer_email),
    customerPhone: textOrNull(row.customer_phone),
    totalCents: cents(row.total_cents),
    shippingMethod: row.shipping_method,
    shippingCarrier: textOrNull(row.shipping_carrier),
    trackingNumber: textOrNull(row.tracking_number),
    whatsappNotificationsOptIn: row.whatsapp_notifications_opt_in === true,
    whatsappShippingNotifiedAt: textOrNull(row.whatsapp_shipping_notified_at),
    shippingEmailNotification: notification,
    createdAt: row.created_at,
  };
}

function toNotification(
  row: ShippingEmailNotificationRow | null
): ShippingEmailNotification | null {
  if (!row) return null;
  return {
    status: row.status,
    sentAt: textOrNull(row.sent_at),
    updatedAt: row.updated_at,
  };
}

export async function listApprovedDispatchOrders(
  filters: DispatchOrderListFilters = {}
) {
  const supabase = createSupabaseAdminClient();
  const search = filters.search?.trim().slice(0, 100) ?? '';
  const publicOrderSearch = search.replace(/^#/, '').trim();

  let query = supabase
    .from('orders')
    .select(LIST_COLUMNS)
    .eq('status', 'approved');

  if (filters.fulfillmentStatus) {
    query = query.eq('fulfillment_status', filters.fulfillmentStatus);
  }
  if (filters.shippingMethod) {
    query = query.eq('shipping_method', filters.shippingMethod);
  }
  if (search) {
    query = query.or(
      [
        publicOrderSearch && ilikeContains('public_order_number', publicOrderSearch),
        ilikeContains('external_reference', search),
        ilikeContains('customer_name', search),
        ilikeContains('customer_email', search),
        ilikeContains('customer_phone', search),
        ilikeContains('tracking_number', search),
      ]
        .filter(Boolean)
        .join(',')
    );
  }

  const { data: orderData, error: orderError } = await query
    .order('created_at', { ascending: filters.sort === 'oldest' })
    .limit(100);

  if (orderError) {
    throw dataFailure('la consulta de pedidos para despacho', orderError);
  }

  const rows = (orderData ?? []) as unknown as DispatchOrderRow[];
  if (rows.length === 0) return [];

  const { data: notificationData, error: notificationError } = await supabase
    .from('order_notifications')
    .select('order_id, status, sent_at, updated_at')
    .eq('notification_type', 'customer_order_shipped_email')
    .in(
      'order_id',
      rows.map((order) => order.id)
    );

  if (notificationError) {
    throw dataFailure('la consulta de notificaciones de envío', notificationError);
  }

  const notificationsByOrderId = new Map<string, ShippingEmailNotification>();
  for (const row of (notificationData ?? []) as unknown as ShippingEmailNotificationRow[]) {
    if (row.order_id) {
      const notification = toNotification(row);
      if (notification) notificationsByOrderId.set(row.order_id, notification);
    }
  }

  return rows.map((order) =>
    toListItem(order, notificationsByOrderId.get(order.id) ?? null)
  );
}

export async function getShippingEmailNotificationStatus(orderId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('order_notifications')
    .select('status, sent_at, updated_at')
    .eq('order_id', orderId)
    .eq('notification_type', 'customer_order_shipped_email')
    .maybeSingle();

  if (error) throw dataFailure('la consulta del email de envío', error);
  return toNotification(data as unknown as ShippingEmailNotificationRow | null);
}

export async function getApprovedDispatchOrder(orderId: string) {
  const supabase = createSupabaseAdminClient();
  const [orderResult, itemsResult, notificationResult] = await Promise.all([
    supabase
      .from('orders')
      .select(DETAIL_COLUMNS)
      .eq('id', orderId)
      .eq('status', 'approved')
      .maybeSingle(),
    supabase
      .from('order_items')
      .select('id, product_name, variant_label, quantity, unit_price_cents, line_total_cents')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),
    supabase
      .from('order_notifications')
      .select('status, sent_at, updated_at')
      .eq('order_id', orderId)
      .eq('notification_type', 'customer_order_shipped_email')
      .maybeSingle(),
  ]);

  if (orderResult.error || itemsResult.error || notificationResult.error) {
    throw dataFailure(
      'la consulta del detalle de despacho',
      orderResult.error ?? itemsResult.error ?? notificationResult.error
    );
  }
  if (!orderResult.data) return null;

  const row = orderResult.data as unknown as DispatchOrderRow;
  const items = ((itemsResult.data ?? []) as unknown as DispatchOrderItemRow[]).map(
    (item) => ({
      id: item.id,
      productName: item.product_name,
      variantLabel: item.variant_label,
      quantity: item.quantity,
      unitPriceCents: cents(item.unit_price_cents),
      lineTotalCents: cents(item.line_total_cents),
    })
  );

  return {
    ...toListItem(
      row,
      toNotification(
        notificationResult.data as unknown as ShippingEmailNotificationRow | null
      )
    ),
    currency: row.currency ?? 'MXN',
    shippingCents: cents(row.shipping_cents),
    shippingAddress: shippingAddress(row.shipping_address),
    whatsappOptInAt: textOrNull(row.whatsapp_opt_in_at),
    trackingUrl: textOrNull(row.tracking_url),
    shippedAt: textOrNull(row.shipped_at),
    paidAt: textOrNull(row.paid_at),
    items,
  } satisfies DispatchOrderDetail;
}

export async function markWhatsAppShippingNotified(orderId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .rpc('mark_whatsapp_shipping_notified', { p_order_id: orderId })
    .maybeSingle();

  if (error || !data) {
    throw dataFailure('la confirmación de WhatsApp', error);
  }

  const notifiedAt = textOrNull(
    (data as unknown as { whatsapp_shipping_notified_at?: unknown })
      .whatsapp_shipping_notified_at
  );
  if (!notifiedAt) {
    throw new DispatchOrderDataError('No fue posible confirmar la notificación.');
  }

  return notifiedAt;
}
