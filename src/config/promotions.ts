import { Promotion } from '@/types';

export const PROMOTIONS_ENABLED = true;

export const PROMOTIONS_CONFIG: Promotion[] = [
  {
    code: 'BF20', label: 'Buen Fin: 20% de descuento', type: 'percentage', value: 20,
    minimumSubtotalCents: 79900, enabled: true, startsAt: '2026-11-12', endsAt: '2026-11-17',
    timeZone: 'America/Mexico_City', isMock: false, requiresValidation: false,
    description: '20% en productos y paquetes visibles desde $799 MXN. No acumulable con mayoreo ni otros cupones. No aplica al envío.',
  },
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
