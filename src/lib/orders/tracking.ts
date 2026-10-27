import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  OrderFulfillmentStatus,
  OrderShippingMethod,
  OrderStatus,
} from '@/lib/orders/types';

export type PublicOrderState =
  | 'payment_pending'
  | 'confirmed'
  | 'shipped'
  | 'unavailable';

export interface PublicOrderTracking {
  orderNumber: string;
  state: PublicOrderState;
  shippingMethod: OrderShippingMethod;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
}

interface TrackingOrderRow {
  public_order_number: string;
  status: OrderStatus;
  fulfillment_status: OrderFulfillmentStatus;
  shipping_method: OrderShippingMethod;
  shipping_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
}

const TRACKING_COLUMNS = [
  'public_order_number',
  'status',
  'fulfillment_status',
  'shipping_method',
  'shipping_carrier',
  'tracking_number',
  'tracking_url',
  'shipped_at',
].join(',');

export class OrderTrackingLookupError extends Error {}

function publicState(row: TrackingOrderRow): PublicOrderState {
  if (row.status === 'pending_payment' || row.status === 'pending') {
    return 'payment_pending';
  }

  if (row.status === 'approved' && row.fulfillment_status === 'pending') {
    return 'confirmed';
  }

  if (row.status === 'approved' && row.fulfillment_status === 'shipped') {
    return 'shipped';
  }

  return 'unavailable';
}

function httpsTrackingUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function cleanOptionalText(value: string | null) {
  const cleanValue = value?.trim();
  return cleanValue || null;
}

function toPublicTracking(row: TrackingOrderRow): PublicOrderTracking {
  const state = publicState(row);
  const canShowShipment = state === 'shipped';

  return {
    orderNumber: row.public_order_number,
    state,
    shippingMethod: row.shipping_method,
    shippingCarrier: canShowShipment ? cleanOptionalText(row.shipping_carrier) : null,
    trackingNumber: canShowShipment ? cleanOptionalText(row.tracking_number) : null,
    trackingUrl: canShowShipment ? httpsTrackingUrl(row.tracking_url) : null,
    shippedAt: canShowShipment ? row.shipped_at : null,
  };
}

export async function findPublicOrderTracking(orderNumber: string, email: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select(TRACKING_COLUMNS)
    .eq('public_order_number', orderNumber)
    .eq('customer_email', email)
    .maybeSingle();

  if (error) {
    throw new OrderTrackingLookupError('No fue posible consultar el rastreo.', {
      cause: error,
    });
  }

  return data ? toPublicTracking(data as unknown as TrackingOrderRow) : null;
}
