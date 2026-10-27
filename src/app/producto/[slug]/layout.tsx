import type { Metadata } from 'next';
import { PRODUCTS } from '@/data/products';
import { canonicalAlternates, DEFAULT_OG_IMAGE } from '@/lib/site';

type ProductLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const product = PRODUCTS.find((item) => item.slug === slug);

  if (!product) return { title: 'Producto no encontrado' };

  const image = product.images[0] || DEFAULT_OG_IMAGE;
  return {
    title: product.name,
    description: product.shortDescription,
    ...canonicalAlternates(`/producto/${product.slug}`),
    openGraph: {
      type: 'website',
      title: product.name,
      description: product.shortDescription,
      url: `/producto/${product.slug}`,
      images: [{ url: image, alt: product.name }],
    },
    twitter: { card: 'summary_large_image', title: product.name, description: product.shortDescription, images: [image] },
  };
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return children;
}
