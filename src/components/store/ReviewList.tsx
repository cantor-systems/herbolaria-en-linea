import React from 'react';
import { Review } from '../../types/ecommerce';
import { Star, CheckCircle2, User } from 'lucide-react';

interface ReviewListProps {
  reviews: Review[];
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {reviews.map((rev) => (
        <div
          key={rev.id}
          className="bg-white rounded-2xl p-5 border border-sand shadow-xs flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-stone-400">{rev.date}</span>
            </div>

            <h4 className="font-bold text-stone-900 text-sm leading-tight">
              "{rev.title}"
            </h4>

            <p className="text-xs text-stone-600 leading-relaxed italic">
              {rev.comment}
            </p>
          </div>

          <div className="pt-3 border-t border-sand flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sage-light text-sage-green font-bold flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-stone-800 block">{rev.authorName}</span>
                <span className="text-[10px] text-stone-500">{rev.productName}</span>
              </div>
            </div>

            {rev.verifiedPurchase && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Verificado
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
