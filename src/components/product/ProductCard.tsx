'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Product, ProductVariant } from '@/types';
import { formatCurrency, calculateSavingsPercentage } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { getBrandBySlug } from '@/data/brands';
import { StockStatusBadge } from './StockStatusBadge';

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

  const brandName = getBrandBySlug(product.brandSlug)?.name ?? product.brandSlug;
  const hasMultipleVariants = product.variants.length > 1;

  return (
    <div className="bg-[#FAF7E8] rounded-2xl border border-[#D9D1B9] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">

      {/* Top Image & Badges */}
      <div className="relative aspect-4/3 bg-[#F4EFD6] overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5 z-10">
          {savings > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D17B24] text-white shadow-sm">
              -{savings}% Ahorro
            </span>
          )}
        </div>

      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6F8F69]">
            {brandName}
          </span>

          {/* Title */}
          <Link href={`/producto/${product.slug}`} className="block group-hover:text-[#285F50] transition-colors">
            <h3 className="font-extrabold text-[#23312C] text-base leading-snug line-clamp-2">
              {product.name}
            </h3>
          </Link>
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
            {selectedVariant.unitsCount > 1 && (
              <span className="text-xs text-[#6F8F69] font-medium block">
                Equivale a {formatCurrency(selectedVariant.unitPriceCents)} por unidad
              </span>
            )}
            {selectedVariant.freeShippingEligible && (
              <span className="text-xs font-bold text-emerald-700 block">
                Incluye envío estándar gratis
              </span>
            )}
          </div>

          <StockStatusBadge stockStatus={product.stockStatus} />
        </div>

        {/* Variant Pills Selector */}
        {hasMultipleVariants && (
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
                  className={`min-h-[44px] px-1.5 py-1 rounded-lg text-[11px] font-bold text-center border transition-all leading-tight ${
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
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            disabled={product.stockStatus === 'out_of_stock'}
            onClick={() => addToCart(product, selectedVariant)}
            className="w-full py-2.5 px-4 bg-[#285F50] hover:bg-[#23312C] text-[#FAF7E8] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 min-h-[44px] disabled:cursor-not-allowed disabled:bg-[#23312C]/45 disabled:shadow-none"
          >
            <ShoppingBag className="w-4 h-4 text-[#D17B24]" />
            <span>
              {product.stockStatus === 'out_of_stock' ? 'Agotado' : 'Agregar al Carrito'}
            </span>
          </button>

          <Link
            href={`/producto/${product.slug}`}
            className="min-h-[44px] w-full py-2 px-3 border border-[#D9D1B9] text-[#23312C] hover:bg-[#F4EFD6] font-bold text-[11px] rounded-lg text-center flex items-center justify-center gap-1 transition-colors"
          >
            <span>Ver detalle</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#285F50]" />
          </Link>
        </div>

      </div>
    </div>
  );
};
