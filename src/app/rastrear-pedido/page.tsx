'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { getWhatsAppHref } from '@/config/store';
import { trackWhatsAppClick } from '@/lib/analytics';

type ViewState = 'idle' | 'loading' | 'success' | 'not-found' | 'error';
type PublicOrderState = 'payment_pending' | 'confirmed' | 'shipped' | 'unavailable';

interface OrderTrackingResult {
  orderNumber: string;
  state: PublicOrderState;
  shippingMethod: 'standard' | 'express';
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
}

const STATE_COPY: Record<
  PublicOrderState,
  { label: string; description: string }
> = {
  payment_pending: {
    label: 'Pago pendiente',
    description:
      'Tu pago todavía está en proceso. El pedido comenzará a prepararse cuando el pago sea confirmado.',
  },
  confirmed: {
    label: 'Pedido confirmado',
    description: 'Tu pago fue confirmado y estamos preparando tu pedido.',
  },
  shipped: {
    label: 'Pedido enviado',
    description: 'Tu pedido ya fue entregado a la paquetería.',
  },
  unavailable: {
    label: 'Información no disponible',
    description:
      'Este pedido no tiene información de envío disponible. Si necesitas ayuda, contáctanos.',
  },
};

function formatShippedAt(value: string | null) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No disponible';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(date);
}

function TimelineStep({
  title,
  detail,
  state,
  icon,
}: {
  title: string;
  detail: string;
  state: 'completed' | 'active' | 'pending';
  icon: React.ReactNode;
}) {
  const styles = {
    completed: 'border-[#285F50] bg-[#F4EFD6] text-[#23312C]',
    active: 'border-[#285F50] bg-[#285F50] text-[#FAF7E8] shadow-md',
    pending: 'border-[#D9D1B9] bg-[#F4EFD6] text-[#23312C]/60',
  };

  return (
    <div className={`space-y-1 rounded-2xl border p-4 ${styles[state]}`}>
      <div className={state === 'active' ? 'text-[#D17B24]' : 'text-emerald-600'}>
        {icon}
      </div>
      <h4 className="font-extrabold">{title}</h4>
      <p className="text-[11px] opacity-80">{detail}</p>
    </div>
  );
}

function OrderTimeline({ state }: { state: 'confirmed' | 'shipped' }) {
  const shipped = state === 'shipped';

  return (
    <div className="grid grid-cols-1 gap-4 text-xs font-semibold md:grid-cols-3">
      <TimelineStep
        title="1. Pedido confirmado"
        detail="Pago confirmado"
        state="completed"
        icon={<CheckCircle2 className="mb-2 h-5 w-5" />}
      />
      <TimelineStep
        title="2. Preparando envío"
        detail={shipped ? 'Preparación completada' : 'Preparación en curso'}
        state={shipped ? 'completed' : 'active'}
        icon={<PackageCheck className="mb-2 h-5 w-5" />}
      />
      <TimelineStep
        title="3. Pedido enviado"
        detail={shipped ? 'Entregado a paquetería' : 'Pendiente'}
        state={shipped ? 'active' : 'pending'}
        icon={<Truck className="mb-2 h-5 w-5" />}
      />
    </div>
  );
}

export default function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [result, setResult] = useState<OrderTrackingResult | null>(null);

  const isLoading = viewState === 'loading';
  const whatsappHref = result
    ? getWhatsAppHref(`Hola, necesito ayuda con mi pedido #${result.orderNumber}.`)
    : null;

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setViewState('loading');
    setResult(null);

    try {
      const response = await fetch('/api/orders/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, email }),
        cache: 'no-store',
      });

      if (response.status === 404) {
        setViewState('not-found');
        return;
      }
      if (!response.ok) {
        setViewState('error');
        return;
      }

      const tracking = (await response.json()) as OrderTrackingResult;
      setResult(tracking);
      setViewState('success');
    } catch {
      setViewState('error');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-3 rounded-3xl bg-[#285F50] p-6 text-center text-[#FAF7E8] shadow-lg sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D17B24] text-white shadow-md">
          <Truck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">
          Rastreo de Pedido Herbolaria en Línea
        </h1>
        <p className="mx-auto max-w-xl text-xs text-[#FAF7E8]/90 sm:text-sm">
          Ingresa tu número de pedido y el correo que utilizaste al realizar tu compra.
        </p>

        <form onSubmit={handleSearch} className="mx-auto max-w-md space-y-4 pt-4 text-left">
          <label className="block space-y-1.5 text-xs font-bold">
            <span>Número de pedido</span>
            <input
              type="text"
              required
              minLength={6}
              maxLength={6}
              pattern="[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="7K9Q2X"
              value={orderNumber}
              disabled={isLoading}
              onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
              className="w-full rounded-xl border border-[#D9D1B9] bg-[#FAF7E8] px-4 py-3 text-xs font-bold text-[#23312C] focus:outline-hidden disabled:cursor-wait disabled:opacity-70"
            />
          </label>
          <label className="block space-y-1.5 text-xs font-bold">
            <span>Correo usado en la compra</span>
            <input
              type="email"
              required
              maxLength={150}
              autoComplete="email"
              placeholder="cliente@email.com"
              value={email}
              disabled={isLoading}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#D9D1B9] bg-[#FAF7E8] px-4 py-3 text-xs font-bold text-[#23312C] focus:outline-hidden disabled:cursor-wait disabled:opacity-70"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#D17B24] px-5 py-3 text-xs font-black text-white shadow-md transition-colors hover:bg-[#98552B] disabled:cursor-wait disabled:opacity-70"
          >
            {isLoading && <Clock className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Consultando...' : 'Consultar pedido'}
          </button>
        </form>
      </div>

      {viewState === 'not-found' && (
        <div
          role="status"
          className="rounded-3xl border border-[#D9D1B9] bg-[#FAF7E8] p-6 text-center text-sm font-semibold text-[#23312C] shadow-xs"
        >
          No encontramos un pedido con esos datos.
        </div>
      )}

      {viewState === 'error' && (
        <div
          role="alert"
          className="rounded-3xl border border-[#D9D1B9] bg-[#FAF7E8] p-6 text-center text-sm font-semibold text-[#23312C] shadow-xs"
        >
          No fue posible consultar el pedido. Inténtalo nuevamente más tarde.
        </div>
      )}

      {viewState === 'success' && result && (
        <div className="animate-in space-y-6 rounded-3xl border border-[#D9D1B9] bg-[#FAF7E8] p-6 shadow-xs duration-300 fade-in sm:p-8">
          <div className="flex flex-col justify-between gap-3 border-b border-[#D9D1B9] pb-4 sm:flex-row sm:items-center">
            <div>
              <span className="block text-[10px] font-extrabold uppercase text-[#6F8F69]">
                Estado del pedido
              </span>
              <h2 className="text-xl font-extrabold text-[#23312C]">
                Pedido #{result.orderNumber}
              </h2>
            </div>
            <span className="self-start rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 sm:self-auto">
              {STATE_COPY[result.state].label}
            </span>
          </div>

          <p className="text-sm font-medium text-[#23312C]">
            {STATE_COPY[result.state].description}
          </p>

          {(result.state === 'confirmed' || result.state === 'shipped') && (
            <OrderTimeline state={result.state} />
          )}

          {result.state === 'shipped' && (
            <div className="grid gap-4 rounded-2xl border border-[#D9D1B9] bg-white/50 p-5 text-sm text-[#23312C] sm:grid-cols-3">
              <div>
                <span className="block text-[10px] font-extrabold uppercase text-[#6F8F69]">
                  Paquetería
                </span>
                <strong>{result.shippingCarrier || 'No disponible'}</strong>
              </div>
              <div>
                <span className="block text-[10px] font-extrabold uppercase text-[#6F8F69]">
                  Número de guía
                </span>
                <strong>{result.trackingNumber || 'No disponible'}</strong>
              </div>
              <div>
                <span className="block text-[10px] font-extrabold uppercase text-[#6F8F69]">
                  Fecha de envío
                </span>
                <strong>{formatShippedAt(result.shippedAt)}</strong>
              </div>
              {result.trackingUrl && (
                <a
                  href={result.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D17B24] px-5 py-3 text-xs font-black text-white hover:bg-[#98552B] sm:col-span-3"
                >
                  Rastrear mi paquete
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )}

          <div className="border-t border-[#D9D1B9] pt-4 text-center">
            <a
              href={whatsappHref || undefined}
              target={whatsappHref ? '_blank' : undefined}
              rel={whatsappHref ? 'noopener noreferrer' : undefined}
              aria-disabled={!whatsappHref}
              onClick={() =>
                trackWhatsAppClick('order_tracking', { placement: 'tracking_result' })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Solicitar ayuda con este pedido en WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
