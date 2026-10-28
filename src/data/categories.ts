import { Category } from '@/types';

export const CATEGORIES: Category[] = [
  {
    id: 'cat-extractos-gotas',
    slug: 'extractos-y-gotas',
    name: 'Extractos y gotas',
    subtitle: 'Presentaciones líquidas',
    description:
      'Productos herbolarios en presentación líquida y frascos con gotero para una dosificación práctica.',
    image:
      '/images/products/moronel-gotas-50ml.webp',
    status: 'active',
    sortOrder: 10,
  },
  {
    id: 'cat-capsulas',
    slug: 'capsulas',
    name: 'Cápsulas',
    subtitle: 'Presentaciones encapsuladas',
    description:
      'Productos herbolarios en cápsulas, disponibles en presentaciones individuales y paquetes.',
    image:
      '/images/products/moronel-capsulas-100.webp',
    status: 'active',
    sortOrder: 20,
  },
  {
    id: 'cat-hierbas-infusiones',
    slug: 'hierbas-e-infusiones',
    name: 'Hierbas e infusiones',
    subtitle: 'Hierbas deshidratadas',
    description:
      'Hierbas deshidratadas para infusiones y preparaciones tradicionales en agua.',
    image:
      '/images/products/moronel-hierba-deshidratada.webp',
    status: 'active',
    sortOrder: 30,
  },
  {
    id: 'cat-paquetes',
    slug: 'paquetes-y-promociones',
    name: 'Paquetes y promociones',
    subtitle: 'Kits y Ahorro Familiar',
    description:
      'Combos combinados que unen gotas, cápsulas y hierba con descuentos exclusivos y envío estándar gratis.',
    image:
      '/images/products/moronel-paquete-integral.webp',
    badge: 'Máximo Ahorro',
    status: 'active',
    sortOrder: 40,
  },
];

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function getActiveCategories() {
  return CATEGORIES.filter((category) => category.status === 'active').sort(
    (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
  );
}
