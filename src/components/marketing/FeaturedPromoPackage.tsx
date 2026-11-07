'use client';

import React from 'react';
import { Gift, CheckCircle2, ShoppingBag, MessageCircle } from 'lucide-react';
import { PRODUCTS } from '@/data/products';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { getWhatsAppHref } from '@/config/store';
import { trackWhatsAppClick } from '@/lib/analytics';

export const FeaturedPromoPackage: React.FC = () => {
  const { addToCart } = useCart();
  const pkgProduct = PRODUCTS.find((p) => p.categorySlug === 'paquetes-y-promociones') || PRODUCTS[0];
  const pkgVariant = pkgProduct.variants[0];
  const whatsappHref = getWhatsAppHref();
  const isPackageOutOfStock = pkgProduct.stockStatus === 'out_of_stock';
  const comparisonPrice = pkgVariant.compareAtPriceCents;
  const hasComparisonPrice = comparisonPrice != null && comparisonPrice > pkgVariant.priceCents;
  const savingsCents = hasComparisonPrice ? comparisonPrice - pkgVariant.priceCents : 0;

  const packageIncludes = [
    '1x Frasco de Gotas Concentradas de Moronel (50 ml)',
    '1x Frasco de Cápsulas Vegetales de Moronel (60 Cápsulas)',
    '1x Bolsa de Hierba Orgánica Deshidratada (240g)',
    '1x Guía de Uso Herbolario Tradicional en Físico',
    'Envío Estándar Incluido a Todo México',
  ];

  return (
    <section id="paquete-promocional" className="my-8 mx-4 sm:mx-6 lg:mx-8 rounded-3xl border border-[#D9D1B9] bg-[#FAF7E8] text-[#23312C] shadow-sm overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 py-8 sm:p-8 lg:p-10 xl:p-12">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-x-10 xl:gap-x-12">
          {/* DOM order also provides the mobile reading order. */}
          <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1 lg:self-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D9D1B9] bg-[#F4EFD6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#285F50]">
              <Gift className="w-3.5 h-3.5 text-[#D17B24]" aria-hidden="true" />
              <span>Paquete destacado</span>
            </div>
            <h2 className="text-2xl sm:text-3xl xl:text-4xl font-semibold text-[#23312C] leading-tight tracking-tight">
              {pkgProduct.name}
            </h2>
          </div>

          <figure className="min-w-0 w-full max-w-xl mx-auto lg:max-w-none lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:self-center rounded-2xl border border-[#D9D1B9]/80 bg-[#F4EFD6] overflow-hidden shadow-sm">
            <div className="aspect-[3/4] sm:aspect-[4/5]">
              <img
                src={pkgProduct.images[0]}
                alt={pkgProduct.name}
                className="w-full h-full object-contain"
              />
            </div>
            <figcaption className="border-t border-[#D9D1B9]/60 px-4 py-3 text-center text-xs leading-relaxed text-[#53645B]">
              Paquete Herbazen · Envío Estándar Gratis
            </figcaption>
          </figure>

          <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
            <p className="text-sm sm:text-base text-[#53645B] leading-relaxed">
              Prueba todas las alternativas tradicionales de la Planta de la Vida en un solo pedido especial
              {hasComparisonPrice && <>{' con '}<strong className="font-semibold text-[#285F50]">{formatCurrency(savingsCents)} MXN de ahorro directo</strong></>}
              {' y envío estándar incluido.'}
            </p>
            <div>
              <p className="mb-3 text-sm font-semibold text-[#23312C]">
                ¿Qué incluye tu paquete?:
              </p>
              <ul className="space-y-2.5 text-sm leading-relaxed">
                {packageIncludes.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 rounded-xl border border-[#D9D1B9]/50 bg-[#F4EFD6]/65 px-3.5 py-3">
                    <CheckCircle2 className="mt-0.5 w-4 h-4 text-[#285F50] shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="min-w-0 space-y-5 border-t border-[#D9D1B9]/70 pt-5 lg:col-start-1 lg:row-start-3 lg:self-start">
            <div>
              <span className="block mb-1.5 text-xs font-medium text-[#53645B]">Precio Especial Paquete:</span>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#285F50]">
                  {formatCurrency(pkgVariant.priceCents)}
                </span>
                {hasComparisonPrice && (
                  <span className="text-sm text-[#53645B] line-through">
                    {formatCurrency(comparisonPrice)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                disabled={isPackageOutOfStock}
                onClick={() => {
                  if (!isPackageOutOfStock) {
                    addToCart(pkgProduct, pkgVariant);
                  }
                }}
                className="min-h-[48px] rounded-xl border border-[#285F50] bg-[#285F50] px-5 py-3 text-sm font-semibold text-[#FAF7E8] shadow-sm transition-colors hover:bg-[#23312C] hover:border-[#23312C] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#285F50] disabled:cursor-not-allowed disabled:border-[#CDD2C9] disabled:bg-[#E2E5DC] disabled:text-[#53645B] disabled:shadow-none"
              >
                <span className="flex items-center justify-center gap-2">
                  <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                  <span>{isPackageOutOfStock ? 'Paquete agotado' : 'Comprar Paquete'}</span>
                </span>
              </button>

              {whatsappHref && (
                <a
                  href={whatsappHref}
                  onClick={() => trackWhatsAppClick('product', { productSlug: pkgProduct.slug, placement: 'featured_package' })}
                  className="min-h-[44px] rounded-xl border border-[#D9D1B9] bg-transparent px-4 py-2.5 text-sm font-medium text-[#285F50] transition-colors hover:bg-[#F4EFD6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#285F50] flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>{isPackageOutOfStock ? 'Consultar por WhatsApp' : 'Pedir por WhatsApp'}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
