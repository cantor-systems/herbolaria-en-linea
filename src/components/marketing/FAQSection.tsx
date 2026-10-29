'use client';

import React, { useState } from 'react';
import { HOMEPAGE_CONTENT } from '@/content/homepage';
import { AccordionItem } from '@/components/ui/Accordion';
import { HelpCircle, MessageCircle } from 'lucide-react';
import { getWhatsAppHref } from '@/config/store';
import { trackWhatsAppClick } from '@/lib/analytics';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const whatsappHref = getWhatsAppHref();

  const toggleAccordion = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="py-12 bg-[#FAF7E8]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#285F50]/10 text-[#285F50] text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-[#D17B24]" />
            <span>Información de compra</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23312C]">
            Preguntas frecuentes sobre compras en línea
          </h2>
          <p className="text-xs text-[#6F8F69] font-medium">
            Consulta información sobre pagos, envíos, rastreo y canales de atención.
          </p>
        </div>

        <div className="space-y-3">
          {HOMEPAGE_CONTENT.faq.map((item, idx) => (
            <AccordionItem
              key={idx}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === idx}
              onToggle={() => toggleAccordion(idx)}
            />
          ))}
        </div>

        {whatsappHref && (
          <div className="bg-[#F4EFD6] p-5 rounded-2xl border border-[#D9D1B9] text-center space-y-2">
            <p className="text-xs font-bold text-[#23312C]">
              ¿Tienes otra pregunta sobre el producto o tu pedido?
            </p>
            <a
              href={whatsappHref}
              onClick={() => trackWhatsAppClick('faq', { placement: 'faq_section' })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
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
