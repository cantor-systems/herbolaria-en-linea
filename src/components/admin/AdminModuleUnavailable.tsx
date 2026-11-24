import { LockKeyhole } from 'lucide-react';

interface AdminModuleUnavailableProps {
  title: string;
  dependency: '012' | '013' | 'fase posterior';
  children: React.ReactNode;
}

export function AdminModuleUnavailable({
  title,
  dependency,
  children,
}: AdminModuleUnavailableProps) {
  return (
    <article className="rounded-3xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 shadow-[0_14px_36px_rgba(35,49,44,0.06)] sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4EFD6] text-[#98552B]">
          <LockKeyhole aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-[#23312C]">{title}</h3>
            <span className="rounded-full border border-[#D17B24]/35 bg-[#D17B24]/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#98552B]">
              Requiere {dependency}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#52625B]">{children}</p>
        </div>
      </div>
    </article>
  );
}
