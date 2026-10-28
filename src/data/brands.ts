import type { Brand } from '@/types';

export const BRANDS: Brand[] = [
  {
    id: 'brand-herbazen',
    slug: 'herbazen',
    name: 'Herbazen',
    description:
      'Marca de productos herbolarios con presentaciones en extractos, cápsulas, hierba y paquetes.',
    status: 'active',
    sortOrder: 10,
  },
];

export function getBrandBySlug(slug: string) {
  return BRANDS.find((brand) => brand.slug === slug);
}

export function getActiveBrands() {
  return BRANDS.filter((brand) => brand.status === 'active').sort(
    (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
  );
}
