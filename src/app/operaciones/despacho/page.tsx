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

export const dynamic = 'force-dynamic';

type FulfillmentFilter = 'all' | 'pending' | 'shipped';
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
  return value === 'pending' || value === 'shipped' ? value : 'all';
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
    order.fulfillmentStatus === 'shipped' &&
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
    green: 'border-[#285F50]/20 bg-[#285F50]/10 text-[#285F50]',
    orange: 'border-[#D17B24]/25 bg-[#D17B24]/10 text-[#98552B]',
    red: 'border-[#98552B]/25 bg-[#98552B]/10 text-[#7A3F22]',
    neutral: 'border-[#23312C]/15 bg-[#23312C]/5 text-[#23312C]/70',
  }[tone];

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${toneClass}`}>
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
    green: 'bg-[#285F50]/10 text-[#285F50]',
    orange: 'bg-[#D17B24]/10 text-[#98552B]',
    red: 'bg-[#98552B]/10 text-[#7A3F22]',
    neutral: 'bg-[#23312C]/7 text-[#23312C]/70',
  }[tone];

  return (
    <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 shadow-[0_10px_25px_rgba(35,49,44,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#23312C]/65">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#23312C]">{count}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-[#23312C]/60">{description}</p>
    </section>
  );
}

function orderAccent(order: DispatchOrderListItem) {
  if (order.shippingEmailNotification?.status === 'failed') {
    return 'border-l-[#98552B] bg-[#98552B]/5';
  }
  if (order.fulfillmentStatus === 'pending') {
    return 'border-l-[#D17B24] bg-[#D17B24]/5';
  }
  if (isWhatsAppPending(order)) {
    return 'border-l-[#6F8F69] bg-[#6F8F69]/5';
  }
  return 'border-l-transparent bg-[#FAF7E8]';
}

function OrderMobileCard({ order }: { order: DispatchOrderListItem }) {
  const isShipped = order.fulfillmentStatus === 'shipped';
  const email = emailPresentation(order);
  const whatsapp = whatsappPresentation(order);

  return (
    <article
      className={`rounded-2xl border border-l-4 border-[#D9D1B9] p-5 shadow-[0_8px_24px_rgba(35,49,44,0.04)] ${orderAccent(order)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-[#23312C]">
            Pedido #{order.publicOrderNumber}
          </p>
          <p className="mt-1 text-sm text-[#23312C]/60">{formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge
          label={isShipped ? 'Enviado' : 'Pendiente de despacho'}
          tone={isShipped ? 'green' : 'orange'}
        />
      </div>

      <div className="mt-4 border-t border-[#D9D1B9] pt-4">
        <p className="text-base font-bold text-[#23312C]">{order.customerName ?? 'Sin nombre'}</p>
        <p className="mt-1 break-all text-sm text-[#23312C]/70">
          {order.customerEmail ?? 'Sin email'}
        </p>
        <p className="mt-1 text-sm text-[#23312C]/70">
          {order.customerPhone ?? 'Sin teléfono'}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-[#23312C]/50">Total</dt>
          <dd className="mt-1 text-sm font-bold text-[#23312C]">
            {formatCurrency(order.totalCents)}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-xs font-bold uppercase tracking-wide text-[#23312C]/50">Método</dt>
          <dd className="mt-1 text-sm font-bold capitalize text-[#23312C]">
            {order.shippingMethod}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#23312C]/50">Email</p>
          <StatusBadge label={email.label} tone={email.tone} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#23312C]/50">WhatsApp</p>
          <StatusBadge label={whatsapp.label} tone={whatsapp.tone} />
        </div>
      </div>

      <Link
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-[#23312C] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#285F50] focus:outline-none focus:ring-4 focus:ring-[#285F50]/20"
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
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900" role="alert">
          <h1 className="text-lg font-bold">No fue posible cargar los pedidos</h1>
          <p className="mt-1 text-sm">Revisa la conexión del servidor e inténtalo nuevamente.</p>
        </div>
      </main>
    );
  }

  const metrics = {
    pending: metricOrders.filter((order) => order.fulfillmentStatus === 'pending').length,
    shipped: metricOrders.filter((order) => order.fulfillmentStatus === 'shipped').length,
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
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#285F50]">
          Cola operativa
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#23312C]">
          Pedidos aprobados
        </h1>
        <p className="mt-2 text-base text-[#23312C]/70">
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
          description="Pedidos enviados dentro de la muestra reciente."
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
        className="mt-6 grid gap-4 rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-4 shadow-[0_8px_25px_rgba(35,49,44,0.04)] sm:grid-cols-2 sm:items-end xl:grid-cols-[minmax(220px,1fr)_150px_150px_190px_auto]"
        method="get"
      >
        <div>
          <label className="mb-2 block text-sm font-bold text-[#23312C]" htmlFor="dispatch-search">
            Buscar pedido
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#285F50]"
              size={18}
            />
            <input
              className="min-h-11 w-full rounded-xl border border-[#D9D1B9] bg-white py-2.5 pl-11 pr-4 text-base text-[#23312C] outline-none focus:border-[#285F50] focus:ring-4 focus:ring-[#285F50]/10"
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
          <label className="mb-2 block text-sm font-bold text-[#23312C]" htmlFor="status-filter">
            Estado
          </label>
          <select
            className="min-h-11 w-full rounded-xl border border-[#D9D1B9] bg-white px-3 py-2.5 text-base text-[#23312C] outline-none focus:border-[#285F50] focus:ring-4 focus:ring-[#285F50]/10"
            defaultValue={statusFilter}
            id="status-filter"
            name="status"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="shipped">Enviados</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-[#23312C]" htmlFor="shipping-filter">
            Método
          </label>
          <select
            className="min-h-11 w-full rounded-xl border border-[#D9D1B9] bg-white px-3 py-2.5 text-base text-[#23312C] outline-none focus:border-[#285F50] focus:ring-4 focus:ring-[#285F50]/10"
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
          <label className="mb-2 block text-sm font-bold text-[#23312C]" htmlFor="order-filter">
            Orden
          </label>
          <select
            className="min-h-11 w-full rounded-xl border border-[#D9D1B9] bg-white px-3 py-2.5 text-base text-[#23312C] outline-none focus:border-[#285F50] focus:ring-4 focus:ring-[#285F50]/10"
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
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#285F50] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#23312C] focus:outline-none focus:ring-4 focus:ring-[#285F50]/20 md:flex-none"
            type="submit"
          >
            <SlidersHorizontal aria-hidden="true" size={17} /> Aplicar
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D9D1B9] bg-white px-4 py-2.5 text-sm font-bold text-[#23312C] transition hover:border-[#285F50] focus:outline-none focus:ring-4 focus:ring-[#285F50]/10"
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
        <p className="text-sm font-semibold text-[#23312C]/65">
          {orders.length} {orders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
        </p>
        <p className="hidden text-sm text-[#23312C]/55 sm:block">
          Máximo 100 pedidos aprobados
        </p>
      </div>

      {orders.length === 0 && !hasActiveFilters ? (
        <div className="mt-5 flex flex-col items-center rounded-3xl border border-dashed border-[#285F50]/30 bg-[#FAF7E8] px-6 py-14 text-center">
          <PackageOpen aria-hidden="true" className="text-[#285F50]" size={36} />
          <h2 className="mt-4 text-xl font-bold">No hay pedidos pendientes de despacho.</h2>
          <p className="mt-1 text-base text-[#23312C]/65">Tampoco hay pedidos aprobados recientes.</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-3xl border border-dashed border-[#285F50]/30 bg-[#FAF7E8] px-6 py-14 text-center">
          <Search aria-hidden="true" className="text-[#285F50]" size={34} />
          <h2 className="mt-4 text-xl font-bold">{emptyMessage}</h2>
          <Link className="mt-4 text-sm font-bold text-[#285F50] underline underline-offset-4" href="/operaciones/despacho#resultados">
            Limpiar búsqueda y filtros
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 lg:hidden">
            {orders.map((order) => (
              <OrderMobileCard key={order.id} order={order} />
            ))}
          </div>

          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] shadow-[0_12px_35px_rgba(35,49,44,0.06)] lg:block">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead className="bg-[#285F50] text-sm text-white">
                <tr>
                  <th className="px-3.5 py-3.5 font-bold">Fecha</th>
                  <th className="w-[190px] px-4 py-3.5 font-bold">Pedido</th>
                  <th className="w-[270px] px-4 py-3.5 font-bold">Cliente</th>
                  <th className="px-3.5 py-3.5 font-bold">Total</th>
                  <th className="px-3.5 py-3.5 font-bold">Método</th>
                  <th className="px-3.5 py-3.5 font-bold">Fulfillment</th>
                  <th className="px-3.5 py-3.5 font-bold">Email</th>
                  <th className="px-3.5 py-3.5 font-bold">WhatsApp</th>
                  <th className="px-3.5 py-3.5"><span className="sr-only">Acción</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D1B9]">
                {orders.map((order) => {
                  const isShipped = order.fulfillmentStatus === 'shipped';
                  const email = emailPresentation(order);
                  const whatsapp = whatsappPresentation(order);
                  return (
                    <tr
                      className={`border-l-4 align-top transition hover:bg-white/70 ${orderAccent(order)}`}
                      key={order.id}
                    >
                      <td className="whitespace-nowrap px-3.5 py-4 text-sm text-[#23312C]/70">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="w-[190px] min-w-[190px] max-w-[220px] break-words px-4 py-4 text-sm font-bold text-[#23312C]">
                        #{order.publicOrderNumber}
                      </td>
                      <td className="w-[270px] min-w-[250px] max-w-[300px] px-4 py-4 text-sm text-[#23312C]">
                        <span className="block font-bold">{order.customerName ?? 'Sin nombre'}</span>
                        <span className="mt-1 block break-words text-[#23312C]/65">
                          {order.customerEmail ?? 'Sin email'}
                        </span>
                        <span className="mt-1 block text-[#23312C]/65">
                          {order.customerPhone ?? 'Sin teléfono'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-4 text-sm font-bold text-[#23312C]">
                        {formatCurrency(order.totalCents)}
                      </td>
                      <td className="px-3.5 py-4 text-sm text-[#23312C]/75">
                        <span className="block capitalize">{order.shippingMethod}</span>
                        {order.shippingCarrier && (
                          <span className="mt-1 block text-xs">{order.shippingCarrier}</span>
                        )}
                      </td>
                      <td className="px-3.5 py-4">
                        <StatusBadge
                          label={isShipped ? 'Enviado' : 'Pendiente'}
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
                          className="inline-flex min-h-9 items-center gap-0.5 rounded-lg bg-[#23312C] px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-[#285F50] focus:outline-none focus:ring-4 focus:ring-[#285F50]/20"
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
