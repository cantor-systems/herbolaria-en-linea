import { PRODUCTS } from '@/data/products';

export function getProductCountByCategory(categorySlug: string) {
  return PRODUCTS.filter(
    (product) => product.status === 'active' && product.categorySlug === categorySlug
  ).length;
}
