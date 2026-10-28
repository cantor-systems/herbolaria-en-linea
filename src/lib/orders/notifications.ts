import 'server-only';

import { Resend } from 'resend';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { SITE_NAME } from '@/lib/site';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type NotificationResult = 'sent' | 'skipped' | 'failed';
type NotificationClaimRpc =
  | 'claim_admin_order_approved_notification'
  | 'claim_customer_order_approved_notification'
  | 'claim_customer_order_shipped_email_notification';

interface NotificationEmail {
  subject: string;
  html: string;
  text: string;
}

interface NotificationDefinition {
  claimRpc: NotificationClaimRpc;
  idempotencyPrefix:
    | 'admin-order-approved'
    | 'customer-order-approved'
    | 'customer-order-shipped-email';
  buildEmail: (
    order: OrderNotificationRow,
    items: OrderItemNotificationRow[]
  ) => NotificationEmail;
  getRecipient: (order: OrderNotificationRow) => string;
}

interface ClaimedNotificationRow {
  id: string;
  attempts: number;
}

interface OrderNotificationRow {
  id: string;
  external_reference: string;
  public_order_number: string;
  mercadopago_payment_id: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  promotion_code: string | null;
  discount_cents: number;
  shipping_method: string;
  shipping_cents: number;
  total_cents: number;
  fulfillment_status: 'pending' | 'shipped';
  shipping_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: unknown;
  paid_at: string | null;
  created_at: string;
}

interface OrderItemNotificationRow {
  product_name: string;
  variant_label: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

class NotificationProcessingError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function requiredEnvironmentVariable(
  name: 'RESEND_API_KEY' | 'ORDER_NOTIFICATION_EMAIL' | 'RESEND_FROM_EMAIL'
) {
  const value = process.env[name]?.trim();
  if (!value) throw new NotificationProcessingError('notification_configuration_error');
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function centsValue(value: unknown) {
  const cents = typeof value === 'string' ? Number(value) : value;
  if (typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents < 0) {
    throw new NotificationProcessingError('invalid_order_notification_data');
  }
  return cents;
}

function integerValue(value: unknown) {
  const integer = typeof value === 'string' ? Number(value) : value;
  if (typeof integer !== 'number' || !Number.isSafeInteger(integer) || integer < 1) {
    throw new NotificationProcessingError('invalid_order_notification_data');
  }
  return integer;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] ?? character
  );
}

function formatCurrency(cents: number) {
  const amount = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(cents / 100);
  return `${amount} MXN`;
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new NotificationProcessingError('invalid_order_notification_data');
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(date);
}

function normalizeOrder(value: unknown): OrderNotificationRow {
  if (!isRecord(value)) {
    throw new NotificationProcessingError('invalid_order_notification_data');
  }

  const id = stringValue(value.id, '');
  const externalReference = stringValue(value.external_reference, '');
  const publicOrderNumber = stringValue(value.public_order_number, '');
  const paymentId = stringValue(value.mercadopago_payment_id, '');
  const status = stringValue(value.status, '');
  const currency = stringValue(value.currency, '');
  const shippingMethod = stringValue(value.shipping_method, '');
  const fulfillmentStatus = stringValue(value.fulfillment_status, '');
  const createdAt = stringValue(value.created_at, '');

  if (
    !id ||
    !externalReference ||
    !publicOrderNumber ||
    !paymentId ||
    status !== 'approved' ||
    currency !== 'MXN' ||
    !['standard', 'express'].includes(shippingMethod) ||
    !['pending', 'shipped'].includes(fulfillmentStatus) ||
    !createdAt
  ) {
    throw new NotificationProcessingError('invalid_order_notification_data');
  }

  return {
    id,
    external_reference: externalReference,
    public_order_number: publicOrderNumber,
    mercadopago_payment_id: paymentId,
    status,
    currency,
    subtotal_cents: centsValue(value.subtotal_cents),
    promotion_code:
      typeof value.promotion_code === 'string' && value.promotion_code.trim()
        ? value.promotion_code.trim()
        : null,
    discount_cents: centsValue(value.discount_cents),
    shipping_method: shippingMethod,
    shipping_cents: centsValue(value.shipping_cents),
    total_cents: centsValue(value.total_cents),
    fulfillment_status: fulfillmentStatus as 'pending' | 'shipped',
    shipping_carrier:
      typeof value.shipping_carrier === 'string' && value.shipping_carrier.trim()
        ? value.shipping_carrier.trim()
        : null,
    tracking_number:
      typeof value.tracking_number === 'string' && value.tracking_number.trim()
        ? value.tracking_number.trim()
        : null,
    tracking_url:
      typeof value.tracking_url === 'string' && value.tracking_url.trim()
        ? value.tracking_url.trim()
        : null,
    shipped_at:
      typeof value.shipped_at === 'string' && value.shipped_at.trim()
        ? value.shipped_at.trim()
        : null,
    customer_email:
      typeof value.customer_email === 'string' && value.customer_email.trim()
        ? value.customer_email.trim()
        : null,
    customer_name:
      typeof value.customer_name === 'string' && value.customer_name.trim()
        ? value.customer_name.trim()
        : null,
    customer_phone:
      typeof value.customer_phone === 'string' && value.customer_phone.trim()
        ? value.customer_phone.trim()
        : null,
    shipping_address: value.shipping_address,
    paid_at:
      typeof value.paid_at === 'string' && value.paid_at.trim() ? value.paid_at : null,
    created_at: createdAt,
  };
}

function normalizeItems(value: unknown): OrderItemNotificationRow[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new NotificationProcessingError('invalid_order_notification_data');
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      throw new NotificationProcessingError('invalid_order_notification_data');
    }

    const productName = stringValue(item.product_name, '');
    const variantLabel = stringValue(item.variant_label, '');
    if (!productName || !variantLabel) {
      throw new NotificationProcessingError('invalid_order_notification_data');
    }

    return {
      product_name: productName,
      variant_label: variantLabel,
      quantity: integerValue(item.quantity),
      unit_price_cents: centsValue(item.unit_price_cents),
      line_total_cents: centsValue(item.line_total_cents),
    };
  });
}

function addressLines(value: unknown) {
  if (!isRecord(value)) return ['—'];

  const streetAddress = stringValue(value.streetAddress);
  const colonia = stringValue(value.colonia);
  const city = stringValue(value.city);
  const state = stringValue(value.state);
  const postalCode = stringValue(value.postalCode);
  const country = stringValue(value.country, 'México');

  return [
    `Dirección: ${streetAddress}`,
    `Colonia: ${colonia}`,
    `Ciudad: ${city}`,
    `Estado: ${state}`,
    `Código postal: ${postalCode}`,
    `País: ${country}`,
  ];
}

function shippingMethodLabel(method: string) {
  return method === 'express' ? 'Exprés' : 'Estándar';
}

function shippingEstimate(method: string) {
  return method === 'express'
    ? SHIPPING_CONFIG.expressEstimatedDays
    : SHIPPING_CONFIG.standardEstimatedDays;
}

function customerRecipient(order: OrderNotificationRow) {
  const email = order.customer_email?.trim() ?? '';
  if (
    !email ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new NotificationProcessingError('customer_recipient_error');
  }
  return email;
}

function buildAdminEmail(order: OrderNotificationRow, items: OrderItemNotificationRow[]) {
  const date = formatOrderDate(order.paid_at ?? order.created_at);
  const total = formatCurrency(order.total_cents);
  const address = addressLines(order.shipping_address);
  const customerName = order.customer_name ?? '—';
  const customerEmail = order.customer_email ?? '—';
  const customerPhone = order.customer_phone ?? '—';
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(item.product_name)}</strong><br>
            <span style="color:#6b7280;">${escapeHtml(item.variant_label)}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(formatCurrency(item.unit_price_cents))}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(formatCurrency(item.line_total_cents))}</td>
        </tr>`
    )
    .join('');
  const couponHtml = order.promotion_code
    ? `<tr><td style="padding:4px 0;color:#4b5563;">Cupón</td><td style="padding:4px 0;text-align:right;">${escapeHtml(order.promotion_code)}</td></tr>`
    : '';
  const discountHtml = order.discount_cents > 0
    ? `<tr><td style="padding:4px 0;color:#4b5563;">Descuento</td><td style="padding:4px 0;text-align:right;color:#166534;">−${escapeHtml(formatCurrency(order.discount_cents))}</td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:720px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:12px;padding:24px;">
        <h1 style="margin:0 0 8px;font-size:24px;">Nuevo pedido pagado — ${SITE_NAME}</h1>
        <p style="margin:0 0 24px;color:#4b5563;">El pago fue verificado y la orden quedó aprobada.</p>

        <h2 style="font-size:18px;margin:24px 0 10px;">Pedido</h2>
        <p style="margin:4px 0;"><strong>Pedido:</strong> #${escapeHtml(order.public_order_number)}</p>
        <p style="margin:4px 0;"><strong>Referencia técnica:</strong> ${escapeHtml(order.external_reference)}</p>
        <p style="margin:4px 0;"><strong>Fecha:</strong> ${escapeHtml(date)}</p>
        <p style="margin:4px 0;"><strong>Estado:</strong> Pago aprobado</p>
        <p style="margin:4px 0;"><strong>ID de pago Mercado Pago:</strong> ${escapeHtml(order.mercadopago_payment_id)}</p>

        <h2 style="font-size:18px;margin:24px 0 10px;">Cliente</h2>
        <p style="margin:4px 0;"><strong>Nombre:</strong> ${escapeHtml(customerName)}</p>
        <p style="margin:4px 0;"><strong>Correo:</strong> ${escapeHtml(customerEmail)}</p>
        <p style="margin:4px 0;"><strong>Teléfono:</strong> ${escapeHtml(customerPhone)}</p>

        <h2 style="font-size:18px;margin:24px 0 10px;">Dirección de envío</h2>
        <p style="margin:4px 0;line-height:1.5;">${address.map(escapeHtml).join('<br>')}</p>

        <h2 style="font-size:18px;margin:24px 0 10px;">Productos</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 8px;text-align:left;">Producto y variante</th>
              <th style="padding:10px 8px;text-align:center;">Cantidad</th>
              <th style="padding:10px 8px;text-align:right;">Precio unitario</th>
              <th style="padding:10px 8px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <h2 style="font-size:18px;margin:24px 0 10px;">Totales</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            <tr><td style="padding:4px 0;color:#4b5563;">Subtotal</td><td style="padding:4px 0;text-align:right;">${escapeHtml(formatCurrency(order.subtotal_cents))}</td></tr>
            ${couponHtml}
            ${discountHtml}
            <tr><td style="padding:4px 0;color:#4b5563;">Método de envío</td><td style="padding:4px 0;text-align:right;">${escapeHtml(shippingMethodLabel(order.shipping_method))}</td></tr>
            <tr><td style="padding:4px 0;color:#4b5563;">Envío</td><td style="padding:4px 0;text-align:right;">${escapeHtml(formatCurrency(order.shipping_cents))}</td></tr>
            <tr style="font-size:18px;font-weight:700;"><td style="padding:12px 0 4px;border-top:1px solid #d1d5db;">Total</td><td style="padding:12px 0 4px;border-top:1px solid #d1d5db;text-align:right;">${escapeHtml(total)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;

  const itemText = items
    .map(
      (item) =>
        `- ${item.product_name} — ${item.variant_label}\n  Cantidad: ${item.quantity} | Precio unitario: ${formatCurrency(item.unit_price_cents)} | Total: ${formatCurrency(item.line_total_cents)}`
    )
    .join('\n');
  const promotionText = [
    order.promotion_code ? `Cupón: ${order.promotion_code}` : null,
    order.discount_cents > 0 ? `Descuento: −${formatCurrency(order.discount_cents)}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const text = `Nuevo pedido pagado — ${SITE_NAME}

El pago fue verificado y la orden quedó aprobada.

PEDIDO
Pedido: #${order.public_order_number}
Referencia técnica: ${order.external_reference}
Fecha: ${date}
Estado: Pago aprobado
ID de pago Mercado Pago: ${order.mercadopago_payment_id}

CLIENTE
Nombre: ${customerName}
Correo: ${customerEmail}
Teléfono: ${customerPhone}

DIRECCIÓN DE ENVÍO
${address.join('\n')}

PRODUCTOS
${itemText}

TOTALES
Subtotal: ${formatCurrency(order.subtotal_cents)}
${promotionText ? `${promotionText}\n` : ''}Método de envío: ${shippingMethodLabel(order.shipping_method)}
Envío: ${formatCurrency(order.shipping_cents)}
Total: ${total}`;

  return {
    subject: `Nuevo pedido #${order.public_order_number} pagado — ${total} — ${SITE_NAME}`,
    html,
    text,
  };
}

function buildCustomerEmail(
  order: OrderNotificationRow,
  items: OrderItemNotificationRow[]
): NotificationEmail {
  const date = formatOrderDate(order.paid_at ?? order.created_at);
  const total = formatCurrency(order.total_cents);
  const address = addressLines(order.shipping_address);
  const customerName = order.customer_name ?? '—';
  const estimatedDelivery = shippingEstimate(order.shipping_method);
  const greeting = customerName === '—' ? 'Hola,' : `Hola ${escapeHtml(customerName)},`;
  const itemCards = items
    .map(
      (item) => `
        <div style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-weight:700;color:#23312c;">${escapeHtml(item.product_name)}</p>
          <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">${escapeHtml(item.variant_label)}</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:2px 0;color:#4b5563;">Cantidad: ${item.quantity}</td>
              <td style="padding:2px 0;text-align:right;">Precio unitario: ${escapeHtml(formatCurrency(item.unit_price_cents))}</td>
            </tr>
            <tr>
              <td style="padding:2px 0;color:#4b5563;">Total de línea</td>
              <td style="padding:2px 0;text-align:right;font-weight:700;">${escapeHtml(formatCurrency(item.line_total_cents))}</td>
            </tr>
          </table>
        </div>`
    )
    .join('');
  const couponHtml = order.promotion_code
    ? `<tr><td style="padding:5px 0;color:#4b5563;">Cupón</td><td style="padding:5px 0;text-align:right;">${escapeHtml(order.promotion_code)}</td></tr>`
    : '';
  const discountHtml = order.discount_cents > 0
    ? `<tr><td style="padding:5px 0;color:#4b5563;">Descuento</td><td style="padding:5px 0;text-align:right;color:#166534;">−${escapeHtml(formatCurrency(order.discount_cents))}</td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;background:#f4f1e8;font-family:Arial,sans-serif;color:#23312c;">
    <div style="max-width:680px;margin:0 auto;padding:20px 12px;">
      <div style="background:#ffffff;border-radius:12px;border-top:6px solid #285f50;padding:24px;">
        <p style="margin:0 0 8px;color:#6f8f69;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${SITE_NAME}</p>
        <h1 style="margin:0 0 18px;color:#285f50;font-size:26px;line-height:1.2;">¡Gracias por tu compra!</h1>
        <p style="margin:0 0 10px;line-height:1.6;">${greeting}</p>
        <p style="margin:0 0 24px;line-height:1.6;">Recibimos tu pago y tu pedido quedó confirmado correctamente.</p>

        <h2 style="margin:24px 0 10px;color:#285f50;font-size:18px;">Tu pedido</h2>
        <p style="margin:5px 0;"><strong>Pedido:</strong> #${escapeHtml(order.public_order_number)}</p>
        <p style="margin:5px 0;"><strong>Fecha:</strong> ${escapeHtml(date)}</p>
        <p style="margin:5px 0;"><strong>Estado:</strong> Pago recibido / Pedido confirmado</p>

        <h2 style="margin:24px 0 0;color:#285f50;font-size:18px;">Productos</h2>
        ${itemCards}

        <h2 style="margin:24px 0 10px;color:#285f50;font-size:18px;">Resumen</h2>
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tbody>
            <tr><td style="padding:5px 0;color:#4b5563;">Subtotal</td><td style="padding:5px 0;text-align:right;">${escapeHtml(formatCurrency(order.subtotal_cents))}</td></tr>
            ${couponHtml}
            ${discountHtml}
            <tr><td style="padding:5px 0;color:#4b5563;">Método de envío</td><td style="padding:5px 0;text-align:right;">${escapeHtml(shippingMethodLabel(order.shipping_method))}</td></tr>
            <tr><td style="padding:5px 0;color:#4b5563;">Costo de envío</td><td style="padding:5px 0;text-align:right;">${escapeHtml(formatCurrency(order.shipping_cents))}</td></tr>
            <tr style="font-size:18px;font-weight:700;"><td style="padding:13px 0 5px;border-top:1px solid #d1d5db;">Total pagado</td><td style="padding:13px 0 5px;border-top:1px solid #d1d5db;text-align:right;color:#285f50;">${escapeHtml(total)}</td></tr>
          </tbody>
        </table>

        <h2 style="margin:24px 0 10px;color:#285f50;font-size:18px;">Entrega</h2>
        <p style="margin:5px 0;"><strong>Nombre:</strong> ${escapeHtml(customerName)}</p>
        <p style="margin:5px 0;line-height:1.6;">${address.map(escapeHtml).join('<br>')}</p>

        <div style="margin-top:24px;padding:16px;background:#edf4ee;border-radius:8px;border:1px solid #c8d8ca;">
          <p style="margin:0 0 4px;font-weight:700;color:#285f50;">Plazo estimado</p>
          <p style="margin:0;">${escapeHtml(estimatedDelivery)}</p>
        </div>

        <p style="margin:24px 0 0;color:#4b5563;font-size:14px;line-height:1.5;">Conserva este correo como referencia de tu compra.</p>
      </div>
    </div>
  </body>
</html>`;

  const itemText = items
    .map(
      (item) =>
        `- ${item.product_name} — ${item.variant_label}\n  Cantidad: ${item.quantity} | Precio unitario: ${formatCurrency(item.unit_price_cents)} | Total de línea: ${formatCurrency(item.line_total_cents)}`
    )
    .join('\n');
  const promotionText = [
    order.promotion_code ? `Cupón: ${order.promotion_code}` : null,
    order.discount_cents > 0 ? `Descuento: −${formatCurrency(order.discount_cents)}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const text = `¡Gracias por tu compra!

${customerName === '—' ? 'Hola,' : `Hola ${customerName},`}

Recibimos tu pago y tu pedido quedó confirmado correctamente.

TU PEDIDO
Pedido: #${order.public_order_number}
Fecha: ${date}
Estado: Pago recibido / Pedido confirmado

PRODUCTOS
${itemText}

RESUMEN
Subtotal: ${formatCurrency(order.subtotal_cents)}
${promotionText ? `${promotionText}\n` : ''}Método de envío: ${shippingMethodLabel(order.shipping_method)}
Costo de envío: ${formatCurrency(order.shipping_cents)}
Total pagado: ${total}

ENTREGA
Nombre: ${customerName}
${address.join('\n')}

PLAZO ESTIMADO
${estimatedDelivery}

Conserva este correo como referencia de tu compra.`;

  return {
    subject: `Pedido #${order.public_order_number} confirmado — ${SITE_NAME}`,
    html,
    text,
  };
}

function shippedOrderDetails(order: OrderNotificationRow) {
  if (
    order.fulfillment_status !== 'shipped' ||
    !order.shipping_carrier ||
    !order.tracking_number ||
    !order.tracking_url ||
    !order.shipped_at
  ) {
    throw new NotificationProcessingError('invalid_shipment_notification_data');
  }

  try {
    const trackingUrl = new URL(order.tracking_url);
    if (trackingUrl.protocol !== 'https:') {
      throw new Error('invalid_protocol');
    }
  } catch {
    throw new NotificationProcessingError('invalid_shipment_notification_data');
  }

  return {
    shippingCarrier: order.shipping_carrier,
    trackingNumber: order.tracking_number,
    trackingUrl: order.tracking_url,
  };
}

function buildCustomerShippedEmail(
  order: OrderNotificationRow,
  items: OrderItemNotificationRow[]
): NotificationEmail {
  const shipment = shippedOrderDetails(order);
  const address = addressLines(order.shipping_address);
  const customerName = order.customer_name ?? '—';
  const estimatedDelivery = shippingEstimate(order.shipping_method);
  const productsHtml = items
    .map(
      (item) => `
        <div style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-weight:700;color:#23312c;">${escapeHtml(item.product_name)}</p>
          <p style="margin:0;color:#6b7280;font-size:14px;">${escapeHtml(item.variant_label)} · Cantidad: ${item.quantity}</p>
        </div>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;background:#f4f1e8;font-family:Arial,sans-serif;color:#23312c;">
    <div style="max-width:680px;margin:0 auto;padding:20px 12px;">
      <div style="background:#ffffff;border-radius:12px;border-top:6px solid #285f50;padding:24px;">
        <p style="margin:0 0 8px;color:#6f8f69;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${SITE_NAME}</p>
        <h1 style="margin:0 0 18px;color:#285f50;font-size:26px;line-height:1.2;">Tu pedido ya fue enviado.</h1>
        <p style="margin:0 0 24px;line-height:1.6;">Ya puedes consultar el avance de tu envío con los datos de rastreo siguientes.</p>

        <h2 style="margin:24px 0 10px;color:#285f50;font-size:18px;">Pedido</h2>
        <p style="margin:5px 0;"><strong>Pedido:</strong> #${escapeHtml(order.public_order_number)}</p>

        <h2 style="margin:24px 0 0;color:#285f50;font-size:18px;">Productos</h2>
        ${productsHtml}

        <h2 style="margin:24px 0 10px;color:#285f50;font-size:18px;">Envío</h2>
        <p style="margin:5px 0;"><strong>Paquetería:</strong> ${escapeHtml(shipment.shippingCarrier)}</p>
        <p style="margin:5px 0;"><strong>Número de guía:</strong> ${escapeHtml(shipment.trackingNumber)}</p>
        <p style="margin:5px 0 18px;"><strong>Método:</strong> ${escapeHtml(shippingMethodLabel(order.shipping_method))}</p>
        <p style="margin:0 0 24px;">
          <a href="${escapeHtml(shipment.trackingUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 18px;background:#285f50;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">Rastrear mi envío</a>
        </p>
        <p style="margin:0;color:#6b7280;font-size:13px;word-break:break-all;">${escapeHtml(shipment.trackingUrl)}</p>

        <h2 style="margin:24px 0 10px;color:#285f50;font-size:18px;">Dirección de entrega</h2>
        <p style="margin:5px 0;"><strong>Nombre:</strong> ${escapeHtml(customerName)}</p>
        <p style="margin:5px 0;line-height:1.6;">${address.map(escapeHtml).join('<br>')}</p>

        <div style="margin-top:24px;padding:16px;background:#edf4ee;border-radius:8px;border:1px solid #c8d8ca;">
          <p style="margin:0 0 4px;font-weight:700;color:#285f50;">Plazo estimado</p>
          <p style="margin:0;">${escapeHtml(estimatedDelivery)}</p>
        </div>

        <p style="margin:24px 0 0;color:#4b5563;font-size:14px;line-height:1.5;">El tiempo de entrega puede variar según la paquetería y la ubicación.</p>
      </div>
    </div>
  </body>
</html>`;

  const productsText = items
    .map(
      (item) =>
        `- ${item.product_name} — ${item.variant_label} — Cantidad: ${item.quantity}`
    )
    .join('\n');

  const text = `Tu pedido ya fue enviado.

PEDIDO
Pedido: #${order.public_order_number}

PRODUCTOS
${productsText}

ENVÍO
Paquetería: ${shipment.shippingCarrier}
Número de guía: ${shipment.trackingNumber}
Rastrear mi envío: ${shipment.trackingUrl}
Método de envío: ${shippingMethodLabel(order.shipping_method)}

DIRECCIÓN DE ENTREGA
Nombre: ${customerName}
${address.join('\n')}

PLAZO ESTIMADO
${estimatedDelivery}

El tiempo de entrega puede variar según la paquetería y la ubicación.`;

  return {
    subject: `Tu pedido #${order.public_order_number} ha sido enviado — ${SITE_NAME}`,
    html,
    text,
  };
}

async function markFailed(
  notification: ClaimedNotificationRow,
  failureCode: string
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc('mark_order_notification_failed', {
    p_notification_id: notification.id,
    p_attempt: notification.attempts,
    p_last_error: failureCode,
  });

  if (error) throw new NotificationProcessingError('notification_failure_state_error');
}

async function processOrderNotification(
  orderId: string,
  definition: NotificationDefinition
): Promise<NotificationResult> {
  let notification: ClaimedNotificationRow | null = null;
  let failureCode = 'notification_processing_error';

  try {
    const supabase = createSupabaseAdminClient();
    const { data: claimedData, error: claimError } = await supabase
      .rpc(definition.claimRpc, { p_order_id: orderId })
      .maybeSingle();

    if (claimError) throw new NotificationProcessingError('notification_claim_error');
    if (!claimedData) return 'skipped';

    if (!isRecord(claimedData)) {
      throw new NotificationProcessingError('invalid_notification_claim');
    }

    const notificationId = stringValue(claimedData.id, '');
    const attempts = integerValue(claimedData.attempts);
    if (!notificationId) {
      throw new NotificationProcessingError('invalid_notification_claim');
    }
    notification = { id: notificationId, attempts };

    failureCode = 'order_notification_load_error';
    const [orderResult, itemsResult] = await Promise.all([
      supabase
        .from('orders')
        .select(
          'id, external_reference, public_order_number, mercadopago_payment_id, status, currency, subtotal_cents, promotion_code, discount_cents, shipping_method, shipping_cents, total_cents, fulfillment_status, shipping_carrier, tracking_number, tracking_url, shipped_at, customer_email, customer_name, customer_phone, shipping_address, paid_at, created_at'
        )
        .eq('id', orderId)
        .eq('status', 'approved')
        .maybeSingle(),
      supabase
        .from('order_items')
        .select(
          'product_name, variant_label, quantity, unit_price_cents, line_total_cents, created_at'
        )
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
    ]);

    if (orderResult.error || itemsResult.error || !orderResult.data) {
      throw new NotificationProcessingError(failureCode);
    }

    const order = normalizeOrder(orderResult.data);
    const items = normalizeItems(itemsResult.data);
    const email = definition.buildEmail(order, items);

    failureCode = 'notification_configuration_error';
    const resend = new Resend(requiredEnvironmentVariable('RESEND_API_KEY'));
    const from = requiredEnvironmentVariable('RESEND_FROM_EMAIL');
    const recipient = definition.getRecipient(order);

    failureCode = 'email_delivery_error';
    const { error: deliveryError } = await resend.emails.send(
      {
        from,
        to: recipient,
        subject: email.subject,
        html: email.html,
        text: email.text,
      },
      { idempotencyKey: `${definition.idempotencyPrefix}-${notification.id}` }
    );
    if (deliveryError) throw new NotificationProcessingError(failureCode);

    failureCode = 'notification_sent_state_error';
    const { data: sentData, error: sentError } = await supabase
      .rpc('mark_order_notification_sent', {
        p_notification_id: notification.id,
        p_attempt: notification.attempts,
      })
      .maybeSingle();

    if (sentError || !sentData) throw new NotificationProcessingError(failureCode);

    return 'sent';
  } catch (error) {
    const sanitizedCode =
      error instanceof NotificationProcessingError ? error.code : failureCode;

    if (notification) {
      try {
        await markFailed(notification, sanitizedCode);
      } catch {
        console.error('Order notification state update failed.', {
          orderId,
          notificationId: notification.id,
          code: 'notification_failure_state_error',
        });
      }
    }

    console.error('Order notification processing failed.', {
      orderId,
      notificationId: notification?.id,
      code: sanitizedCode,
    });
    return 'failed';
  }
}

export function processAdminOrderApprovedNotification(orderId: string) {
  return processOrderNotification(orderId, {
    claimRpc: 'claim_admin_order_approved_notification',
    idempotencyPrefix: 'admin-order-approved',
    buildEmail: buildAdminEmail,
    getRecipient: () => requiredEnvironmentVariable('ORDER_NOTIFICATION_EMAIL'),
  });
}

export function processCustomerOrderApprovedNotification(orderId: string) {
  return processOrderNotification(orderId, {
    claimRpc: 'claim_customer_order_approved_notification',
    idempotencyPrefix: 'customer-order-approved',
    buildEmail: buildCustomerEmail,
    getRecipient: customerRecipient,
  });
}

export function processCustomerOrderShippedEmailNotification(orderId: string) {
  return processOrderNotification(orderId, {
    claimRpc: 'claim_customer_order_shipped_email_notification',
    idempotencyPrefix: 'customer-order-shipped-email',
    buildEmail: buildCustomerShippedEmail,
    getRecipient: customerRecipient,
  });
}

export async function processOrderApprovedNotifications(orderId: string) {
  const results = await Promise.allSettled([
    processAdminOrderApprovedNotification(orderId),
    processCustomerOrderApprovedNotification(orderId),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Order notification orchestration failed.', {
        orderId,
        code: 'notification_orchestration_error',
      });
    }
  }
}
