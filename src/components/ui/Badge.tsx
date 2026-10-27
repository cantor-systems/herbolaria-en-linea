import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'mustard' | 'terracotta' | 'sage' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-xs';

  const variants = {
    default: 'bg-[#285F50] text-[#FAF7E8]',
    mustard: 'bg-[#D17B24] text-white',
    terracotta: 'bg-[#98552B] text-white',
    sage: 'bg-[#AFC28E] text-[#23312C]',
    outline: 'border border-[#C9AD83] text-[#23312C] bg-[#FAF7E8]/80',
  };

  return <span className={cn(base, variants[variant], className)}>{children}</span>;
};
