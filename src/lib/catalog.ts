import { PRODUCTS } from '@/data/products';
import type { Product } from '@/types';

export function getProductCountByCategory(categorySlug: string) {
  return PRODUCTS.filter(
    (product) => product.status === 'active' && product.categorySlug === categorySlug
  ).length;
}

export function getRelatedProducts(product: Product, limit = 3) {
  const activeProducts = PRODUCTS.filter(
    (candidate) => candidate.status === 'active' && candidate.id !== product.id
  );
  const sameCategory = activeProducts.filter(
    (candidate) => candidate.categorySlug === product.categorySlug
  );
  const sameBrand = activeProducts.filter(
    (candidate) =>
      candidate.categorySlug !== product.categorySlug &&
      candidate.brandSlug === product.brandSlug
  );
  const fallback = activeProducts.filter(
    (candidate) =>
      candidate.categorySlug !== product.categorySlug &&
      candidate.brandSlug !== product.brandSlug
  );

  return [...sameCategory, ...sameBrand, ...fallback].slice(0, limit);
}
