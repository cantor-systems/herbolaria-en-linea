import { Promotion } from '@/types';

export const PROMOTIONS_ENABLED = true;

export const PROMOTIONS_CONFIG: Promotion[] = [
  {
    code: 'MORONEL15',
    label: '15% de descuento',
    type: 'percentage',
    value: 15,
    minimumSubtotalCents: 50000,
    enabled: true,
    endsAt: '2026-09-30',
    timeZone: 'America/Mexico_City',
    isMock: false,
    requiresValidation: false,
    description: '15% de descuento en productos a partir de $500 MXN.',
  },
];
