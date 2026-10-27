import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    question: '¿Qué es el Moronel y cuáles son sus presentaciones?',
    answer:
      'El Moronel (Calycophyllum candidissimum) es una planta de origen tradicional. En nuestra tienda Herbazen ofrecemos 3 presentaciones principales: Hierba deshidratada para infusión, Extracto concentrado en gotas y Cápsulas vegetales de 500mg, además de Paquetes combinados.',
  },
  {
    question: '¿Cuál es el tiempo de entrega y costo de envío a mi ciudad?',
    answer:
      'Realizamos envíos a todo México. El envío estándar tarda 4–5 días hábiles y cuesta $99 MXN; es GRATIS desde $799 MXN o con una presentación participante. El envío exprés tarda 1–2 días hábiles y cuesta $186 MXN, o $79 MXN cuando el pedido tiene envío estándar gratis.',
  },
  {
    question: '¿Cuáles son los métodos de pago aceptados?',
    answer: 'Los métodos de pago se habilitarán próximamente.',
  },
  {
    question: '¿Cómo puedo dar seguimiento a mi pedido una vez realizado?',
    answer:
      'Cuando el servicio de rastreo esté habilitado, podrás consultar el estatus de tu pedido en la sección Rastrear Pedido.',
  },
  {
    question: '¿Puedo realizar pedidos directamente por atención en WhatsApp?',
    answer: 'La atención por WhatsApp se habilitará cuando el canal esté confirmado.',
  },
];

export const FAQAccordion: React.FC<{ items?: FAQItem[] }> = ({ items = DEFAULT_FAQS }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        const itemId = `faq-item-${idx}`;
        const panelId = `${itemId}-panel`;
        const buttonId = `${itemId}-button`;

        return (
          <div key={itemId} className="bg-white rounded-xl border border-sand overflow-hidden transition-colors">
            <button
              id={buttonId}
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="w-full p-4 text-left font-bold text-stone-900 text-sm flex justify-between items-center gap-3 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-sage-green shrink-0" />
                <span>{item.question}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-stone-500 transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180 text-deep-green' : ''
                }`}
              />
            </button>

            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="p-4 pt-0 text-xs text-stone-600 leading-relaxed border-t border-sand/40 bg-warm-cream/30"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
