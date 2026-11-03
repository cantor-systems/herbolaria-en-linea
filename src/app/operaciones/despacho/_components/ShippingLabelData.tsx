'use client';

import { useId, useState } from 'react';
import { Check, Copy, MapPin } from 'lucide-react';
import { shippingLabelText, type ShippingLabelRow } from './shipping-label';

export function ShippingLabelData({ rows }: { rows: ShippingLabelRow[] }) {
  const statusId = useId();
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle');

  async function copyData() {
    setCopyState('copying');
    try {
      await navigator.clipboard.writeText(shippingLabelText(rows));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <section aria-label="Datos para guía de envío" className="mb-6 rounded-2xl border border-[#315b47] bg-[#14251b] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 text-base font-semibold text-[#edf4ef]">
          <MapPin aria-hidden="true" className="shrink-0 text-[#8fc9aa]" size={20} />
          Datos para guía de envío
        </h2>
        <button
          aria-describedby={statusId}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#4d7d5f] bg-[#234c38] px-4 py-2 text-sm font-semibold text-[#edf4ef] transition hover:bg-[#2b6046] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8fc9aa] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={rows.length === 0 || copyState === 'copying'}
          onClick={copyData}
          type="button"
        >
          {copyState === 'copied' ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
          Copiar datos
        </button>
      </div>
      {rows.length > 0 ? (
        <dl className="grid select-text gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.map(({ label, value }) => (
            <div className={`grid min-w-0 gap-1 ${label === 'Calle y número' ? 'sm:col-span-2' : ''}`} key={label}>
              <dt className="text-xs font-medium text-[#a5b5ac]">{label}</dt>
              <dd className="text-sm leading-6 text-[#edf4ef] [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-[#a5b5ac]">No hay datos disponibles para copiar.</p>
      )}
      <p aria-live="polite" className={`mt-3 text-sm ${copyState === 'failed' ? 'text-[#edbd7a]' : 'text-[#8fc9aa]'}`} id={statusId} role="status">
        {copyState === 'copied' && 'Datos copiados.'}
        {copyState === 'copying' && 'Copiando datos…'}
        {copyState === 'failed' && 'No se pudo copiar. Selecciona los datos y cópialos manualmente.'}
      </p>
    </section>
  );
}
