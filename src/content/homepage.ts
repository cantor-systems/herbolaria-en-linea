import { SHIPPING_CONFIG } from '@/config/shipping';
import { STORE_CONFIG } from '@/config/store';

export const HOMEPAGE_CONTENT = {
  hero: {
    eyebrow: 'Herbolaria en Línea',
    h1: 'Lo mejor de la herbolaria, en un solo lugar.',
    subtitle:
      'Plantas medicinales, extractos y suplementos herbolarios cuidadosamente seleccionados. Compra fácilmente y recibe en todo México.',
    ctaPrimary: {
      text: 'Ver productos',
      href: '/tienda',
    },
    ctaSecondary: {
      text: 'Explorar categorías',
      href: '#categorias',
    },
  },
  featuredProducts: {
    eyebrow: 'Nuestra selección',
    title: 'Descubre nuestros productos destacados',
    subtitle: 'Explora una selección de productos herbolarios y conoce las distintas opciones que tenemos para ti.',
    ctaText: 'Explorar catálogo',
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
    eyebrow: 'Conocimiento herbolario',
    title: 'Descubre el mundo de las plantas medicinales',
    subtitle: 'Historia, tradición y conocimiento botánico.',
    introduction:
      'Explora el conocimiento tradicional de las plantas medicinales, sus características y las distintas formas en que han sido utilizadas a lo largo del tiempo.',
    cta: { text: 'Leer artículos', href: '/blog' },
    // Existing botanical panorama, provisionally authorized for Production in
    // HERB-WEB-001. See docs/promotional-slider.md; not final photography.
    image: {
      src: '/images/banners/herbal-editorial.webp',
      alt: 'Detalle de hojas verde grisáceas con un fondo natural desenfocado.',
      width: 2245,
      height: 1035,
    },
  },
  howToBuySteps: [
    {
      step: '01',
      title: 'Elige tus productos',
      description: 'Explora el catálogo y selecciona las presentaciones que mejor se adapten a tus necesidades.',
    },
    {
      step: '02',
      title: 'Revisa tu pedido',
      description: 'Confirma productos, cantidades y opciones disponibles antes de continuar.',
    },
    {
      step: '03',
      title: 'Paga de forma segura',
      description: 'Completa tus datos y realiza tu pago en línea mediante Mercado Pago.',
    },
    {
      step: '04',
      title: 'Recibe y rastrea',
      description: 'Da seguimiento a tu compra y consulta tu guía cuando tu pedido haya sido enviado.',
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
