import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check } from 'lucide-react';
import { HOMEPAGE_CONTENT } from '@/content/homepage';

export const EducationalSection: React.FC = () => {
  return (
    <section className="py-12 bg-[#FAF7E8] border-y border-[#D9D1B9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Visual Column */}
          <div className="lg:col-span-5 relative">
            <div className="aspect-4/3 rounded-3xl overflow-hidden border-2 border-[#D9D1B9] shadow-md relative bg-[#F4EFD6]">
              <img
                src="/images/blog/moronel-usos-tradicionales.webp"
                alt="Planta de la Vida Moronel Herbolaria"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#23312C]/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-[#FAF7E8] p-3 rounded-xl bg-[#285F50]/90 backdrop-blur-xs border border-[#AFC28E]/30">
                <span className="text-xs font-bold uppercase tracking-wider block text-[#D17B24]">
                  Contenido sobre la especie:
                </span>
                <span className="text-sm font-semibold italic">Lonicera subspicata (Moronel)</span>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#285F50]/10 text-[#285F50] text-xs font-bold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-[#D17B24]" />
              <span>Contenido educativo</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23312C] leading-snug">
              {HOMEPAGE_CONTENT.educational.title}
            </h2>

            <p className="text-sm font-semibold text-[#98552B] italic">
              {HOMEPAGE_CONTENT.educational.subtitle}
            </p>

            <div className="space-y-3 text-xs sm:text-sm text-[#23312C]/80 leading-relaxed">
              {HOMEPAGE_CONTENT.educational.content.map((paragraph, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-[#285F50]/15 text-[#285F50] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <p>{paragraph}</p>
                </div>
              ))}
            </div>

            <Link
              href="/conocer-moronel"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#285F50] hover:bg-[#23312C] text-[#FAF7E8] text-sm font-bold rounded-xl transition-colors"
            >
              <span>Conocer Moronel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};
