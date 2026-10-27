import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Truck,
  UserRound,
} from 'lucide-react';
import {
  confirmWhatsAppSentAction,
  markOrderShippedAction,
  retryShippingEmailAction,
} from '@/app/operaciones/actions';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { requireDispatchAdminSession } from '@/lib/dispatch/auth';
import {
  getApprovedDispatchOrder,
  type ShippingEmailNotificationStatus,
} from '@/lib/dispatch/orders';
import { buildWhatsAppShippingUrl } from '@/lib/dispatch/whatsapp';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface DispatchOrderDetailPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{
    shipment?: string | string[];
    email?: string | string[];
    whatsapp?: string | string[];
  }>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(date);
}

function Panel({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 shadow-[0_10px_30px_rgba(35,49,44,0.05)] sm:p-6 ${className}`}
    >
      <div className="mb-5 flex items-center gap-3 border-b border-[#D9D1B9] pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#285F50]/10 text-[#285F50]">
          {icon}
        </span>
        <h2 className="text-base font-bold uppercase tracking-[0.08em] text-[#23312C]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function DataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[#D9D1B9]/70 py-3 last:border-0 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-[#23312C]/60">{label}</dt>
      <dd className="break-words text-base font-semibold text-[#23312C]">{children}</dd>
    </div>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: 'green' | 'orange' | 'red' | 'neutral' }) {
  const toneClass = {
    green: 'bg-[#285F50]/12 text-[#285F50]',
    orange: 'bg-[#D17B24]/15 text-[#98552B]',
    red: 'bg-red-100 text-red-800',
    neutral: 'bg-[#23312C]/8 text-[#23312C]/75',
  }[tone];
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${toneClass}`}>{children}</span>;
}

function emailStatusPresentation(status: ShippingEmailNotificationStatus | undefined) {
  if (status === 'sent') return { label: 'Email enviado', tone: 'green' as const };
  if (status === 'failed') return { label: 'Email fallido', tone: 'red' as const };
  if (status === 'processing') return { label: 'Email en proceso', tone: 'neutral' as const };
  return { label: 'Email pendiente', tone: 'orange' as const };
}

function actionNotice({
  shipment,
  email,
  whatsapp,
}: {
  shipment?: string;
  email?: string;
  whatsapp?: string;
}) {
  if (shipment === 'sent') return { text: 'Pedido marcado como enviado.', success: true };
  if (shipment === 'invalid') return { text: 'Revisa la paquetería, la guía y la URL HTTPS de rastreo.', success: false };
  if (shipment === 'conflict') return { text: 'El pedido ya fue enviado con datos de rastreo diferentes.', success: false };
  if (shipment === 'failed' || shipment === 'unavailable') return { text: 'No fue posible marcar el pedido como enviado.', success: false };
  if (email === 'sent') return { text: 'El email de envío fue enviado.', success: true };
  if (email === 'already-sent') return { text: 'El email ya estaba enviado; no se generó un duplicado.', success: true };
  if (email === 'pending') return { text: 'El email sigue pendiente de procesamiento.', success: false };
  if (email === 'failed') return { text: 'El reintento del email falló. El pedido permanece enviado.', success: false };
  if (email === 'unavailable') return { text: 'El email de envío sólo puede procesarse para pedidos enviados.', success: false };
  if (whatsapp === 'confirmed') return { text: 'WhatsApp marcado como notificado.', success: true };
  if (whatsapp === 'failed') return { text: 'No fue posible confirmar la notificación por WhatsApp.', success: false };
  return null;
}

function safeTrackingUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function DispatchOrderDetailPage({
  params,
  searchParams,
}: DispatchOrderDetailPageProps) {
  await requireDispatchAdminSession();
  const { orderId } = await params;
  if (!UUID_PATTERN.test(orderId)) notFound();

  let order;
  try {
    order = await getApprovedDispatchOrder(orderId);
  } catch {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#285F50]" href="/operaciones/despacho">
          <ArrowLeft aria-hidden="true" size={17} /> Volver a pedidos
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900" role="alert">
          <h1 className="text-lg font-bold">No fue posible cargar el pedido</h1>
          <p className="mt-1 text-sm">Revisa la conexión del servidor e inténtalo nuevamente.</p>
        </div>
      </main>
    );
  }
  if (!order) notFound();

  const query = await searchParams;
  const notice = actionNotice({
    shipment: firstParam(query.shipment),
    email: firstParam(query.email),
    whatsapp: firstParam(query.whatsapp),
  });
  const isShipped = order.fulfillmentStatus === 'shipped';
  const emailStatus = emailStatusPresentation(order.shippingEmailNotification?.status);
  const trackingUrl = safeTrackingUrl(order.trackingUrl);
  const whatsappUrl =
    isShipped && order.whatsappNotificationsOptIn
      ? buildWhatsAppShippingUrl(order)
      : null;
  const shippingEstimate =
    order.shippingMethod === 'express'
      ? SHIPPING_CONFIG.expressEstimatedDays
      : SHIPPING_CONFIG.standardEstimatedDays;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <Link
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-bold text-[#285F50] focus:outline-none focus:ring-4 focus:ring-[#285F50]/15"
        href="/operaciones/despacho"
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a pedidos
      </Link>

      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#285F50]">Pedido</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#23312C] sm:text-3xl">
            Pedido #{order.publicOrderNumber}
          </h1>
          <p className="mt-2 text-base text-[#23312C]/65">Creado {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="green">Pago aprobado</StatusPill>
          <StatusPill tone={isShipped ? 'green' : 'orange'}>
            {isShipped ? 'Enviado' : 'Pendiente de despacho'}
          </StatusPill>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-6 rounded-2xl border px-5 py-4 text-sm font-bold ${
            notice.success
              ? 'border-[#285F50]/25 bg-[#285F50]/10 text-[#285F50]'
              : 'border-[#D17B24]/35 bg-[#D17B24]/10 text-[#98552B]'
          }`}
          role="status"
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel icon={<PackageCheck aria-hidden="true" size={20} />} title="Pedido">
          <dl>
            <DataRow label="Número de pedido">#{order.publicOrderNumber}</DataRow>
            <DataRow label="Referencia técnica">{order.externalReference}</DataRow>
            <DataRow label="Fecha">{formatDateTime(order.createdAt)}</DataRow>
            <DataRow label="Estado de pago"><StatusPill tone="green">Aprobado</StatusPill></DataRow>
            <DataRow label="Estado fulfillment">
              <StatusPill tone={isShipped ? 'green' : 'orange'}>{isShipped ? 'Enviado' : 'Pendiente'}</StatusPill>
            </DataRow>
            <DataRow label="Total">{formatCurrency(order.totalCents, order.currency)}</DataRow>
          </dl>
        </Panel>

        <Panel icon={<UserRound aria-hidden="true" size={20} />} title="Cliente">
          <dl>
            <DataRow label="Nombre">{order.customerName ?? '—'}</DataRow>
            <DataRow label="Email">{order.customerEmail ?? '—'}</DataRow>
            <DataRow label="Teléfono">{order.customerPhone ?? '—'}</DataRow>
          </dl>
        </Panel>

        <Panel icon={<MapPin aria-hidden="true" size={20} />} title="Dirección">
          {order.shippingAddress ? (
            <dl>
              <DataRow label="Calle">{order.shippingAddress.streetAddress}</DataRow>
              <DataRow label="Colonia">{order.shippingAddress.colonia}</DataRow>
              <DataRow label="Ciudad">{order.shippingAddress.city}</DataRow>
              <DataRow label="Estado">{order.shippingAddress.state}</DataRow>
              <DataRow label="Código postal">{order.shippingAddress.postalCode}</DataRow>
              <DataRow label="País">{order.shippingAddress.country}</DataRow>
            </dl>
          ) : (
            <p className="text-base text-[#23312C]/65">Dirección no disponible.</p>
          )}
        </Panel>

        <Panel icon={<Truck aria-hidden="true" size={20} />} title="Método de envío">
          <dl>
            <DataRow label="Servicio">
              {order.shippingMethod === 'express' ? 'Express' : 'Standard'}
            </DataRow>
            <DataRow label="Plazo estimado">{shippingEstimate}</DataRow>
            <DataRow label="Costo">{formatCurrency(order.shippingCents)}</DataRow>
          </dl>
        </Panel>

        <Panel className="lg:col-span-2" icon={<PackageCheck aria-hidden="true" size={20} />} title="Productos">
          {order.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="text-sm text-[#23312C]/60">
                  <tr>
                    <th className="border-b border-[#D9D1B9] pb-3 font-semibold">Producto</th>
                    <th className="border-b border-[#D9D1B9] pb-3 font-semibold">Variante</th>
                    <th className="border-b border-[#D9D1B9] pb-3 text-right font-semibold">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9D1B9]/70">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 pr-4 text-base font-bold">{item.productName}</td>
                      <td className="py-4 pr-4 text-base text-[#23312C]/75">{item.variantLabel}</td>
                      <td className="py-4 text-right text-base font-bold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-base text-[#23312C]/65">No hay productos registrados.</p>
          )}
        </Panel>

        <Panel className="lg:col-span-2" icon={<Truck aria-hidden="true" size={20} />} title="Envío">
          {!isShipped ? (
            <form action={markOrderShippedAction} className="grid gap-5 lg:grid-cols-2">
              <input name="orderId" type="hidden" value={order.id} />
              <div>
                <label className="mb-2 block text-sm font-bold" htmlFor="shipping-carrier">Paquetería</label>
                <input
                  className="min-h-12 w-full rounded-xl border border-[#D9D1B9] bg-white px-4 py-3 text-base outline-none focus:border-[#285F50] focus:ring-4 focus:ring-[#285F50]/10"
                  id="shipping-carrier"
                  list="shipping-carriers"
                  maxLength={100}
                  name="shippingCarrier"
                  required
                />
                <datalist id="shipping-carriers">
                  {SHIPPING_CONFIG.couriers.map((courier) => <option key={courier} value={courier} />)}
                </datalist>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold" htmlFor="tracking-number">Número de guía</label>
                <input
                  className="min-h-12 w-full rounded-xl border border-[#D9D1B9] bg-white px-4 py-3 text-base outline-none focus:border-[#285F50] focus:ring-4 focus:ring-[#285F50]/10"
                  id="tracking-number"
                  maxLength={120}
                  name="trackingNumber"
                  required
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-bold" htmlFor="tracking-url">URL de rastreo</label>
                <input
                  className="min-h-12 w-full rounded-xl border border-[#D9D1B9] bg-white px-4 py-3 text-base outline-none focus:border-[#285F50] focus:ring-4 focus:ring-[#285F50]/10"
                  id="tracking-url"
                  maxLength={2048}
                  name="trackingUrl"
                  placeholder="https://..."
                  required
                  type="url"
                />
              </div>
              <div className="lg:col-span-2">
                <button className="min-h-12 rounded-xl bg-[#D17B24] px-6 py-3 text-base font-bold text-white transition hover:bg-[#98552B] focus:outline-none focus:ring-4 focus:ring-[#D17B24]/20" type="submit">
                  Marcar como enviado
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <dl>
                <DataRow label="Paquetería">{order.shippingCarrier ?? '—'}</DataRow>
                <DataRow label="Número de guía">{order.trackingNumber ?? '—'}</DataRow>
                <DataRow label="Fecha de envío">{formatDateTime(order.shippedAt)}</DataRow>
                <DataRow label="Rastreo">
                  {trackingUrl ? (
                    <a className="inline-flex items-center gap-2 text-[#285F50] underline decoration-[#285F50]/35 underline-offset-4" href={trackingUrl} rel="noopener noreferrer" target="_blank">
                      Abrir rastreo <ExternalLink aria-hidden="true" size={16} />
                    </a>
                  ) : '—'}
                </DataRow>
              </dl>
              <div className="rounded-2xl border border-[#D9D1B9] bg-white p-5 lg:min-w-64">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-[#23312C]/65">Notificación</span>
                  <StatusPill tone={emailStatus.tone}>{emailStatus.label}</StatusPill>
                </div>
                {order.shippingEmailNotification?.sentAt && (
                  <p className="mt-3 text-sm text-[#23312C]/65">{formatDateTime(order.shippingEmailNotification.sentAt)}</p>
                )}
                <form action={retryShippingEmailAction} className="mt-4">
                  <input name="orderId" type="hidden" value={order.id} />
                  <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#285F50] px-4 py-2 text-sm font-bold text-[#285F50] transition hover:bg-[#285F50]/8 focus:outline-none focus:ring-4 focus:ring-[#285F50]/15" type="submit">
                    <RotateCcw aria-hidden="true" size={16} /> Reintentar email de envío
                  </button>
                </form>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-2" icon={<MessageCircle aria-hidden="true" size={20} />} title="WhatsApp">
          {!order.whatsappNotificationsOptIn ? (
            <div className="rounded-2xl border border-[#D9D1B9] bg-[#23312C]/5 p-5">
              <StatusPill tone="neutral">No autorizado por el cliente</StatusPill>
              <p className="mt-3 text-sm leading-6 text-[#23312C]/65">No aceptó notificaciones por WhatsApp. No se puede generar un enlace para este pedido.</p>
            </div>
          ) : order.whatsappShippingNotifiedAt ? (
            <div className="rounded-2xl border border-[#285F50]/25 bg-[#285F50]/10 p-5">
              <div className="flex items-center gap-2 font-bold text-[#285F50]">
                <CheckCircle2 aria-hidden="true" size={20} /> WhatsApp notificado
              </div>
              <p className="mt-2 text-sm text-[#23312C]/70">Aceptó notificaciones por WhatsApp · {formatDateTime(order.whatsappShippingNotifiedAt)}</p>
            </div>
          ) : !isShipped ? (
            <div className="rounded-2xl border border-[#285F50]/25 bg-[#285F50]/10 p-5">
              <StatusPill tone="green">Aceptó notificaciones por WhatsApp</StatusPill>
              <p className="mt-3 text-sm leading-6 text-[#23312C]/70">El enlace se habilitará cuando el pedido esté enviado.</p>
            </div>
          ) : !whatsappUrl ? (
            <div className="rounded-2xl border border-[#D17B24]/35 bg-[#D17B24]/10 p-5">
              <StatusPill tone="orange">Aceptó notificaciones por WhatsApp</StatusPill>
              <p className="mt-3 text-sm leading-6 text-[#23312C]/70">El teléfono no se puede normalizar de forma segura para México. No se generó un enlace.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#285F50]/25 bg-[#285F50]/10 p-5">
                <StatusPill tone="green">Aceptó notificaciones por WhatsApp</StatusPill>
                <p className="mt-3 text-sm leading-6 text-[#23312C]/70">Abre el mensaje prellenado y envíalo manualmente. Abrir WhatsApp no cambia el estado del pedido.</p>
                <a className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#285F50] px-5 py-3 text-base font-bold text-white transition hover:bg-[#23312C] focus:outline-none focus:ring-4 focus:ring-[#285F50]/20" href={whatsappUrl} rel="noopener noreferrer" target="_blank">
                  <MessageCircle aria-hidden="true" size={19} /> Notificar por WhatsApp
                </a>
              </div>
              <div className="rounded-2xl border border-[#D9D1B9] bg-white p-5">
                <p className="text-sm leading-6 text-[#23312C]/70">Después de enviar el mensaje en WhatsApp Web, confirma aquí el paso manual.</p>
                <form action={confirmWhatsAppSentAction} className="mt-4">
                  <input name="orderId" type="hidden" value={order.id} />
                  <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#285F50] px-5 py-3 text-base font-bold text-[#285F50] transition hover:bg-[#285F50]/8 focus:outline-none focus:ring-4 focus:ring-[#285F50]/15" type="submit">
                    <CheckCircle2 aria-hidden="true" size={19} /> Confirmar que ya envié el WhatsApp
                  </button>
                </form>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}
