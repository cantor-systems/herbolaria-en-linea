'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock3,
  Home,
  MessageCircle,
  Package,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import { getWhatsAppHref } from '@/config/store';
import { useCart } from '@/context/CartContext';
import { DemoOrder, getDemoOrder } from '@/lib/demoOrder';
import { trackWhatsAppClick } from '@/lib/analytics';

type PaymentState = 'approved' | 'pending' | 'failed' | 'unknown';

function isPaymentState(value: unknown): value is PaymentState {
  return value === 'approved' || value === 'pending' || value === 'failed' || value === 'unknown';
}

function isPublicOrderNumber(value: unknown): value is string {
  return typeof value === 'string' && /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(value);
}

function PaymentConfirmation({
  paymentId,
  externalReference,
}: {
  paymentId: string;
  externalReference: string;
}) {
  const { clearCart } = useCart();
  const [paymentState, setPaymentState] = useState<PaymentState | undefined>(undefined);
  const [publicOrderNumber, setPublicOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const verifyPayment = async () => {
      try {
        const query = new URLSearchParams({
          payment_id: paymentId,
          external_reference: externalReference,
        });
        const response = await fetch(`/api/mercadopago/payment-status?${query.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const result: unknown = await response.json();
        const status =
          typeof result === 'object' && result !== null && 'status' in result
            ? (result as { status?: unknown }).status
            : undefined;
        const verifiedByProvider =
          typeof result === 'object' && result !== null && 'verifiedByProvider' in result
            ? (result as { verifiedByProvider?: unknown }).verifiedByProvider
            : false;
        const resultPublicOrderNumber =
          typeof result === 'object' && result !== null && 'publicOrderNumber' in result
            ? (result as { publicOrderNumber?: unknown }).publicOrderNumber
            : undefined;
        const isVerifiedResponse = response.ok && verifiedByProvider === true;

        setPublicOrderNumber(
          isVerifiedResponse && isPublicOrderNumber(resultPublicOrderNumber)
            ? resultPublicOrderNumber
            : null
        );
        setPaymentState(isVerifiedResponse && isPaymentState(status) ? status : 'unknown');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setPublicOrderNumber(null);
          setPaymentState('unknown');
        }
      }
    };

    void verifyPayment();
    return () => controller.abort();
  }, [externalReference, paymentId]);

  useEffect(() => {
    if (paymentState === 'approved') clearCart();
  }, [paymentState]);

  const content = {
    approved: {
      icon: <CheckCircle2 className="w-10 h-10" />,
      iconClass: 'bg-emerald-100 text-emerald-700',
      label: 'Pago verificado por Mercado Pago',
      title: 'Pago aprobado',
      description:
        'Mercado Pago confirmó tu pago y tu pedido quedó registrado correctamente.',
      status: 'Aprobado por el proveedor',
    },
    pending: {
      icon: <Clock3 className="w-10 h-10" />,
      iconClass: 'bg-amber-100 text-amber-700',
      label: 'Pago en proceso',
      title: 'Pago pendiente',
      description:
        'Estamos verificando el estado de tu pago. Algunos medios, como pagos en efectivo, pueden tardar en acreditarse.',
      status: 'Pendiente',
    },
    failed: {
      icon: <XCircle className="w-10 h-10" />,
      iconClass: 'bg-red-100 text-red-700',
      label: 'Pago no acreditado',
      title: 'Pago no completado',
      description: 'Mercado Pago no reporta este pago como aprobado. Puedes volver al checkout e intentarlo nuevamente.',
      status: 'No completado',
    },
    unknown: {
      icon: <ShieldCheck className="w-10 h-10" />,
      iconClass: 'bg-[#F4EFD6] text-[#285F50]',
      label: 'Verificación en curso',
      title: 'Estamos verificando el estado de tu pago',
      description:
        'Aún no pudimos confirmar el resultado directamente con Mercado Pago. No consideramos este pedido pagado por los datos de la URL.',
      status: 'Sin confirmación',
    },
  } as const;

  const current = content[paymentState ?? 'unknown'];
  const whatsappHref = getWhatsAppHref(
    publicOrderNumber
      ? `Hola, quiero consultar el estado de mi pedido #${publicOrderNumber}.`
      : 'Hola, quiero consultar el estado de mi pedido.'
  );

  return (
    <div className="max-w-3xl mx-auto my-12 px-4 space-y-8">
      <div className="bg-[#FAF7E8] p-6 sm:p-10 rounded-3xl border-2 border-[#285F50] text-center shadow-lg space-y-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm ${current.iconClass}`}>
          {paymentState === undefined ? <Clock3 className="w-10 h-10 animate-pulse" /> : current.icon}
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#D17B24]">
            {paymentState === undefined ? 'Consultando a Mercado Pago' : current.label}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#23312C]">
            {paymentState === undefined ? 'Estamos verificando el estado de tu pago' : current.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#6F8F69] max-w-lg mx-auto">
            {paymentState === undefined
              ? 'Espera un momento mientras consultamos la fuente de pago de forma segura.'
              : current.description}
          </p>
        </div>

        <div className="bg-[#F4EFD6] p-4 rounded-2xl border border-[#D9D1B9] max-w-md mx-auto space-y-1">
          <span className="text-[11px] font-bold text-[#6F8F69] uppercase block">Número de pedido:</span>
          <span className="text-2xl font-black tracking-wider text-[#285F50] block">
            {publicOrderNumber
              ? `#${publicOrderNumber}`
              : paymentState === undefined
                ? 'Consultando…'
                : 'No disponible'}
          </span>
          <span className="text-xs text-[#23312C]/80 block font-medium">
            Estado: <strong className="text-[#285F50]">{paymentState === undefined ? 'Verificando' : current.status}</strong>
          </span>
        </div>

        <div className="text-left bg-[#FAF7E8] p-5 rounded-2xl border border-[#D9D1B9] space-y-3 text-xs">
          <h4 className="font-extrabold text-[#23312C] text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-[#D17B24]" />
            <span>Información importante:</span>
          </h4>
          <ul className="space-y-2 text-[#23312C]/80">
            <li>El estado mostrado se consulta en el servidor directamente con Mercado Pago.</li>
            <li>Los parámetros de retorno del navegador no se consideran prueba de pago.</li>
            <li>Conserva tu número de pedido para cualquier aclaración.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {paymentState === 'failed' && (
            <Link
              href="/checkout"
              className="w-full sm:w-auto py-3.5 px-6 bg-[#D17B24] text-white font-bold text-xs rounded-xl shadow-md hover:bg-[#98552B] transition-colors"
            >
              Intentar nuevamente
            </Link>
          )}
          <a
            href={whatsappHref || undefined}
            target={whatsappHref ? '_blank' : undefined}
            rel={whatsappHref ? 'noopener noreferrer' : undefined}
            aria-disabled={!whatsappHref}
            onClick={(event) => {
              if (!whatsappHref) event.preventDefault();
              else trackWhatsAppClick('checkout', { placement: 'payment_confirmation' });
            }}
            className={`w-full sm:w-auto py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 ${
              !whatsappHref ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Consultar por WhatsApp</span>
          </a>
        </div>

        <Link href="/" className="text-xs font-bold text-[#6F8F69] hover:text-[#285F50] inline-flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          <span>Regresar a la página principal</span>
        </Link>
      </div>
    </div>
  );
}

function LegacyDemoConfirmation({ order }: { order: DemoOrder }) {
  const whatsappHref = getWhatsAppHref(
    `Hola, quiero consultar el estado de mi pedido ${order.orderNumber}.`
  );

  return (
    <div className="max-w-3xl mx-auto my-12 px-4 space-y-8">
      <div className="bg-[#FAF7E8] p-6 sm:p-10 rounded-3xl border-2 border-[#285F50] text-center shadow-lg space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
          <Clock3 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-[#D17B24]">Pedido registrado</span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#23312C]">Pedido pendiente de pago</h1>
          <p className="text-xs sm:text-sm text-[#6F8F69] max-w-lg mx-auto">No se ha realizado ningún cobro para este pedido.</p>
        </div>
        <div className="bg-[#F4EFD6] p-4 rounded-2xl border border-[#D9D1B9] max-w-md mx-auto space-y-1">
          <span className="text-[11px] font-bold text-[#6F8F69] uppercase block">Número de pedido:</span>
          <span className="text-2xl font-black text-[#285F50] tracking-wider block">#{order.orderNumber}</span>
          <span className="text-xs text-[#23312C]/80 block font-medium">Estado: <strong>Pendiente de pago</strong></span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={whatsappHref || undefined}
            target={whatsappHref ? '_blank' : undefined}
            rel={whatsappHref ? 'noopener noreferrer' : undefined}
            aria-disabled={!whatsappHref}
            onClick={(event) => {
              if (!whatsappHref) event.preventDefault();
              else trackWhatsAppClick('checkout', { placement: 'order_confirmation' });
            }}
            className={`w-full sm:w-auto py-3.5 px-6 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 ${
              !whatsappHref ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Consultar estado por WhatsApp</span>
          </a>
          <Link href="/rastrear-pedido" className="w-full sm:w-auto py-3.5 px-6 bg-[#285F50] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2">
            <Truck className="w-4 h-4 text-[#D17B24]" />
            <span>Ir a rastrear pedido</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MissingConfirmation() {
  return (
    <div className="max-w-3xl mx-auto my-12 px-4">
      <div className="bg-[#FAF7E8] p-6 sm:p-10 rounded-3xl border-2 border-[#285F50] text-center shadow-lg space-y-6">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#23312C]">No pudimos verificar este pedido</h1>
        <p className="text-xs sm:text-sm text-[#6F8F69] max-w-lg mx-auto">No hay identificadores suficientes para consultar el pago de forma segura.</p>
        <Link href="/tienda" className="inline-flex py-3.5 px-6 bg-[#285F50] text-white font-bold text-xs rounded-xl shadow-md">
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams?.get('payment_id')?.trim() ?? '';
  const externalReference = searchParams?.get('external_reference')?.trim() ?? '';
  const orderNumber = searchParams?.get('order')?.trim() ?? '';
  const [demoOrder, setDemoOrder] = useState<DemoOrder | null | undefined>(undefined);

  useEffect(() => {
    setDemoOrder(orderNumber ? getDemoOrder(orderNumber) : null);
  }, [orderNumber]);

  if (paymentId && externalReference) {
    return <PaymentConfirmation paymentId={paymentId} externalReference={externalReference} />;
  }

  if (orderNumber) {
    if (demoOrder === undefined) return <div className="p-8 text-center text-xs">Cargando confirmación...</div>;
    return demoOrder ? <LegacyDemoConfirmation order={demoOrder} /> : <MissingConfirmation />;
  }

  return <MissingConfirmation />;
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Cargando confirmación...</div>}>
      <OrderConfirmationContent />
    </Suspense>
  );
}
