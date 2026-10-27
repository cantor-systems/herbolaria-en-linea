import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number, currency: string = 'MXN'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateSavingsPercentage(originalCents: number, currentCents: number): number {
  if (!originalCents || originalCents <= currentCents) return 0;
  const diff = originalCents - currentCents;
  return Math.round((diff / originalCents) * 100);
}
