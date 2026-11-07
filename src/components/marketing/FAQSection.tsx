'use client';

import React, { useState } from 'react';
import { HOMEPAGE_CONTENT } from '@/content/homepage';
import { AccordionItem } from '@/components/ui/Accordion';
import { HOME_FAQ_ITEMS, HOME_FAQ_SECTION } from '@/content/home-faq';
import { HelpCircle, MessageCircle } from 'lucide-react';
import { getWhatsAppHref } from '@/config/store';
import { trackWhatsAppClick } from '@/lib/analytics';

export const FAQSection: React.FC<{ variant?: 'default' | 'home' }> = ({ variant = 'default' }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const whatsappHref = getWhatsAppHref();
  const isHome = variant === 'home';
  const items = isHome ? HOME_FAQ_ITEMS : HOMEPAGE_CONTENT.faq;

  const toggleAccordion = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section aria-labelledby={isHome ? 'home-faq-title' : undefined} className={isHome ? 'py-8 sm:py-10 lg:py-12 bg-[#FAF7E8]' : 'py-12 bg-[#FAF7E8]'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        <div className={isHome ? 'max-w-2xl mx-auto text-center space-y-3' : 'text-center space-y-2'}>
          <div className={isHome ? 'text-[11px] font-medium tracking-[0.14em] text-[#53645B]' : 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#285F50]/10 text-[#285F50] text-xs font-bold uppercase tracking-wider'}>
            {!isHome && <HelpCircle className="w-3.5 h-3.5 text-[#D17B24]" />}
            <span>{isHome ? HOME_FAQ_SECTION.eyebrow : 'Información de compra'}</span>
          </div>
          <h2 id={isHome ? 'home-faq-title' : undefined} className={isHome ? 'text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-[#23312C]' : 'text-2xl sm:text-3xl font-extrabold text-[#23312C]'}>
            {isHome ? HOME_FAQ_SECTION.title : 'Preguntas frecuentes sobre compras en línea'}
          </h2>
          <p className={isHome ? 'text-sm leading-6 text-[#53645B]' : 'text-xs text-[#6F8F69] font-medium'}>
            {isHome ? HOME_FAQ_SECTION.subtitle : 'Consulta información sobre pagos, envíos, rastreo y canales de atención.'}
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <AccordionItem
              key={idx}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === idx}
              onToggle={() => toggleAccordion(idx)}
              appearance={isHome ? 'editorial' : 'default'}
            />
          ))}
        </div>

        {whatsappHref && (
          <div className={isHome ? 'pt-5 border-t border-[#D9D1B9]/60 text-center space-y-3' : 'bg-[#F4EFD6] p-5 rounded-2xl border border-[#D9D1B9] text-center space-y-2'}>
            <p className="text-xs font-bold text-[#23312C]">
              ¿Tienes otra pregunta sobre el producto o tu pedido?
            </p>
            <a
              href={whatsappHref}
              onClick={() => trackWhatsAppClick('faq', { placement: 'faq_section' })}
              className={isHome ? 'min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[#D9D1B9] text-[#285F50] text-sm font-medium rounded-xl hover:bg-[#F4EFD6]/50 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#285F50]' : 'inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors'}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Preguntar directamente por WhatsApp</span>
            </a>
          </div>
        )}

      </div>
    </section>
  );
};
