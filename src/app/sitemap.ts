import type { MetadataRoute } from 'next';
import { BLOG_ARTICLES } from '@/content/blog';
import { getActiveCategories } from '@/data/categories';
import { PRODUCTS } from '@/data/products';
import { absoluteUrl } from '@/lib/site';

const publicRoutes = [
  '/',
  '/tienda',
  '/contacto',
  '/conocer-moronel',
  '/conocer-moronel/moronel-te',
  '/conocer-moronel/moronel-gotas',
  '/conocer-moronel/moronel-capsulas',
  '/blog',
  '/preguntas-frecuentes',
  '/enfermedades/moronel-para-el-cancer',
  '/enfermedades/moronel-para-la-diabetes',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const categories = getActiveCategories();

  return [
    ...publicRoutes.map((path) => ({ url: absoluteUrl(path) })),
    ...categories.map((category) => ({ url: absoluteUrl(`/categoria/${category.slug}`) })),
    ...PRODUCTS.filter((product) => product.status === 'active').map((product) => ({
      url: absoluteUrl(`/producto/${product.slug}`),
    })),
    ...BLOG_ARTICLES.map((article) => ({ url: absoluteUrl(`/blog/${article.slug}`) })),
  ];
}
