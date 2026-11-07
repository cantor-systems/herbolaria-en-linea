import { SHIPPING_CONFIG } from '@/config/shipping';
import { STORE_CONFIG } from '@/config/store';

export const HOME_FAQ_SECTION = {
  eyebrow: 'INFORMACIÓN DE COMPRA',
  title: 'Preguntas frecuentes sobre compras en línea',
  subtitle: 'Consulta información sobre pagos, envíos, rastreo y canales de atención.',
} as const;

// Home-only content: the internal FAQ page and its structured data keep their
// existing source in HOMEPAGE_CONTENT.faq. Payment methods confirmed by owner.
export const HOME_FAQ_ITEMS = [
  {
    question: '¿Cómo realizo el pago de mi pedido?',
    answer:
      'El pago se procesa de forma segura mediante Mercado Pago. Al continuar con tu compra podrás elegir entre pago en efectivo, transferencia bancaria y tarjeta de crédito o débito, según las opciones disponibles al momento del pago.',
  },
  {
    question: '¿Es segura la compra?',
    answer:
      'Sí. Tu compra se procesa a través de una plataforma de pago segura y confiable. Además, recibirás confirmación de tu pedido y, una vez enviado, podrás dar seguimiento a la información de rastreo correspondiente.',
  },
  {
    question: '¿En cuánto tiempo llega mi pedido?',
    // Only format the range punctuation; durations remain configuration-driven.
    answer:
      `El envío estándar tiene un tiempo estimado de ${SHIPPING_CONFIG.standardEstimatedDays.replace('–', ' a ')} y el envío exprés de ${SHIPPING_CONFIG.expressEstimatedDays.replace('–', ' a ')}. Los tiempos pueden variar según la cobertura de la paquetería y el destino de entrega.`,
  },
  {
    question: '¿Cómo recibo mi número de guía de rastreo?',
    answer:
      'Cuando tu pedido sea enviado, recibirás la información de rastreo por correo electrónico y, si corresponde, también por WhatsApp, para que puedas dar seguimiento a tu envío.',
  },
  {
    question: '¿Puedo realizar mi compra directamente por WhatsApp?',
    // Manual sales are confirmed, but the public contact channel is currently
    // disabled. Do not announce it as available until its configuration agrees.
    answer: STORE_CONFIG.contact.whatsapp.enabled
      ? 'Sí. También puedes realizar tu compra por WhatsApp, donde un agente puede ayudarte con la atención, resolver tus dudas y dar seguimiento a tu pedido.'
      : 'El canal de WhatsApp no está disponible actualmente. Consulta los canales habilitados en la página de contacto.',
  },
] as const;
