'use client';

import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionItemProps {
  question: string;
  answer: string;
  isOpen?: boolean;
  onToggle?: () => void;
  appearance?: 'default' | 'editorial';
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  question,
  answer,
  isOpen = false,
  onToggle,
  appearance = 'default',
}) => {
  const id = useId();
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  if (appearance === 'editorial') {
    return (
      <div className={cn('rounded-2xl border bg-[#FFFCF5] overflow-hidden transition-colors motion-reduce:transition-none', isOpen ? 'border-[#285F50]/25' : 'border-[#D9D1B9]/70')}>
        <h3>
          <button
            type="button"
            id={triggerId}
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={onToggle}
            className={cn('w-full min-h-[56px] px-4 py-4 sm:px-5 text-left flex items-center justify-between gap-4 text-sm sm:text-base font-semibold leading-6 text-[#23312C] hover:bg-[#F4EFD6]/40 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#285F50]', isOpen && 'bg-[#F4EFD6]/55')}
          >
            <span>{question}</span>
            <ChevronDown className={cn('w-4 h-4 shrink-0 text-[#285F50] transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-180')} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </h3>
        <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!isOpen} className="border-t border-[#D9D1B9]/50 px-4 py-4 sm:px-5 text-sm leading-7 text-[#53645B]">
          <p>{answer}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#D9D1B9] rounded-2xl bg-[#FAF7E8] overflow-hidden transition-all shadow-xs">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-[#23312C] text-base hover:text-[#285F50] transition-colors focus:outline-hidden"
      >
        <span>{question}</span>
        <ChevronDown
          className={cn('w-5 h-5 text-[#285F50] transition-transform duration-300 shrink-0', {
            'rotate-180': isOpen,
          })}
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-1 text-[#23312C]/90 text-sm leading-relaxed border-t border-[#D9D1B9]/50 animate-in fade-in duration-200">
          {answer}
        </div>
      )}
    </div>
  );
};
