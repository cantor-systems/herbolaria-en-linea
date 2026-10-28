import { StoreConfig } from '@/types';

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') ?? '';

export const STORE_CONFIG: StoreConfig = {
  storeName: 'Herbolaria en Línea',
  brandName: 'Herbolaria en Línea',
  tagline: 'Herbolaria Tradicional de Calidad Superior',
  description:
    'Tienda en línea de productos herbolarios de distintas marcas y categorías.',
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
    text: 'Herbolaria',
    tagline: 'en Línea',
  },
};

export const getWhatsAppHref = (message = '') => {
  const { whatsapp } = STORE_CONFIG.contact;
  return whatsapp.enabled && whatsapp.value
    ? `https://wa.me/${whatsapp.value}${message ? `?text=${encodeURIComponent(message)}` : ''}`
    : null;
};
