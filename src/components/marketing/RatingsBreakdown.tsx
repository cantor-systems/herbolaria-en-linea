import React from 'react';
import { RATINGS_DATA, SHOW_MOCK_RATINGS } from '@/data/ratings';
import { Star, Award, ThumbsUp } from 'lucide-react';

export const RatingsBreakdown: React.FC = () => {
  if (!SHOW_MOCK_RATINGS) return null;
  const stars = [
    { label: '5 estrellas', pct: RATINGS_DATA.fiveStarPercentage },
    { label: '4 estrellas', pct: RATINGS_DATA.fourStarPercentage },
    { label: '3 estrellas', pct: RATINGS_DATA.threeStarPercentage },
    { label: '2 estrellas', pct: RATINGS_DATA.twoStarPercentage },
    { label: '1 estrella', pct: RATINGS_DATA.oneStarPercentage },
  ];

  return (
    <section className="py-10 bg-[#F4EFD6] border-y border-[#D9D1B9]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FAF7E8] p-6 sm:p-8 rounded-3xl border border-[#D9D1B9] shadow-md grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

          {/* Average Box */}
          <div className="md:col-span-5 text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-[#D9D1B9] pb-6 md:pb-0 md:pr-6">
            <span className="text-xs font-bold text-[#D17B24] uppercase tracking-wider block">
              Calificación Promedio
            </span>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-4xl sm:text-5xl font-black text-[#285F50]">
                {RATINGS_DATA.averageRating}
              </span>
              <span className="text-sm text-[#6F8F69] font-bold">/ 5.0</span>
            </div>

            <div className="flex justify-center md:justify-start text-amber-500 my-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current text-amber-500" />
              ))}
            </div>

            <p className="text-xs text-[#23312C]/80 font-medium">
              Basado en <strong className="text-[#285F50]">{RATINGS_DATA.totalReviews} valoraciones</strong> de compradores verificados en México.
            </p>
          </div>

          {/* Breakdown Progress Bars */}
          <div className="md:col-span-7 space-y-2.5 text-xs font-semibold text-[#23312C]">
            {stars.map((s, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-20 text-right text-[11px] text-[#6F8F69]">{s.label}</span>
                <div className="flex-1 h-3 bg-[#D9D1B9]/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#285F50] rounded-full transition-all duration-500"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <span className="w-8 font-bold text-right text-[11px]">{s.pct}%</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};
