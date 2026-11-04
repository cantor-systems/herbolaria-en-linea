import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Clock3,
  MailWarning,
  MessageCircle,
  PackageCheck,
  PackageOpen,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { requireDispatchAdminSession } from '@/lib/dispatch/auth';
import {
  listApprovedDispatchOrders,
  type DispatchOrderListItem,
  type DispatchOrderSort,
} from '@/lib/dispatch/orders';
import { formatCurrency } from '@/lib/utils';
import { hasOrderShipment } from '@/lib/orders/types';

export const dynamic = 'force-dynamic';

type FulfillmentFilter = 'all' | 'pending' | 'shipped' | 'delivered';
type ShippingFilter = 'all' | 'standard' | 'express';
type StatusTone = 'green' | 'orange' | 'red' | 'neutral';

interface DispatchOrdersPageProps {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    shipping?: string | string[];
    order?: string | string[];
  }>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validFulfillmentFilter(value: string | undefined): FulfillmentFilter {
  return value === 'pending' || value === 'shipped' || value === 'delivered' ? value : 'all';
}

function validShippingFilter(value: string | undefined): ShippingFilter {
  return value === 'standard' || value === 'express' ? value : 'all';
}

function validOrder(value: string | undefined): DispatchOrderSort {
  return value === 'oldest' ? 'oldest' : 'newest';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(date);
}

function isWhatsAppPending(order: DispatchOrderListItem) {
  return (
    hasOrderShipment(order.fulfillmentStatus) &&
    order.whatsappNotificationsOptIn &&
    !order.whatsappShippingNotifiedAt
  );
}

function emailPresentation(order: DispatchOrderListItem): {
  label: string;
  tone: StatusTone;
} {
  if (order.fulfillmentStatus === 'pending') {
    return { label: 'Aún no aplica', tone: 'neutral' };
  }

  const status = order.shippingEmailNotification?.status;
  if (status === 'processing') return { label: 'En proceso', tone: 'neutral' };
  if (status === 'sent') return { label: 'Enviado', tone: 'green' };
  if (status === 'failed') return { label: 'Error', tone: 'red' };
  return { label: 'Pendiente', tone: 'orange' };
}

function whatsappPresentation(order: DispatchOrderListItem): {
  label: string;
  tone: StatusTone;
} {
  if (!order.whatsappNotificationsOptIn) {
    return { label: 'No autorizado', tone: 'neutral' };
  }
  if (order.fulfillmentStatus === 'pending') {
    return { label: 'Esperando envío', tone: 'neutral' };
  }
  if (order.whatsappShippingNotifiedAt) {
    return { label: 'Notificado', tone: 'green' };
  }
  return { label: 'Pendiente', tone: 'orange' };
}

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const toneClass = {
    green: 'border-[#4B8E6D] bg-[#193D2E] text-[#9ED8B7]',
    orange: 'border-[#9F7639] bg-[#392D1C] text-[#F0C586]',
    red: 'border-[#A65E62] bg-[#402526] text-[#F2ACAD]',
    neutral: 'border-[#3B4147] bg-[#292D31] text-[#B8BEC4]',
  }[tone];

  return (
    <span className={`inline-flex max-w-full rounded-md border px-2 py-1 text-xs font-semibold leading-5 ${toneClass}`}>
      {label}
    </span>
  );
}

function SummaryCard({
  label,
  count,
  description,
  icon,
  tone,
}: {
  label: string;
  count: number;
  description: string;
  icon: ReactNode;
  tone: 'green' | 'orange' | 'red' | 'neutral';
}) {
  const toneClass = {
    green: 'bg-[#193D2E] text-[#9ED8B7]',
    orange: 'bg-[#392D1C] text-[#F0C586]',
    red: 'bg-[#402526] text-[#F2ACAD]',
    neutral: 'bg-[#292D31] text-[#B8BEC4]',
  }[tone];

  return (
    <section className="rounded-2xl border border-[#3B4147] bg-[#1D2023] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#B8BEC4]">{label}</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-[#F2F3F3] tabular-nums">{count}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-[#B8BEC4]">{description}</p>
    </section>
  );
}

function orderAccent(order: DispatchOrderListItem) {
  if (order.shippingEmailNotification?.status === 'failed') {
    return 'border-l-[#BD7779] bg-[#1D2023]';
  }
  if (order.fulfillmentStatus === 'pending') {
    return 'border-l-[#C49B5D] bg-[#1D2023]';
  }
  if (isWhatsAppPending(order)) {
    return 'border-l-[#C49B5D] bg-[#1D2023]';
  }
  return 'border-l-transparent bg-[#1D2023]';
}

function OrderMobileCard({ order }: { order: DispatchOrderListItem }) {
  const isShipped = hasOrderShipment(order.fulfillmentStatus);
  const email = emailPresentation(order);
  const whatsapp = whatsappPresentation(order);

  return (
    <article
      className={`rounded-2xl border border-l-4 border-[#3B4147] p-5 shadow-sm ${orderAccent(order)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-[#F2F3F3]">
            Pedido #{order.publicOrderNumber}
          </p>
          <p className="mt-1 text-sm text-[#B8BEC4]">{formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge
          label={order.fulfillmentStatus === 'delivered' ? 'Entregado' : isShipped ? 'Enviado' : 'Pendiente de despacho'}
          tone={isShipped ? 'green' : 'orange'}
        />
      </div>

      <div className="mt-4 border-t border-[#3B4147] pt-4">
        <p className="text-base font-bold text-[#F2F3F3]">{order.customerName ?? 'Sin nombre'}</p>
        <p className="mt-1 break-all text-sm text-[#B8BEC4]">
          {order.customerEmail ?? 'Sin email'}
        </p>
        <p className="mt-1 text-sm text-[#B8BEC4]">
          {order.customerPhone ?? 'Sin teléfono'}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#111315] p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-[#B8BEC4]">Total</dt>
          <dd className="mt-1 text-sm font-bold text-[#F2F3F3]">
            {formatCurrency(order.totalCents)}
          </dd>
        </div>
        <div className="rounded-xl bg-[#111315] p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-[#B8BEC4]">Método</dt>
          <dd className="mt-1 text-sm font-bold capitalize text-[#F2F3F3]">
            {order.shippingMethod}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#B8BEC4]">Email</p>
          <StatusBadge label={email.label} tone={email.tone} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#B8BEC4]">WhatsApp</p>
          <StatusBadge label={whatsapp.label} tone={whatsapp.tone} />
        </div>
      </div>

      <Link
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-[#6D9B87] bg-[#276B55] px-4 py-2 text-sm font-semibold text-[#F2F3F3] transition hover:bg-[#2A735B] focus:outline-none focus:ring-4 focus:ring-[#D2D8DD]/60"
        href={`/operaciones/despacho/${order.id}`}
      >
        {isShipped ? 'Ver envío' : 'Preparar envío'}
        <ChevronRight aria-hidden="true" size={17} />
      </Link>
    </article>
  );
}

export default async function DispatchOrdersPage({ searchParams }: DispatchOrdersPageProps) {
  await requireDispatchAdminSession();

  const queryParams = await searchParams;
  const statusFilter = validFulfillmentFilter(firstParam(queryParams.status));
  const shippingFilter = validShippingFilter(firstParam(queryParams.shipping));
  const orderSort = validOrder(firstParam(queryParams.order));
  const searchValue = (firstParam(queryParams.q) ?? '').trim().slice(0, 100);
  const hasActiveFilters =
    Boolean(searchValue) ||
    statusFilter !== 'all' ||
    shippingFilter !== 'all' ||
    orderSort !== 'newest';

  let orders: DispatchOrderListItem[];
  let metricOrders: DispatchOrderListItem[];
  try {
    const tableOrdersRequest = listApprovedDispatchOrders({
      search: searchValue,
      fulfillmentStatus: statusFilter === 'all' ? undefined : statusFilter,
      shippingMethod: shippingFilter === 'all' ? undefined : shippingFilter,
      sort: orderSort,
    });

    if (hasActiveFilters) {
      [orders, metricOrders] = await Promise.all([
        tableOrdersRequest,
        listApprovedDispatchOrders(),
      ]);
    } else {
      orders = await tableOrdersRequest;
      metricOrders = orders;
    }
  } catch {
    return (
      <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#A65E62] bg-[#402526] p-5 text-[#F2ACAD]" role="alert">
          <h1 className="text-lg font-bold">No fue posible cargar los pedidos</h1>
          <p className="mt-1 text-sm">Revisa la conexión del servidor e inténtalo nuevamente.</p>
        </div>
      </main>
    );
  }

  const metrics = {
    pending: metricOrders.filter((order) => order.fulfillmentStatus === 'pending').length,
    shipped: metricOrders.filter((order) => hasOrderShipment(order.fulfillmentStatus)).length,
    emailFailed: metricOrders.filter(
      (order) => order.shippingEmailNotification?.status === 'failed'
    ).length,
    whatsappPending: metricOrders.filter(isWhatsAppPending).length,
  };

  const emptyMessage =
    statusFilter === 'pending' && !searchValue && shippingFilter === 'all'
      ? 'No hay pedidos pendientes de despacho.'
      : 'No se encontraron pedidos con estos filtros.';

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#B8BEC4]">
          Cola operativa
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#F2F3F3]">
          Pedidos aprobados
        </h1>
        <p className="mt-2 text-base text-[#B8BEC4]">
          Filtra la cola operativa y ordénala por la fecha real de cada pedido.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          count={metrics.pending}
          description={
            metrics.pending === 0
              ? 'No hay pedidos pendientes de despacho.'
              : 'Requieren preparación de envío.'
          }
          icon={<Clock3 aria-hidden="true" size={20} />}
          label="Pendientes de despacho"
          tone="orange"
        />
        <SummaryCard
          count={metrics.shipped}
          description="Enviados y entregados dentro de la muestra reciente."
          icon={<PackageCheck aria-hidden="true" size={20} />}
          label="Enviados"
          tone="green"
        />
        <SummaryCard
          count={metrics.emailFailed}
          description={
            metrics.emailFailed === 0
              ? 'No hay incidencias de email.'
              : 'Requieren reintentar el email de envío.'
          }
          icon={<MailWarning aria-hidden="true" size={20} />}
          label="Email de envío con error"
          tone="red"
        />
        <SummaryCard
          count={metrics.whatsappPending}
          description="Enviados y autorizados, pendientes de confirmación."
          icon={<MessageCircle aria-hidden="true" size={20} />}
          label="WhatsApp pendiente"
          tone="neutral"
        />
      </div>

      <form
        action="/operaciones/despacho#resultados"
        className="mt-7 grid gap-4 rounded-2xl border border-[#59636D] bg-[#292D31] p-4 sm:grid-cols-2 sm:items-end sm:p-5 xl:grid-cols-[minmax(220px,1fr)_130px_130px_200px_auto]"
        method="get"
      >
        <div>
          <label className="mb-2 block text-sm font-bold text-[#F2F3F3]" htmlFor="dispatch-search">
            Buscar pedido
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B8BEC4]"
              size={18}
            />
            <input
              className="min-h-11 w-full rounded-xl border border-[#77818B] bg-[#111315] py-2.5 pl-11 pr-4 text-base text-[#F2F3F3] placeholder:text-[#9CA6AF] outline-none focus:border-[#D2D8DD] focus:ring-4 focus:ring-[#D2D8DD]/60"
              defaultValue={searchValue}
              id="dispatch-search"
              maxLength={100}
              name="q"
              placeholder="Pedido, referencia, nombre, email, teléfono o guía"
              type="search"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-[#F2F3F3]" htmlFor="status-filter">
            Estado
          </label>
          <select
            className="min-h-11 w-full rounded-xl border border-[#77818B] bg-[#111315] px-3 py-2.5 text-base text-[#F2F3F3] placeholder:text-[#9CA6AF] outline-none focus:border-[#D2D8DD] focus:ring-4 focus:ring-[#D2D8DD]/60"
            defaultValue={statusFilter}
            id="status-filter"
            name="status"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="shipped">Enviados</option>
            <option value="delivered">Entregados</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-[#F2F3F3]" htmlFor="shipping-filter">
            Método
          </label>
          <select
            className="min-h-11 w-full rounded-xl border border-[#77818B] bg-[#111315] px-3 py-2.5 text-base text-[#F2F3F3] placeholder:text-[#9CA6AF] outline-none focus:border-[#D2D8DD] focus:ring-4 focus:ring-[#D2D8DD]/60"
            defaultValue={shippingFilter}
            id="shipping-filter"
            name="shipping"
          >
            <option value="all">Todos</option>
            <option value="standard">Standard</option>
            <option value="express">Express</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-[#F2F3F3]" htmlFor="order-filter">
            Orden
          </label>
          <select
            className="min-h-11 w-full rounded-xl border border-[#77818B] bg-[#111315] px-3 py-2.5 text-base text-[#F2F3F3] placeholder:text-[#9CA6AF] outline-none focus:border-[#D2D8DD] focus:ring-4 focus:ring-[#D2D8DD]/60"
            defaultValue={orderSort}
            id="order-filter"
            name="order"
          >
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguos primero</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1 xl:flex-nowrap">
          <button
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#276B55] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#2A735B] focus:outline-none focus:ring-4 focus:ring-[#D2D8DD]/60 md:flex-none"
            type="submit"
          >
            <SlidersHorizontal aria-hidden="true" size={17} /> Aplicar
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#77818B] bg-[#111315] px-4 py-2.5 text-sm font-bold text-[#F2F3F3] transition hover:border-[#D2D8DD] focus:outline-none focus:ring-4 focus:ring-[#D2D8DD]/60"
            href="/operaciones/despacho#resultados"
          >
            Limpiar
          </Link>
        </div>
      </form>

      <div
        className="mt-5 flex scroll-mt-24 items-center justify-between gap-4"
        id="resultados"
      >
        <p className="text-sm font-semibold text-[#B8BEC4]">
          {orders.length} {orders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
        </p>
        <p className="hidden text-sm text-[#B8BEC4] sm:block">
          Máximo 100 pedidos aprobados
        </p>
      </div>

      {orders.length === 0 && !hasActiveFilters ? (
        <div className="mt-5 flex flex-col items-center rounded-3xl border border-dashed border-[#59636D] bg-[#1D2023] px-6 py-14 text-center">
          <PackageOpen aria-hidden="true" className="text-[#B8BEC4]" size={36} />
          <h2 className="mt-4 text-xl font-bold">No hay pedidos pendientes de despacho.</h2>
          <p className="mt-1 text-base text-[#B8BEC4]">Tampoco hay pedidos aprobados recientes.</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-3xl border border-dashed border-[#59636D] bg-[#1D2023] px-6 py-14 text-center">
          <Search aria-hidden="true" className="text-[#B8BEC4]" size={34} />
          <h2 className="mt-4 text-xl font-bold">{emptyMessage}</h2>
          <Link className="mt-4 text-sm font-bold text-[#B8BEC4] underline underline-offset-4" href="/operaciones/despacho#resultados">
            Limpiar búsqueda y filtros
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:hidden">
            {orders.map((order) => (
              <OrderMobileCard key={order.id} order={order} />
            ))}
          </div>

          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-[#3B4147] bg-[#1D2023] xl:block">
            <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[22%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="border-b border-[#59636D] bg-[#292D31] text-xs text-[#B8BEC4]">
                <tr>
                  <th className="px-3.5 py-3.5 font-bold">Fecha</th>
                  <th className="px-3 py-3.5 font-semibold">Pedido</th>
                  <th className="px-3 py-3.5 font-semibold">Cliente</th>
                  <th className="px-3.5 py-3.5 font-bold">Total</th>
                  <th className="px-3.5 py-3.5 font-bold">Método</th>
                  <th className="px-3.5 py-3.5 font-bold">Fulfillment</th>
                  <th className="px-3.5 py-3.5 font-bold">Email</th>
                  <th className="px-3.5 py-3.5 font-bold">WhatsApp</th>
                  <th className="px-3.5 py-3.5"><span className="sr-only">Acción</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#4E565F]">
                {orders.map((order) => {
                  const isShipped = hasOrderShipment(order.fulfillmentStatus);
                  const email = emailPresentation(order);
                  const whatsapp = whatsappPresentation(order);
                  return (
                    <tr
                      className={`border-l-4 align-top transition even:bg-[#23272B] hover:bg-[#353B41] ${orderAccent(order)}`}
                      key={order.id}
                    >
                      <td className="px-3 py-5 text-sm leading-6 text-[#B8BEC4] tabular-nums">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="break-words px-3 py-5 text-sm font-semibold text-[#F2F3F3]">
                        #{order.publicOrderNumber}
                      </td>
                      <td className="px-3 py-5 text-sm text-[#F2F3F3] [overflow-wrap:anywhere]">
                        <span className="block font-bold">{order.customerName ?? 'Sin nombre'}</span>
                        <span className="mt-1 block break-words text-[#B8BEC4]">
                          {order.customerEmail ?? 'Sin email'}
                        </span>
                        <span className="mt-1 block text-[#B8BEC4]">
                          {order.customerPhone ?? 'Sin teléfono'}
                        </span>
                      </td>
                      <td className="px-3 py-5 text-sm font-semibold text-[#F2F3F3] tabular-nums">
                        {formatCurrency(order.totalCents)}
                      </td>
                      <td className="px-3.5 py-4 text-sm text-[#B8BEC4]">
                        <span className="block capitalize">{order.shippingMethod}</span>
                        {order.shippingCarrier && (
                          <span className="mt-1 block text-xs">{order.shippingCarrier}</span>
                        )}
                      </td>
                      <td className="px-3.5 py-4">
                        <StatusBadge
                          label={order.fulfillmentStatus === 'delivered' ? 'Entregado' : isShipped ? 'Enviado' : 'Pendiente'}
                          tone={isShipped ? 'green' : 'orange'}
                        />
                      </td>
                      <td className="px-3.5 py-4">
                        <StatusBadge label={email.label} tone={email.tone} />
                      </td>
                      <td className="px-3.5 py-4">
                        <StatusBadge label={whatsapp.label} tone={whatsapp.tone} />
                      </td>
                      <td className="px-3.5 py-4 text-right">
                        <Link
                          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-[#6D9B87] bg-[#276B55] px-3 py-2 text-center text-xs font-semibold text-[#F2F3F3] transition hover:bg-[#2A735B] focus:outline-none focus:ring-4 focus:ring-[#D2D8DD]/60"
                          href={`/operaciones/despacho/${order.id}`}
                        >
                          {isShipped ? 'Ver envío' : 'Preparar envío'}
                          <ChevronRight aria-hidden="true" size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
