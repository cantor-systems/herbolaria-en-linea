import React from 'react';
import { HOMEPAGE_CONTENT } from '@/content/homepage';
import { ShoppingBag, FileText, CreditCard, Truck } from 'lucide-react';

export const HowToBuySteps: React.FC = () => {
  const stepIcons = [ShoppingBag, FileText, CreditCard, Truck];

  return (
    <section aria-labelledby="how-to-buy-title" className="py-8 sm:py-10 lg:py-12 bg-[#F4EFD6]/45 border-y border-[#D9D1B9]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto mb-6 sm:mb-8 text-center">
          <span className="block mb-2 text-[11px] font-medium tracking-[0.16em] text-[#53645B]">
            PROCESO DE COMPRA
          </span>
          <h2 id="how-to-buy-title" className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-[#23312C]">
            ¿Cómo comprar en Herbolaria en Línea?
          </h2>
        </div>

        <ol role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:auto-rows-fr gap-4 sm:gap-5 lg:gap-6">
          {HOMEPAGE_CONTENT.howToBuySteps.map((item, idx) => {
            const Icon = stepIcons[idx] || ShoppingBag;
            return (
              <li
                key={item.step}
                className="h-full p-5 sm:p-6 lg:p-5 xl:p-6 rounded-2xl border border-[#D9D1B9]/65 bg-[#FFFCF5]"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#285F50] text-[#FAF7E8] flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium tabular-nums tracking-wide text-[#6F7767]" aria-hidden="true">{item.step}</span>
                </div>

                <h3 className="mb-2 text-base font-semibold leading-6 text-[#23312C]">
                  {item.title}
                </h3>
                <p className="text-sm leading-6 text-[#53645B]">
                  {item.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};
