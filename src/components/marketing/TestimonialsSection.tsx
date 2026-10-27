import React from 'react';
import { TESTIMONIALS, SHOW_MOCK_TESTIMONIALS } from '@/data/testimonials';
import { Star, CheckCircle, Info } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  if (!SHOW_MOCK_TESTIMONIALS) return null;

  return (
    <section className="py-12 bg-[#FAF7E8] border-y border-[#D9D1B9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-extrabold text-[#D17B24] uppercase tracking-wider block">
            Opiniones de Clientes Herbazen
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23312C]">
            Experiencias de quienes han comprado Moronel
          </h2>
          <p className="text-xs text-[#6F8F69] font-medium">
            Comentarios recopilados de compras asistidas e historia de envíos en México.
          </p>

          {/* Dev / Validation Badge */}
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              <span>Modo Demostración · Datos mock pendientes de validación comercial</span>
            </span>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="bg-[#F4EFD6] p-5 rounded-2xl border border-[#D9D1B9] shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current text-amber-500" />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#23312C]/60 font-semibold">{t.date}</span>
                </div>

                <p className="text-xs text-[#23312C] leading-relaxed italic mb-3">
                  "{t.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-[#D9D1B9]/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-[#23312C] text-xs">{t.authorName}</h4>
                    <span className="text-[10px] text-[#6F8F69] block">{t.location}</span>
                  </div>

                  {t.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Compra</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-[#285F50] block mt-1.5 truncate">
                  {t.productName}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
