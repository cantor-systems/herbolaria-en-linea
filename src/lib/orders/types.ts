export type OrderStatus =
  | 'pending_payment'
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

export type OrderShippingMethod = 'standard' | 'express';
export type OrderFulfillmentStatus = 'pending' | 'shipped';

export interface OrderShippingAddress {
  streetAddress: string;
  colonia: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'México';
}

export interface PendingOrderItem {
  productSlug: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface CreatePendingOrderInput {
  checkoutAttemptId: string;
  externalReference: string;
  currency: 'MXN';
  subtotalCents: number;
  promotionCode: string | null;
  discountCents: number;
  shippingMethod: OrderShippingMethod;
  shippingCents: number;
  totalCents: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  whatsappNotificationsOptIn: boolean;
  shippingAddress: OrderShippingAddress;
  items: PendingOrderItem[];
}

export interface OrderRecord {
  id: string;
  checkoutAttemptId: string;
  externalReference: string;
  publicOrderNumber: string;
  mercadoPagoPreferenceId: string | null;
  mercadoPagoPaymentId: string | null;
  status: OrderStatus;
  providerStatus: string | null;
  currency: 'MXN';
  subtotalCents: number;
  promotionCode: string | null;
  discountCents: number;
  shippingMethod: OrderShippingMethod;
  shippingCents: number;
  totalCents: number;
  fulfillmentStatus: OrderFulfillmentStatus;
  whatsappNotificationsOptIn: boolean;
  whatsappOptInAt: string | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarkOrderShippedInput {
  orderId: string;
  shippingCarrier: string;
  trackingNumber: string;
  trackingUrl: string;
}

export type PaymentEventSource = 'payment_status' | 'payment_webhook';
