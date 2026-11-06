import Link from 'next/link';
import { HeroBanner } from '@/components/marketing/HeroBanner';
import { PromotionalSlider } from '@/components/marketing/PromotionalSlider';
import { PROMOTIONAL_SLIDES, allowPromotionalPreview, selectPromotionalSlides } from '@/content/promotional-slides';
import { ProductGrid } from '@/components/product/ProductGrid';
import { getActiveCategories } from '@/data/categories';
import { HOME_CATEGORY_CARDS, HOME_CATEGORY_SECTION } from '@/content/home-categories';
import { HowToBuySteps } from '@/components/marketing/HowToBuySteps';
import { TrustBar } from '@/components/store/TrustBar';
import { EducationalSection } from '@/components/marketing/EducationalSection';
import { FeaturedPromoPackage } from '@/components/marketing/FeaturedPromoPackage';
import { FAQSection } from '@/components/marketing/FAQSection';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { canonicalAlternates } from '@/lib/site';
import { getFeaturedProducts } from '@/lib/catalog';

export const metadata: Metadata = { ...canonicalAlternates('/') };
// Re-evaluate optional campaign windows without changing other pages.
export const revalidate = 60;

export default function HomePage() {
  const activeCategories = getActiveCategories();
  const featuredProducts = getFeaturedProducts(4);
  const promotionalSlides = selectPromotionalSlides(PROMOTIONAL_SLIDES, {
    allowPreview: allowPromotionalPreview(process.env.NODE_ENV, process.env.VERCEL_ENV),
  });

  return (
    <div className="space-y-6 sm:space-y-12">
      {promotionalSlides.length > 0 && <PromotionalSlider slides={promotionalSlides} />}
      {/* 1. Hero Section */}
      <HeroBanner />

      {/* 2. Essential Trust */}
      <TrustBar />

      {/* 3. Categories Grid */}
      <section id="categorias" className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <span className="text-xs font-extrabold text-[#D17B24] uppercase tracking-wider block">
            {HOME_CATEGORY_SECTION.eyebrow}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23312C]">
            {HOME_CATEGORY_SECTION.title}
          </h2>
          <p className="text-sm text-[#6F8F69] font-medium">
            {HOME_CATEGORY_SECTION.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="bg-[#FAF7E8] border border-[#D9D1B9] rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all group flex flex-col justify-between"
            >
              <div className="aspect-4/3 overflow-hidden bg-[#F4EFD6] relative">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-[#6F8F69] uppercase tracking-wider block mb-1">
                    {HOME_CATEGORY_CARDS[cat.id].microLabel}
                  </span>
                  <h3 className="font-extrabold text-[#23312C] text-lg group-hover:text-[#285F50] transition-colors leading-snug">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#6F8F69] mt-1.5 leading-relaxed">
                    {HOME_CATEGORY_CARDS[cat.id].description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#D9D1B9]/60 flex items-center justify-between text-xs font-bold text-[#285F50]">
                  <span>{HOME_CATEGORY_CARDS[cat.id].ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Featured Products */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <span className="text-xs font-extrabold text-[#D17B24] uppercase tracking-wider block mb-1">
            Selección del catálogo
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23312C]">
            Productos destacados
          </h2>
          <p className="text-sm text-[#6F8F69] font-medium">
            Conoce una selección de productos disponibles para comprar en línea.
          </p>
        </div>

        <ProductGrid products={featuredProducts} />

        <div className="mt-8 flex justify-center">
          <Link
            href="/tienda"
            className="min-h-[44px] text-sm font-extrabold text-[#285F50] hover:text-[#23312C] inline-flex items-center justify-center gap-2 bg-[#F4EFD6] px-5 py-3 rounded-xl border border-[#D9D1B9] transition-colors"
          >
            <span>Ver todo el catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 5. Featured Promo Package */}
      <FeaturedPromoPackage />

      {/* 6. How To Buy Steps */}
      <HowToBuySteps />

      {/* 7. Educational Content */}
      <EducationalSection />

      {/* 8. FAQ Section */}
      <FAQSection />

      {/* 9. Final CTA */}
      <FinalCTA />
    </div>
  );
}
