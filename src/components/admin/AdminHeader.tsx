import { Leaf, Menu, ShieldCheck, X } from 'lucide-react';

interface AdminHeaderProps {
  mobileNavigationOpen: boolean;
  onToggleMobileNavigation: () => void;
}

export function AdminHeader({
  mobileNavigationOpen,
  onToggleMobileNavigation,
}: AdminHeaderProps) {
  return (
    <header className="border-b border-[#D9D1B9] bg-[#FAF7E8]/95 backdrop-blur-sm lg:sticky lg:top-0 lg:z-30">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:hidden">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#285F50] text-[#FAF7E8]">
            <Leaf aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-[#23312C]">
              Herbolaria en Línea
            </span>
            <span className="block text-xs font-semibold text-[#6F8F69]">Administración · DEMO</span>
          </span>
        </div>

        <div className="hidden min-w-0 lg:block">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6F8F69]">
            Entorno local protegido
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-[#23312C]">
            Interfaz sin fuentes de datos conectadas
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-[#AFC28E] bg-[#EEF2DF] px-3 py-1.5 text-xs font-bold text-[#285F50] sm:inline-flex">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Sesión administrativa temporal
          </span>
          <span className="rounded-full bg-[#D17B24] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white">
            DEMO
          </span>
          <button
            aria-controls="admin-mobile-navigation"
            aria-expanded={mobileNavigationOpen}
            aria-label={mobileNavigationOpen ? 'Cerrar navegación administrativa' : 'Abrir navegación administrativa'}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D9D1B9] bg-white text-[#23312C] transition-colors hover:bg-[#F4EFD6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D17B24] lg:hidden"
            onClick={onToggleMobileNavigation}
            type="button"
          >
            {mobileNavigationOpen ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
