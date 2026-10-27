import { StoreConfig } from '@/types';

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') ?? '';

export const STORE_CONFIG: StoreConfig = {
  storeName: 'Moronel Planta de la Vida',
  brandName: 'Herbazen',
  tagline: 'Herbolaria Tradicional de Calidad Superior',
  description:
    'Tienda oficial para la compra directa de Moronel Planta de la Vida en presentaciones en gotas, capsulas y hierba deshidratada bajo la marca Herbazen.',
  contact: {
    whatsapp: { value: whatsappNumber || null, enabled: whatsappNumber.length > 0 },
    email: { value: null, enabled: false },
    businessHours: { value: null, enabled: false },
    location: { value: null, enabled: false },
  },
  payments: {
    paymentsEnabled: false,
    paymentProvider: null,
    paymentMode: 'demo',
  },
  logo: {
    text: 'Moronel',
    tagline: 'Planta de la Vida',
  },
};

export const getWhatsAppHref = (message = '') => {
  const { whatsapp } = STORE_CONFIG.contact;
  return whatsapp.enabled && whatsapp.value
    ? `https://wa.me/${whatsapp.value}${message ? `?text=${encodeURIComponent(message)}` : ''}`
    : null;
};
