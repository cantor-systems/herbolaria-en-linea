export function normalizeMexicanWhatsAppNumber(phone: string | null) {
  if (!phone || !/^[\d\s()+-]+$/.test(phone)) return null;

  const digits = phone.replace(/\D/g, '');
  if (/^\d{10}$/.test(digits)) return `52${digits}`;
  if (/^52\d{10}$/.test(digits)) return digits;
  return null;
}

interface WhatsAppShippingMessageInput {
  customerName: string | null;
  customerPhone: string | null;
  publicOrderNumber: string;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export function buildWhatsAppShippingUrl(input: WhatsAppShippingMessageInput) {
  const phone = normalizeMexicanWhatsAppNumber(input.customerPhone);
  const customerName = input.customerName?.trim();
  const publicOrderNumber = input.publicOrderNumber.trim();
  const shippingCarrier = input.shippingCarrier?.trim();
  const trackingNumber = input.trackingNumber?.trim();
  const trackingUrl = input.trackingUrl?.trim();

  if (
    !phone ||
    !customerName ||
    !publicOrderNumber ||
    !shippingCarrier ||
    !trackingNumber ||
    !trackingUrl
  ) {
    return null;
  }

  const message = [
    '¡Buenas noticias! Tu pedido ya fue procesado por el área de envíos 🚚',
    '',
    `Pedido: #${publicOrderNumber}`,
    '',
    `*Tu orden será entregada por paquetería* 👉🏻 ${shippingCarrier}`,
    '',
    `*Tu número de rastreo es* 👉🏻 ${trackingNumber}`,
    '',
    'Rastreo:',
    trackingUrl,
    '',
    'También puedes conocer más sobre plantas medicinales en nuestro blog 🌿',
    'https://www.moronelplantadelavida.com/blog',
    '',
    'Gracias por tu compra en Moronel Planta de la Vida. Te esperamos pronto 😃',
  ].join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
