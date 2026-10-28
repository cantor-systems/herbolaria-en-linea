import { Category } from '@/types';

export const CATEGORIES: Category[] = [
  {
    id: 'cat-gotas',
    slug: 'moronel-gotas',
    name: 'Moronel en Gotas',
    subtitle: 'Extracto Líquido Concentrado',
    description:
      'Extracto hidroalcohólico de alta pureza de la Planta de la Vida. Absorción rápida y fácil dosificación diaria.',
    image:
      '/images/products/moronel-gotas-50ml.webp',
    badge: 'Más Vendido',
    status: 'active',
    sortOrder: 10,
  },
  {
    id: 'cat-herbazen',
    slug: 'herbazen',
    name: 'Herbazen',
    subtitle: 'Extractos Herbolarios en Gotas',
    description:
      'Extractos herbolarios líquidos Herbazen en presentaciones individuales de 50 ml.',
    image:
      '/images/products/plantas-colesterol-trigliceridos.webp',
    status: 'active',
    sortOrder: 20,
  },
  {
    id: 'cat-capsulas',
    slug: 'moronel-capsulas',
    name: 'Moronel en Cápsulas',
    subtitle: 'Microencapsulado Práctico',
    description:
      'Polvo microencapsulado de Moronel en cápsulas de origen vegetal. Ideal para llevar contigo a cualquier lugar.',
    image:
      '/images/products/moronel-capsulas-100.webp',
    badge: 'Popular',
    status: 'active',
    sortOrder: 30,
  },
  {
    id: 'cat-hierba',
    slug: 'moronel-hierba',
    name: 'Moronel en Hierba',
    subtitle: 'Té y Hoja Deshidratada',
    description:
      'Planta de la Vida 100% natural, seleccionada y deshidratada para infusión o preparación tradicional en agua.',
    image:
      '/images/products/moronel-hierba-deshidratada.webp',
    badge: '100% Natural',
    status: 'active',
    sortOrder: 40,
  },
  {
    id: 'cat-paquetes',
    slug: 'paquetes-y-promociones',
    name: 'Paquetes y Promociones',
    subtitle: 'Kits y Ahorro Familiar',
    description:
      'Combos combinados que unen gotas, cápsulas y hierba con descuentos exclusivos y envío estándar gratis.',
    image:
      '/images/products/moronel-paquete-integral.webp',
    badge: 'Máximo Ahorro',
    status: 'active',
    sortOrder: 50,
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
