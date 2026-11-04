'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { markOrderDeliveredAction } from '@/app/operaciones/actions';

function SubmitDelivery({ checked }: { checked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="min-h-12 w-full rounded-xl border border-[#6D9B87] bg-[#276B55] px-6 py-3 text-base font-semibold text-[#F2F3F3] transition hover:bg-[#2A735B] focus:outline-none focus:ring-4 focus:ring-[#D2D8DD]/60 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={!checked || pending}
      type="submit"
    >
      {pending ? 'Confirmando entrega…' : 'Confirmar entrega'}
    </button>
  );
}

export function ConfirmDeliveryForm({ orderId }: { orderId: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <form action={markOrderDeliveredAction} className="mt-5 space-y-4 border-t border-[#3B4147] pt-5">
      <input name="orderId" type="hidden" value={orderId} />
      <p className="text-sm leading-6 text-[#B8BEC4]">
        Comprueba la entrega en el seguimiento de la paquetería antes de confirmar.
        Se guardará la fecha de esta confirmación manual y no se enviarán notificaciones adicionales.
      </p>
      <label className="flex items-start gap-3 text-sm leading-6 text-[#F2F3F3]">
        <input
          checked={checked}
          className="mt-1 h-5 w-5 shrink-0 accent-[#276B55] focus:outline-none focus:ring-4 focus:ring-[#D2D8DD]/60"
          name="confirmDelivery"
          onChange={(event) => setChecked(event.target.checked)}
          required
          type="checkbox"
        />
        He comprobado en el seguimiento de la paquetería que este pedido fue entregado
      </label>
      <SubmitDelivery checked={checked} />
    </form>
  );
}
