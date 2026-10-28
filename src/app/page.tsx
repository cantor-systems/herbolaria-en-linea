import Link from 'next/link';
import { HeroBanner } from '@/components/marketing/HeroBanner';
import { ProductGrid } from '@/components/product/ProductGrid';
import { CATEGORIES } from '@/data/categories';
import { PRODUCTS } from '@/data/products';
import { HowToBuySteps } from '@/components/marketing/HowToBuySteps';
import { TrustBar } from '@/components/store/TrustBar';
import { EducationalSection } from '@/components/marketing/EducationalSection';
import { FeaturedPromoPackage } from '@/components/marketing/FeaturedPromoPackage';
import { FAQSection } from '@/components/marketing/FAQSection';
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection';
import { RatingsBreakdown } from '@/components/marketing/RatingsBreakdown';
import { ClaimsBanner } from '@/components/marketing/ClaimsBanner';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { ArrowRight, Sparkles, Leaf } from 'lucide-react';
import type { Metadata } from 'next';
import { canonicalAlternates } from '@/lib/site';

export const metadata: Metadata = { ...canonicalAlternates('/') };

export default function HomePage() {
  return (
    <div className="space-y-6 sm:space-y-12">
      {/* 1. Hero Section */}
      <HeroBanner />

      {/* 2. Categories Grid */}
      <section id="presentaciones" className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <span className="text-xs font-extrabold text-[#D17B24] uppercase tracking-wider block">
            Presentaciones Herbolarias Herbazen
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23312C]">
            Elige la forma de consumir Moronel que mejor se adapta a ti
          </h2>
          <p className="text-xm text-[#6F8F69] font-medium">
            Explora las categorías y presentaciones disponibles en nuestro catálogo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.map((cat) => (
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
                {cat.badge && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D17B24] text-white shadow-sm">
                    {cat.badge}
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-[#6F8F69] uppercase tracking-wider block mb-1">
                    {cat.subtitle}
                  </span>
                  <h3 className="font-extrabold text-[#23312C] text-lg group-hover:text-[#285F50] transition-colors leading-snug">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#6F8F69] line-clamp-2 mt-1.5 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#D9D1B9]/60 flex items-center justify-between text-xs font-bold text-[#285F50]">
                  <span>Ver Presentación</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Products */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4 border-b border-[#D9D1B9] pb-4">
          <div>
            <span className="text-xs font-extrabold text-[#D17B24] uppercase tracking-wider block mb-1">
              Catálogo Destacado
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23312C]">
              Productos Moronel Planta de la Vida
            </h2>
          </div>

          <Link
            href="/tienda"
            className="text-xs font-extrabold text-[#285F50] hover:text-[#23312C] flex items-center gap-1 bg-[#F4EFD6] px-4 py-2 rounded-xl border border-[#D9D1B9] transition-colors"
          >
            <span>Ver Catálogo Completo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <ProductGrid products={PRODUCTS} />
      </section>

      {/* 4. Featured Promo Package */}
      <FeaturedPromoPackage />

      {/* 5. How To Buy Steps */}
      <HowToBuySteps />

      {/* 6. Trust Bar */}
      <TrustBar />

      {/* 7. Educational Section */}
      <EducationalSection />

      {/* 8. FAQ Section */}
      <FAQSection />

      {/* 9. Ratings & Testimonials */}
      <RatingsBreakdown />
      <TestimonialsSection />

      {/* 10. Sanitary Claims Banner */}
      <ClaimsBanner />

      {/* 11. Final CTA */}
      <FinalCTA />
    </div>
  );
}
