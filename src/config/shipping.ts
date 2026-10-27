import { ShippingConfig } from '@/types';

export const SHIPPING_CONFIG: ShippingConfig = {
  coverage: 'Envíos a todo México con cobertura nacional',
  freeShippingThresholdCents: 79900,
  standardShippingCents: 9900,
  expressShippingCents: 18600,
  expressUpgradeCents: 7900,
  currency: 'MXN',
  enabled: true,
  standardEstimatedDays: '4–5 días hábiles',
  expressEstimatedDays: '1–2 días hábiles',
  couriers: ['FedEx', 'DHL', 'Estafeta', 'Redpack'],
  trackingAvailable: true,
  isMock: false,
  requiresValidation: false,
  disclaimer:
    'Los tiempos de entrega son estimaciones sujetas a disponibilidad y zona postal de la paquetería.',
};
