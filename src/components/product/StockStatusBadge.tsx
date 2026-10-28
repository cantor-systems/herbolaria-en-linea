import type { StockStatus } from '@/types';

const STOCK_PRESENTATION: Record<StockStatus, { label: string; className: string }> = {
  in_stock: {
    label: 'En stock',
    className: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  },
  low_stock: {
    label: 'Pocas unidades',
    className: 'border-amber-200 bg-amber-100 text-amber-900',
  },
  out_of_stock: {
    label: 'Agotado',
    className: 'border-[#D9D1B9] bg-[#F4EFD6] text-[#6F8F69]',
  },
};

export function StockStatusBadge({ stockStatus }: { stockStatus: StockStatus }) {
  const presentation = STOCK_PRESENTATION[stockStatus];

  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}
