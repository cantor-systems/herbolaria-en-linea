import React from 'react';
import { HOMEPAGE_CONTENT } from '@/content/homepage';
import { ShoppingBag, FileText, CreditCard, Truck } from 'lucide-react';

export const HowToBuySteps: React.FC = () => {
  const stepIcons = [ShoppingBag, FileText, CreditCard, Truck];

  return (
    <section className="py-10 bg-[#F4EFD6] border-y border-[#D9D1B9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div>
          <span className="text-xs font-extrabold text-[#D17B24] uppercase tracking-wider block mb-1">
            Proceso Fácil y Transparente
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23312C]">
            ¿Cómo realizar tu compra en Herbolaria en Línea?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HOMEPAGE_CONTENT.howToBuySteps.map((item, idx) => {
            const Icon = stepIcons[idx] || ShoppingBag;
            return (
              <div
                key={idx}
                className="bg-[#FAF7E8] p-5 rounded-2xl border border-[#D9D1B9] shadow-xs text-left relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#285F50] text-[#FAF7E8] flex items-center justify-center font-extrabold shadow-sm">
                      <Icon className="w-6 h-6 text-[#D17B24]" />
                    </div>
                    <span className="text-2xl font-black text-[#D9D1B9]">{item.step}</span>
                  </div>

                  <h3 className="font-extrabold text-[#23312C] text-base mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#6F8F69] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
