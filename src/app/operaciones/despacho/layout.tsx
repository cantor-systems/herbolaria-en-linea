import Link from 'next/link';
import { LogOut, PackageCheck } from 'lucide-react';
import { logoutDispatchAction } from '@/app/operaciones/actions';
import { requireDispatchAdminSession } from '@/lib/dispatch/auth';

export const dynamic = 'force-dynamic';

export default async function DispatchLayout({ children }: { children: React.ReactNode }) {
  await requireDispatchAdminSession();

  return (
    <section className="min-h-[75vh] bg-[#F4EFD6]">
      <div className="border-b border-[#23312C]/10 bg-[#23312C] text-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4EFD6]"
            href="/operaciones/despacho"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#285F50]">
              <PackageCheck aria-hidden="true" size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#F4EFD6]/70">
                Herbolaria en Línea · Operaciones
              </span>
              <span className="block truncate text-base font-bold">Despacho de pedidos</span>
            </span>
          </Link>

          <form action={logoutDispatchAction}>
            <button
              className="flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-bold transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#F4EFD6]"
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
