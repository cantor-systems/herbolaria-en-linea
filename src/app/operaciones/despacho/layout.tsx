import Link from 'next/link';
import { LogOut, PackageCheck } from 'lucide-react';
import { logoutDispatchAction } from '@/app/operaciones/actions';
import { requireDispatchAdminSession } from '@/lib/dispatch/auth';

export const dynamic = 'force-dynamic';

export default async function DispatchLayout({ children }: { children: React.ReactNode }) {
  await requireDispatchAdminSession();

  return (
    <section className="min-h-[75vh] bg-[#111315] text-[#F2F3F3] [color-scheme:dark]">
      <div className="border-b border-[#3B4147] bg-[#1D2023] text-[#F2F3F3]">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D2D8DD]"
            href="/operaciones/despacho"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#276B55]">
              <PackageCheck aria-hidden="true" size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#B8BEC4]">
                Herbolaria en Línea · Operaciones
              </span>
              <span className="block truncate text-base font-bold">Despacho de pedidos</span>
            </span>
          </Link>

          <form action={logoutDispatchAction}>
            <button
              aria-label="Cerrar sesión"
              className="flex min-h-11 items-center gap-2 rounded-lg border border-[#77818B] px-3 py-2 text-sm font-semibold transition hover:bg-[#353B41] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D2D8DD]"
              type="submit"
            >
              <LogOut aria-hidden="true" size={17} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </form>
        </div>
      </div>
      {children}
    </section>
  );
}
