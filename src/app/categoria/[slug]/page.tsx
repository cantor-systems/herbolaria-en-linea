import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/data/categories';
import { PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/product/ProductCard';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { canonicalAlternates } from '@/lib/site';

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  return {
    title: category.name,
    description: category.description,
    ...canonicalAlternates(`/categoria/${category.slug}`),
    openGraph: {
      type: 'website',
      title: category.name,
      description: category.description,
      url: `/categoria/${category.slug}`,
      ...(category.image
        ? { images: [{ url: category.image, alt: category.name }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: category.name,
      description: category.description,
      ...(category.image ? { images: [category.image] } : {}),
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const categoryProducts = PRODUCTS.filter((p) => p.categorySlug === slug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Category Header Banner */}
      <div className="bg-[#285F50] text-[#FAF7E8] p-6 sm:p-10 rounded-3xl shadow-lg space-y-3 relative overflow-hidden">
        <Link
          href="/tienda"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D17B24] hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la Tienda</span>
        </Link>

        <span className="text-xs font-black uppercase tracking-widest text-[#AFC28E] block">
          Categoría de productos
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">
          {category.name}
        </h1>
        <p className="text-xs sm:text-sm text-[#FAF7E8]/90 max-w-2xl leading-relaxed">
          {category.description}
        </p>
      </div>

      {/* Products in this category */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#23312C]">
          Presentaciones disponibles en {category.name}:
        </h2>

        {categoryProducts.length === 0 ? (
          <div className="p-8 text-center bg-[#FAF7E8] rounded-2xl border border-[#D9D1B9] text-xs text-[#6F8F69]">
            No hay productos disponibles en esta categoría actualmente.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoryProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
