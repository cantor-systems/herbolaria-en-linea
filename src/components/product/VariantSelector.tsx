'use client';

import React from 'react';
import { ProductVariant } from '@/types';
import { formatCurrency, calculateSavingsPercentage } from '@/lib/utils';
import { Check } from 'lucide-react';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  onSelectVariant: (variant: ProductVariant) => void;
  label?: string;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariant,
  onSelectVariant,
  label = 'Selecciona Presentación / Paquete de Ahorro:',
}) => {
  return (
    <div className="space-y-2.5">
      <label className="block text-xs font-bold text-[#23312C] uppercase tracking-wider">
        {label}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {variants.map((variant) => {
          const isSelected = selectedVariant.id === variant.id;
          const savings = calculateSavingsPercentage(
            variant.compareAtPriceCents || 0,
            variant.priceCents
          );

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelectVariant(variant)}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-[#285F50] bg-[#FAF7E8] ring-2 ring-[#285F50]/30 shadow-sm'
                  : 'border-[#D9D1B9] bg-[#F4EFD6]/60 hover:bg-[#FAF7E8] hover:border-[#285F50]/50'
              }`}
            >
              {variant.badge && (
                <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#D17B24] text-white shadow-xs">
                  {variant.badge}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-[#23312C] leading-snug">
                    {variant.name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-[#285F50] shrink-0" />}
                </div>

                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="font-extrabold text-sm text-[#285F50]">
                    {formatCurrency(variant.priceCents)}
                  </span>
                  {variant.compareAtPriceCents &&
                    variant.compareAtPriceCents > variant.priceCents && (
                    <span className="text-[11px] text-[#23312C]/60 line-through">
                      {formatCurrency(variant.compareAtPriceCents)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-[#D9D1B9]/60 text-[11px] text-[#6F8F69] font-medium flex justify-between items-center">
                <span>{formatCurrency(variant.unitPriceCents)} / un.</span>
                {savings > 0 && (
                  <span className="font-bold text-[#98552B]">{savings}% Ahorro</span>
                )}
              </div>
              {variant.freeShippingEligible && (
                <span className="mt-1 text-[10px] font-bold text-emerald-700">
                  Envío estándar gratis
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
