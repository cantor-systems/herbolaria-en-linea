export type AdminNavigationIcon =
  | 'overview'
  | 'orders'
  | 'payments'
  | 'shipping'
  | 'sellers'
  | 'activity'
  | 'manual';

export type AdminModuleAvailability =
  | 'available'
  | 'existing'
  | 'planned'
  | 'blocked_012'
  | 'blocked_013';

export interface AdminNavigationItem {
  id: string;
  label: string;
  description: string;
  icon: AdminNavigationIcon;
  availability: AdminModuleAvailability;
  href?: string;
}

export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = Object.freeze([
  {
    id: 'overview',
    label: 'Resumen DEMO',
    description: 'Vista local sin datos reales',
    icon: 'overview',
    availability: 'available',
    href: '/operaciones/admin-demo',
  },
  {
    id: 'orders',
    label: 'Pedidos',
    description: 'Próxima fase',
    icon: 'orders',
    availability: 'planned',
  },
  {
    id: 'payments',
    label: 'Pagos',
    description: 'Próxima fase',
    icon: 'payments',
    availability: 'planned',
  },
  {
    id: 'shipping',
    label: 'Envíos',
    description: 'Módulo actual de despacho',
    icon: 'shipping',
    availability: 'existing',
    href: '/operaciones/despacho',
  },
  {
    id: 'sellers',
    label: 'Vendedores',
    description: 'Requiere 012 y 013',
    icon: 'sellers',
    availability: 'blocked_013',
  },
  {
    id: 'activity',
    label: 'Actividad',
    description: 'Cobertura futura',
    icon: 'activity',
    availability: 'planned',
  },
  {
    id: 'manual',
    label: 'Pedido manual',
    description: 'Requiere migración 012',
    icon: 'manual',
    availability: 'blocked_012',
  },
]);
