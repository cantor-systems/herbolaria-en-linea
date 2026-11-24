import Link from 'next/link';
import {
  Activity,
  Banknote,
  ClipboardPlus,
  LayoutDashboard,
  LockKeyhole,
  PackageSearch,
  Truck,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import {
  ADMIN_NAVIGATION,
  type AdminModuleAvailability,
  type AdminNavigationIcon,
} from '@/lib/admin/navigation';

const ICONS: Record<AdminNavigationIcon, LucideIcon> = {
  overview: LayoutDashboard,
  orders: PackageSearch,
  payments: Banknote,
  shipping: Truck,
  sellers: UsersRound,
  activity: Activity,
  manual: ClipboardPlus,
};

const AVAILABILITY_LABELS: Record<AdminModuleAvailability, string> = {
  available: 'DEMO',
  existing: 'Disponible',
  planned: 'Próximamente',
  blocked_012: 'Bloqueado 012',
  blocked_013: 'Bloqueado 013',
};

interface AdminNavigationProps {
  pathname: string;
  onNavigate?: () => void;
  labelledBy?: string;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/operaciones/admin-demo' && pathname.startsWith(`${href}/`));
}

export function AdminNavigation({
  pathname,
  onNavigate,
  labelledBy,
}: AdminNavigationProps) {
  return (
    <nav aria-label={labelledBy ? undefined : 'Navegación administrativa'} aria-labelledby={labelledBy}>
      <ul className="space-y-1.5">
        {ADMIN_NAVIGATION.map((item) => {
          const Icon = ICONS[item.icon];
          const isEnabled = Boolean(item.href);
          const active = item.href ? isActivePath(pathname, item.href) : false;
          const content = (
            <>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  active
                    ? 'bg-[#FAF7E8] text-[#285F50]'
                    : isEnabled
                      ? 'bg-white/10 text-[#D7E4D4]'
                      : 'bg-white/5 text-[#AFC28E]/55'
                }`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{item.label}</span>
                <span
                  className={`mt-0.5 block text-xs ${
                    isEnabled ? 'text-[#D7E4D4]/75' : 'text-[#D7E4D4]/50'
                  }`}
                >
                  {item.description}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  active
                    ? 'border-[#FAF7E8]/50 bg-[#FAF7E8]/10 text-[#FAF7E8]'
                    : isEnabled
                      ? 'border-[#AFC28E]/35 text-[#D7E4D4]'
                      : 'border-white/10 text-[#D7E4D4]/45'
                }`}
              >
                {AVAILABILITY_LABELS[item.availability]}
              </span>
            </>
          );

          return (
            <li key={item.id}>
              {item.href ? (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D17B24] ${
                    active
                      ? 'border-[#AFC28E]/55 bg-white/14 text-white'
                      : 'border-transparent text-[#F4EFD6] hover:border-white/10 hover:bg-white/8'
                  }`}
                  href={item.href}
                  onClick={onNavigate}
                >
                  {content}
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="flex min-h-14 cursor-not-allowed items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-[#D7E4D4]/55"
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
