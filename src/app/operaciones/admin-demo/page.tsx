import Link from 'next/link';
import { ArrowRight, Inbox, Leaf, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { AdminModuleUnavailable } from '@/components/admin/AdminModuleUnavailable';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireDispatchAdminSession } from '@/lib/dispatch/auth';

export const dynamic = 'force-dynamic';

export default async function AdminDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  await requireDispatchAdminSession();

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-6xl">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#C8D4B3] bg-[#FAF7E8] px-5 py-7 shadow-[0_24px_60px_rgba(35,49,44,0.08)] sm:px-8 sm:py-9">
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#AFC28E]/25" />
          <div aria-hidden="true" className="absolute -bottom-20 right-24 h-40 w-40 rounded-full border-[28px] border-[#D17B24]/10" />
          <div className="relative max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#285F50] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#FAF7E8]">
                <Leaf aria-hidden="true" className="h-4 w-4" />
                AdminShell · DEMO local
              </span>
              <span className="rounded-full border border-[#D9D1B9] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#52625B]">
                Sin datos conectados
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-[#23312C] sm:text-4xl lg:text-5xl">
              Centro de operaciones
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#52625B] sm:text-lg">
              Primera vista del sistema administrativo. Esta pantalla valida navegación, jerarquía y comportamiento responsive con contenido vacío de demostración.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#285F50] px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#23312C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D17B24]"
                href="/operaciones/despacho"
              >
                Abrir despacho actual
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <p className="flex items-center gap-2 text-xs font-semibold leading-5 text-[#6F8F69] sm:max-w-xs">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
                El enlace conserva la protección administrativa existente.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#D9D1B9] bg-white shadow-[0_14px_36px_rgba(35,49,44,0.06)]" aria-labelledby="work-queue-title">
          <div className="flex flex-col gap-2 border-b border-[#D9D1B9] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6F8F69]">Contenido inicial</p>
              <h2 className="mt-1 text-xl font-black text-[#23312C]" id="work-queue-title">Bandeja de trabajo</h2>
            </div>
            <span className="w-fit rounded-full border border-[#AFC28E] bg-[#EEF2DF] px-3 py-1.5 text-xs font-extrabold text-[#285F50]">
              Estado vacío · DEMO
            </span>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#F4EFD6] text-xs font-extrabold uppercase tracking-wide text-[#52625B]">
                <tr>
                  <th className="px-6 py-3" scope="col">Pedido</th>
                  <th className="px-6 py-3" scope="col">Estado</th>
                  <th className="px-6 py-3" scope="col">Pago</th>
                  <th className="px-6 py-3" scope="col">Envío</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-6 py-10" colSpan={4}>
                    <EmptyWorkQueue />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-5 py-10 sm:hidden">
            <EmptyWorkQueue />
          </div>
        </section>

        <section className="mt-6" aria-labelledby="blocked-modules-title">
          <div className="mb-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6F8F69]">Límites visibles</p>
            <h2 className="mt-1 text-2xl font-black text-[#23312C]" id="blocked-modules-title">Módulos todavía no disponibles</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminModuleUnavailable dependency="012" title="Pedidos manuales">
              La captura y persistencia permanecen deshabilitadas mientras el modelo de privilegios del ejecutor manual siga bloqueado.
            </AdminModuleUnavailable>
            <AdminModuleUnavailable dependency="013" title="Vendedores y asignaciones">
              La identidad individual, membresía y atribución dependen de 012, 013 y una operación de asignación posterior todavía no implementada.
            </AdminModuleUnavailable>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function EmptyWorkQueue() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2DF] text-[#285F50]">
        <Inbox aria-hidden="true" className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-extrabold text-[#23312C]">No hay datos de demostración cargados</h3>
      <p className="mt-2 text-sm leading-6 text-[#52625B]">
        Este estado vacío es intencional. La pantalla no consulta pedidos, pagos, envíos ni métricas reales.
      </p>
    </div>
  );
}
