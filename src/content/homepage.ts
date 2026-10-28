import { SHIPPING_CONFIG } from '@/config/shipping';
import { STORE_CONFIG } from '@/config/store';

export const HOMEPAGE_CONTENT = {
  hero: {
    eyebrow: 'Moronel Planta de la vida',
    h1: 'Moronel en distintas presentaciones, directo hasta tu hogar',
    subtitle:
      'Té, gotas o cápsulas: tú eliges cómo integrar Moronel a tu vida.',
    ctaPrimary: {
      text: 'Ver productos',
      href: '/tienda',
    },
    ctaSecondary: {
      text: 'Conocer Moronel',
      href: '#presentaciones',
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
    title: '¿Qué es Moronel (Planta de la Vida)?',
    subtitle: 'Historia, tradición herbolaria y preservación de fitoactivos',
    content: [
      'Conocida popularmente como Planta de la Vida o Moronel (lonicera subspicata var. denudata), es una especie apreciada en la herbolaria mexicana por su vitalidad y sus usos tradicionales.',
      'Los productos Moronel están disponibles en extracto concentrado en gotas, cápsulas y hierba deshidratada.',
      'Estas presentaciones ofrecen distintas opciones de preparación, almacenamiento y portabilidad.',
    ],
  },
  howToBuySteps: [
    {
      step: '01',
      title: 'Elige tu presentación',
      description: 'Selecciona entre Gotas, Cápsulas, Hierba o nuestro Paquete Promocional.',
    },
    {
      step: '02',
      title: 'Completa tus datos',
      description: 'Ingresa tu dirección de entrega en México y tus datos de contacto.',
    },
    {
      step: '03',
      title: 'Paga de forma segura',
      description: 'Haz tu pago con tarjeta o en efectivo',
    },
    {
      step: '04',
      title: 'Recibe seguimiento',
      description: 'Podrás rastrear tu pedido con el número de guía de tu orden',
    },
  ],
  faq: [
    {
      question: '¿Qué presentación debo elegir?',
      answer:
        'Si buscas máxima rapidez de ingesta y asimilación, te recomendamos las Gotas concentradas. Si prefieres evitar cualquier sabor y llevarlas contigo a cualquier parte, las Cápsulas son ideales. Si disfrutas la preparación ritual de té o infusión, la Hierba deshidratada es perfecta.',
    },
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
