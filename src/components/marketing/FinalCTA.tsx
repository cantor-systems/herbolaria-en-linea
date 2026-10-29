'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, MessageCircle, Truck, ArrowRight } from 'lucide-react';
import { getWhatsAppHref } from '@/config/store';
import { trackWhatsAppClick } from '@/lib/analytics';

export const FinalCTA: React.FC = () => {
  const whatsappHref = getWhatsAppHref();

  return (
    <section className="py-16 bg-[#285F50] text-[#FAF7E8] text-center my-8 rounded-3xl mx-4 sm:mx-6 lg:mx-8 shadow-xl border-2 border-[#D17B24]">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <span className="text-xs font-black uppercase tracking-widest text-[#D17B24] bg-white/10 px-4 py-1.5 rounded-full inline-block">
          Herbolaria en Línea
        </span>

        <h2 className="text-3xl sm:text-4xl font-black text-[#FAF7E8] leading-tight">
          Encuentra productos herbolarios en distintas presentaciones
        </h2>

        <p className="text-sm sm:text-base text-[#FAF7E8]/90 font-medium max-w-xl mx-auto leading-relaxed">
          Explora el catálogo, elige tus productos y completa tu compra en línea.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/tienda"
            className="w-full sm:w-auto py-3.5 px-8 bg-[#D17B24] hover:bg-[#98552B] text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Ver productos</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {whatsappHref && (
            <a
              href={whatsappHref}
              onClick={() => trackWhatsAppClick('home', { placement: 'final_cta' })}
              className="w-full sm:w-auto py-3.5 px-6 border-2 border-[#FAF7E8]/40 hover:bg-white/10 text-[#FAF7E8] font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <span>Resolver dudas por WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
