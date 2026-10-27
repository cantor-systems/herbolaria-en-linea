'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, ShoppingBag, MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Product, ProductVariant } from '@/types';
import { formatCurrency, calculateSavingsPercentage } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { getWhatsAppHref } from '@/config/store';
import { SHOW_MOCK_RATINGS } from '@/data/ratings';
import { trackWhatsAppClick } from '@/lib/analytics';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants.find((v) => v.isPopular) || product.variants[0]
  );

  const savings = calculateSavingsPercentage(
    selectedVariant.compareAtPriceCents || 0,
    selectedVariant.priceCents
  );

  const whatsappHref = getWhatsAppHref();
  const visibleBadges: string[] = [];

  const whatsappMessage = encodeURIComponent(
    `Hola, me interesa comprar el producto "${product.name}" en la presentación "${selectedVariant.name}" (${formatCurrency(
      selectedVariant.priceCents
    )}). ¿Me ayudan a levantar el pedido?`
  );

  return (
    <div className="bg-[#FAF7E8] rounded-2xl border border-[#D9D1B9] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">

      {/* Top Image & Badges */}
      <div className="relative aspect-4/3 bg-[#F4EFD6] overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#285F50] text-[#FAF7E8] shadow-sm">
            {product.brand}
          </span>
          {savings > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D17B24] text-white shadow-sm">
              -{savings}% Ahorro
            </span>
          )}
        </div>

        {visibleBadges.length > 0 && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1">
            {visibleBadges.slice(0, 2).map((badge, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF7E8]/90 text-[#23312C] border border-[#D9D1B9] backdrop-blur-xs"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Rating */}
          {SHOW_MOCK_RATINGS && <div className="flex items-center gap-1.5 text-amber-600 mb-1.5">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 fill-current ${
                    i < Math.floor(product.rating) ? 'text-amber-500' : 'text-stone-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-[#23312C]">{product.rating}</span>
            <span className="text-[11px] text-[#6F8F69]">({product.reviewCount} opiniones)</span>
          </div>}

          {/* Title */}
          <Link href={`/producto/${product.slug}`} className="block group-hover:text-[#285F50] transition-colors">
            <h3 className="font-extrabold text-[#23312C] text-base leading-snug line-clamp-2">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs text-[#6F8F69] line-clamp-2 mt-1.5 leading-relaxed">
            Información de la presentación: {product.categoryName}.
          </p>
        </div>

        {/* Variant Pills Selector */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-[#23312C] uppercase tracking-wider block">
            Seleccionar presentación:
          </span>
          <div className="grid grid-cols-3 gap-1">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariant(variant)}
                className={`min-h-[44px] px-1.5 py-1 rounded-lg text-[10px] font-bold text-center border transition-all leading-tight ${
                  selectedVariant.id === variant.id
                    ? 'bg-[#285F50] text-[#FAF7E8] border-[#285F50]'
                    : 'bg-[#F4EFD6] text-[#23312C] border-[#D9D1B9] hover:border-[#285F50]'
                }`}
              >
                {variant.unitsCount === 1 ? '1 unidad' : `${variant.unitsCount} unidades`}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="pt-2 border-t border-[#D9D1B9]/60 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-[#285F50]">
                {formatCurrency(selectedVariant.priceCents)}
              </span>
              {selectedVariant.compareAtPriceCents &&
                selectedVariant.compareAtPriceCents > selectedVariant.priceCents && (
                <span className="text-xs text-[#23312C]/60 line-through">
                  {formatCurrency(selectedVariant.compareAtPriceCents)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#6F8F69] font-medium block">
              Equivale a {formatCurrency(selectedVariant.unitPriceCents)} por unidad
            </span>
            {selectedVariant.freeShippingEligible && (
              <span className="text-[10px] font-bold text-emerald-700 block">
                Incluye envío estándar gratis
              </span>
            )}
          </div>

          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
            En Stock
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => addToCart(product, selectedVariant)}
            className="w-full py-2.5 px-4 bg-[#285F50] hover:bg-[#23312C] text-[#FAF7E8] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 min-h-[44px]"
          >
            <ShoppingBag className="w-4 h-4 text-[#D17B24]" />
            <span>Agregar al Carrito</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <a
              href={whatsappHref || undefined}
              target={whatsappHref ? '_blank' : undefined}
              rel={whatsappHref ? 'noopener noreferrer' : undefined}
              aria-disabled={!whatsappHref}
              onClick={() => trackWhatsAppClick('product', { productSlug: product.slug, placement: 'product_card' })}
              className="py-2 px-2 border border-emerald-600 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold text-[11px] rounded-lg text-center flex items-center justify-center gap-1 transition-colors min-h-[44px]"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Por WhatsApp</span>
            </a>

            <Link
              href={`/producto/${product.slug}`}
              className="py-2 px-2 border border-[#D9D1B9] text-[#23312C] hover:bg-[#F4EFD6] font-bold text-[11px] rounded-lg text-center flex items-center justify-center gap-1 transition-colors min-h-[44px]"
            >
              <span>Ver Detalle</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#285F50]" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
