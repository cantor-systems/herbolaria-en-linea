'use client';

import React from 'react';
import Link from 'next/link';
import { Gift, CheckCircle2, ShoppingBag, MessageCircle, ArrowRight } from 'lucide-react';
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

  const packageIncludes = [
    '1x Frasco de Gotas Concentradas de Moronel (50 ml)',
    '1x Frasco de Cápsulas Vegetales de Moronel (60 Cápsulas)',
    '1x Bolsa de Hierba Orgánica Deshidratada (240g)',
    '1x Guía de Uso Herbolario Tradicional en Físico',
    'Envío Estándar Incluido a Todo México',
  ];

  return (
    <section id="paquete-promocional" className="py-12 bg-gradient-to-r from-[#285F50] to-[#23312C] text-[#FAF7E8] my-8 rounded-3xl mx-4 sm:mx-6 lg:mx-8 shadow-2xl overflow-hidden border border-[#D17B24]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Text & Breakdown */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D17B24] text-white text-xs font-black uppercase tracking-wider">
              <Gift className="w-4 h-4" />
              <span>Paquete Ahorro Familiar</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FAF7E8] leading-tight">
              {pkgProduct.name}
            </h2>

            <p className="text-sm sm:text-base text-[#FAF7E8]/90 leading-relaxed">
              Prueba todas las alternativas tradicionales de la Planta de la Vida en un solo pedido especial con <strong className="text-[#D17B24]">$93 MXN de ahorro directo</strong> y envío estándar incluido.
            </p>

            {/* Checklist */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#AFC28E]">
                ¿Qué incluye tu paquete?:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                {packageIncludes.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-black/20 p-2.5 rounded-xl border border-white/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-[#FAF7E8]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing & CTAs */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="bg-[#FAF7E8] text-[#23312C] p-3.5 rounded-2xl border border-[#D9D1B9] shrink-0">
                <span className="text-[10px] font-extrabold uppercase text-[#D17B24] block">
                  Precio Especial Paquete:
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#285F50]">
                    {formatCurrency(pkgVariant.priceCents)}
                  </span>
                  {pkgVariant.compareAtPriceCents && (
                    <span className="text-xs text-[#23312C]/60 line-through">
                      {formatCurrency(pkgVariant.compareAtPriceCents)}
                    </span>
                  )}
                </div>
              </div>

              <div className={`flex-1 grid grid-cols-1 gap-2 ${whatsappHref ? 'sm:grid-cols-2' : ''}`}>
                <button
                  disabled={isPackageOutOfStock}
                  onClick={() => {
                    if (!isPackageOutOfStock) {
                      addToCart(pkgProduct, pkgVariant);
                    }
                  }}
                  className="py-3 px-4 bg-[#D17B24] hover:bg-[#98552B] text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 min-h-[48px] disabled:cursor-not-allowed disabled:bg-[#98552B]/60 disabled:shadow-none"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isPackageOutOfStock ? 'Paquete agotado' : 'Comprar Paquete'}</span>
                </button>

                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    onClick={() => trackWhatsAppClick('product', { productSlug: pkgProduct.slug, placement: 'featured_package' })}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {isPackageOutOfStock ? 'Consultar por WhatsApp' : 'Pedir por WhatsApp'}
                    </span>
                  </a>
                )}
              </div>
            </div>

          </div>

          {/* Right Image Display */}
          <div className="lg:col-span-5">
            <div className="aspect-4/3 rounded-2xl overflow-hidden border-2 border-[#D17B24] shadow-2xl relative bg-[#FAF7E8]">
              <img
                src={pkgProduct.images[0]}
                alt={pkgProduct.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 right-3 bg-[#23312C]/90 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs text-center text-[#FAF7E8] font-bold">
                Paquete Herbazen · Envío Estándar Gratis
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
