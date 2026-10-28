'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, MessageCircle, ShieldCheck, Star, ArrowRight, Truck } from 'lucide-react';
import { HOMEPAGE_CONTENT } from '@/content/homepage';
import { PRODUCTS } from '@/data/products';
import { getBrandBySlug } from '@/data/brands';
import { getCategoryBySlug } from '@/data/categories';
import { SHOW_MOCK_RATINGS } from '@/data/ratings';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

export const HeroBanner: React.FC = () => {
  const { addToCart } = useCart();
  const featuredProduct = PRODUCTS.find((p) => p.featured) || PRODUCTS[0];
  const featuredBrandName =
    getBrandBySlug(featuredProduct.brandSlug)?.name ?? featuredProduct.brandSlug;
  const featuredCategoryName =
    getCategoryBySlug(featuredProduct.categorySlug)?.name ?? featuredProduct.categorySlug;
  const featuredVariant =
    featuredProduct.variants.find((v) => v.isPopular) || featuredProduct.variants[0];
  const isFeaturedProductOutOfStock = featuredProduct.stockStatus === 'out_of_stock';

  return (
    <section className="bg-gradient-to-b from-[#F4EFD6] via-[#FAF7E8] to-[#FAF7E8] py-8 lg:py-16 border-b border-[#D9D1B9] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column (55% on desktop: 7 cols) */}
          <div className="lg:col-span-7 space-y-6 text-left">

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#285F50]/10 border border-[#285F50]/20 text-[#285F50] text-xs font-extrabold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#D17B24] animate-ping" />
              <span>{HOMEPAGE_CONTENT.hero.eyebrow}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#111f1a] tracking-normal leading-[1.0]">
              {HOMEPAGE_CONTENT.hero.h1}
            </h1>

            <p className="text-xl sm:text-2xl lg:text-3xl text-[#23312C]/80 font-bold leading-normal max-w-2xl">
              {HOMEPAGE_CONTENT.hero.subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href={HOMEPAGE_CONTENT.hero.ctaPrimary.href}
                className="py-3.5 px-8 bg-[#285F50] hover:bg-[#23312C] text-[#FAF7E8] font-extrabold text-xl rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                <span>{HOMEPAGE_CONTENT.hero.ctaPrimary.text}</span>
                <ArrowRight className="w-5 h-5 text-[#D17B24]" />
              </Link>

              <a
                href={HOMEPAGE_CONTENT.hero.ctaSecondary.href}
                className="py-3.5 px-6 border-2 border-[#D9D1B9] text-[#23312C] hover:bg-[#F4EFD6] hover:border-[#285F50] font-bold text-base rounded-2xl text-center transition-all min-h-[48px] flex items-center justify-center"
              >
                {HOMEPAGE_CONTENT.hero.ctaSecondary.text}
              </a>
            </div>

            {/* Quick Micro trust tags */}
            <div className="pt-4 flex flex-wrap items-center gap-4 text-xl font-semibold text-[#6F8F69]">
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#D17B24]" />
                <span>Envíos a todo México</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#285F50]" />
                <span>Pagos seguros</span>
              </div>
            </div>

          </div>

          {/* Right Column Promotional Card (45% on desktop: 5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-[#FAF7E8] border-2 border-[#D9D1B9] rounded-3xl p-5 sm:p-6 shadow-xl relative group">
              <div className="absolute top-0 right-0 z-20 bg-[#D17B24] text-white text-xs font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider shadow-sm">
                PRODUCTO DESTACADO
              </div>

              {SHOW_MOCK_RATINGS && <div className="flex items-center gap-2 mb-3 text-amber-600">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current text-amber-500" />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#23312C]">{featuredProduct.rating} / 5.0</span>
                <span className="text-xs text-[#6F8F69]">({featuredProduct.reviewCount} reseñas)</span>
              </div>}

              <div className="aspect-4/3 rounded-2xl overflow-hidden mb-4 border border-[#D9D1B9] bg-[#F4EFD6] relative z-0">
                <img
                  src={featuredProduct.images[0]}
                  alt={featuredProduct.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute bottom-3 left-3 bg-[#285F50] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  {featuredBrandName}
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="font-extrabold text-[#23312C] text-lg leading-snug">
                  {featuredProduct.name}
                </h3>

                <p className="text-sm text-[#6F8F69] leading-relaxed">
                  Información de la presentación: {featuredCategoryName}.
                </p>

                <div className="flex items-baseline justify-between bg-[#F4EFD6] p-3 rounded-xl border border-[#D9D1B9]">
                  <div>
                    <span className="text-xs text-[#6F8F69] block font-medium">
                      {featuredVariant.name}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-[#285F50]">
                        {formatCurrency(featuredVariant.priceCents)}
                      </span>
                      {featuredVariant.compareAtPriceCents && (
                        <span className="text-xs text-[#23312C]/60 line-through">
                          {formatCurrency(featuredVariant.compareAtPriceCents)}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-extrabold text-[#98552B] bg-[#98552B]/10 px-2.5 py-1 rounded-lg">
                    {featuredVariant.badge}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    disabled={isFeaturedProductOutOfStock}
                    onClick={() => {
                      if (!isFeaturedProductOutOfStock) {
                        addToCart(featuredProduct, featuredVariant);
                      }
                    }}
                    className="py-3 px-4 bg-[#285F50] hover:bg-[#23312C] text-[#FAF7E8] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98 min-h-[44px] disabled:cursor-not-allowed disabled:bg-[#23312C]/45 disabled:shadow-none"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D17B24]" />
                    <span>{isFeaturedProductOutOfStock ? 'Agotado' : 'Agregar al Carrito'}</span>
                  </button>

                  <Link
                    href={`/producto/${featuredProduct.slug}`}
                    className="py-3 px-4 border border-[#285F50] text-[#285F50] hover:bg-[#285F50]/10 font-bold text-xs rounded-xl text-center transition-colors flex items-center justify-center gap-1 min-h-[44px]"
                  >
                    <span>Detalles del Producto</span>
                  </Link>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
