import React from 'react';
import { SANITARY_CLAIMS, SHOW_UNAPPROVED_CLAIMS } from '@/content/claims';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export const ClaimsBanner: React.FC = () => {
  if (!SHOW_UNAPPROVED_CLAIMS) return null;

  return (
    <section className="py-8 bg-[#23312C]/5 border-y border-[#D9D1B9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FAF7E8] border border-[#D9D1B9] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-[#98552B] font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Módulo de Información Sanitaria y Avisos de Herbolaria</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SANITARY_CLAIMS.map((claim) => (
              <div
                key={claim.id}
                className="bg-[#F4EFD6] p-4 rounded-xl border border-[#D9D1B9] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-[#23312C] text-xs">{claim.title}</h4>
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-sm">
                    Aviso informativo
                  </span>
                </div>
                <p className="text-[#23312C]/80 leading-relaxed text-[11px]">
                  {claim.body}
                </p>
                {claim.source && (
                  <span className="text-[10px] text-[#6F8F69] block font-medium">
                    Fuente: {claim.source}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
