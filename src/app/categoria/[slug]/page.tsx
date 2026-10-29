import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/data/categories';
import { PRODUCTS } from '@/data/products';
import { ProductCard } from '@/components/product/ProductCard';
import { canonicalAlternates } from '@/lib/site';
import { getProductCountByCategory } from '@/lib/catalog';

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

  const categoryProducts = PRODUCTS.filter(
    (product) => product.status === 'active' && product.categorySlug === slug
  );
  const productCount = getProductCountByCategory(category.slug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#6F8F69]">
        <Link href="/" className="hover:text-[#285F50]">Inicio</Link>
        <span aria-hidden="true">/</span>
        <Link href="/tienda" className="hover:text-[#285F50]">Tienda</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#23312C]">{category.name}</span>
      </nav>

      {/* Category Header Banner */}
      <div className="bg-[#285F50] text-[#FAF7E8] p-6 sm:p-10 rounded-3xl shadow-lg space-y-3 relative overflow-hidden">
        <span className="text-xs font-black uppercase tracking-widest text-[#AFC28E] block">
          {productCount} {productCount === 1 ? 'producto' : 'productos'}
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
          Productos disponibles
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
