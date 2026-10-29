import { SHIPPING_CONFIG } from '@/config/shipping';
import { STORE_CONFIG } from '@/config/store';

export const HOMEPAGE_CONTENT = {
  hero: {
    eyebrow: 'Herbolaria en Línea',
    h1: 'Productos herbolarios para comprar en línea',
    subtitle:
      'Explora extractos, cápsulas, hierbas y paquetes seleccionados en un solo lugar.',
    ctaPrimary: {
      text: 'Ver productos',
      href: '/tienda',
    },
    ctaSecondary: {
      text: 'Explorar categorías',
      href: '#categorias',
    },
  },
  benefits: [
    {
      icon: 'Truck',
      title: 'Envíos a todo México',
      description: 'Guía de rastreo disponible al habilitar el servicio de envíos.',
    },
    {
      icon: 'ShieldCheck',
      title: 'Pago en línea',
      description: 'Pago procesado de forma segura mediante Mercado Pago.',
    },
    {
      icon: 'Leaf',
      title: 'Herbolaria Pura',
      description: 'Planta de la Vida en frasco ámbar y empaque kraft.',
    },
    {
      icon: 'MessageSquare',
      title: 'Atención Personalizada',
      description: STORE_CONFIG.contact.whatsapp.enabled
        ? 'Atención disponible mediante WhatsApp.'
        : 'Consulta los canales disponibles en la página de contacto.',
    },
  ],
  educational: {
    title: 'Conoce más sobre Moronel',
    subtitle: 'Historia, presentaciones y tradición herbolaria',
    content: [
      'Conocida popularmente como Planta de la Vida o Moronel (Lonicera subspicata var. denudata), esta especie forma parte de la tradición herbolaria mexicana.',
      'Los productos Moronel están disponibles en extracto concentrado en gotas, cápsulas y hierba deshidratada.',
      'Estas presentaciones ofrecen distintas opciones de preparación, almacenamiento y portabilidad.',
    ],
  },
  howToBuySteps: [
    {
      step: '01',
      title: 'Elige productos',
      description: 'Explora el catálogo y agrega al carrito las presentaciones que prefieras.',
    },
    {
      step: '02',
      title: 'Revisa tu carrito',
      description: 'Confirma productos, cantidades y opciones disponibles antes de continuar.',
    },
    {
      step: '03',
      title: 'Paga en línea',
      description: 'Completa tus datos y realiza el pago mediante Mercado Pago.',
    },
    {
      step: '04',
      title: 'Recibe y rastrea tu pedido',
      description: 'Consulta el estado de tu compra y la guía cuando el pedido sea enviado.',
    },
  ],
  faq: [
    {
      question: '¿Cómo realizo el pago de mi pedido?',
      answer:
        'El pago se procesa de forma segura mediante Mercado Pago. Los métodos disponibles se muestran directamente al continuar con el pago.',
    },
    {
      question: '¿En cuánto tiempo llega mi pedido?',
      answer:
        `El envío estándar tiene un tiempo estimado de ${SHIPPING_CONFIG.standardEstimatedDays} y el envío exprés de ${SHIPPING_CONFIG.expressEstimatedDays}. Los tiempos están sujetos a disponibilidad y cobertura de la paquetería.`,
    },
    {
      question: '¿Cómo recibo mi número de guía de rastreo?',
      answer:
        'Cuando el pedido sea enviado, recibirás la información de rastreo por correo electrónico y, si lo autorizaste, también por WhatsApp.',
    },
    {
      question: '¿Puedo realizar mi compra directamente por WhatsApp?',
      answer: STORE_CONFIG.contact.whatsapp.enabled
        ? 'Sí. Puedes solicitar atención por WhatsApp mediante los enlaces disponibles en el sitio.'
        : 'El canal de WhatsApp no está disponible actualmente. Consulta los canales habilitados en la página de contacto.',
    },
  ],
};
