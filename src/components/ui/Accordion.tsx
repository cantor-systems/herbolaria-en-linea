'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionItemProps {
  question: string;
  answer: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  question,
  answer,
  isOpen = false,
  onToggle,
}) => {
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
