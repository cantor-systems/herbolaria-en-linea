'use client';

import { useState } from 'react';
import { Leaf } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AdminHeader } from './AdminHeader';
import { AdminNavigation } from './AdminNavigation';

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <section className="min-h-[80vh] bg-[#EEF2DF] text-[#23312C] [color-scheme:light]">
      <a
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-[#23312C] px-4 py-3 font-bold text-[#FAF7E8] shadow-lg transition-transform focus:translate-y-0"
        href="#admin-content"
      >
        Saltar al contenido administrativo
      </a>

      <div className="mx-auto grid min-h-[80vh] w-full max-w-[1600px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden bg-[#23312C] p-5 text-[#F4EFD6] lg:block lg:p-6">
          <div className="mb-8 flex items-center gap-3 border-b border-white/10 pb-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#AFC28E] text-[#23312C]">
              <Leaf aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">Herbolaria en Línea</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#AFC28E]">
                Administración
              </p>
            </div>
          </div>
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#AFC28E]/75" id="admin-navigation-title">
            Módulos
          </p>
          <AdminNavigation labelledBy="admin-navigation-title" pathname={pathname} />
          <div className="mt-8 rounded-2xl border border-[#AFC28E]/20 bg-white/5 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#AFC28E]">Vista segura</p>
            <p className="mt-2 text-xs leading-5 text-[#D7E4D4]/75">
              Sin Supabase, pagos, mensajería ni métricas reales.
            </p>
          </div>
        </aside>

        <div className="min-w-0 bg-[#EEF2DF]">
          <AdminHeader
            mobileNavigationOpen={mobileNavigationOpen}
            onToggleMobileNavigation={() => setMobileNavigationOpen((open) => !open)}
          />
          {mobileNavigationOpen ? (
            <div className="border-b border-[#D9D1B9] bg-[#23312C] p-4 text-[#F4EFD6] lg:hidden" id="admin-mobile-navigation">
              <AdminNavigation
                onNavigate={() => setMobileNavigationOpen(false)}
                pathname={pathname}
              />
            </div>
          ) : null}
          <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10" id="admin-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </section>
  );
}
