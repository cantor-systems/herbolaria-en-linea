import { LockKeyhole, ShieldAlert, ShieldCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { loginDispatchAction } from '@/app/operaciones/actions';
import {
  hasValidDispatchAdminSession,
  isDispatchAdminConfigured,
} from '@/lib/dispatch/auth';

export const dynamic = 'force-dynamic';

interface DispatchLoginPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

export default async function DispatchLoginPage({
  searchParams,
}: DispatchLoginPageProps) {
  const configured = isDispatchAdminConfigured();
  if (configured && (await hasValidDispatchAdminSession())) {
    redirect('/operaciones/despacho');
  }

  const { error } = await searchParams;
  const errorCode = Array.isArray(error) ? error[0] : error;
  const invalidPassword = configured && errorCode === 'invalid';

  return (
    <section className="min-h-[70vh] bg-[#F4EFD6] px-4 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-[#D9D1B9] bg-[#FAF7E8] shadow-[0_24px_70px_rgba(35,49,44,0.12)]">
        <div className="border-b border-[#D9D1B9] bg-[#23312C] px-6 py-6 text-[#FAF7E8] sm:px-8">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#285F50]">
            <ShieldCheck aria-hidden="true" size={23} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#F4EFD6]/75">
            Moronel · Operaciones
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Acceso a despacho</h1>
        </div>

        <div className="px-6 py-7 sm:px-8 sm:py-8">
          {!configured ? (
            <div
              className="rounded-2xl border border-[#D17B24]/35 bg-[#D17B24]/10 p-5"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#98552B]"
                  size={22}
                />
                <div>
                  <h2 className="font-bold text-[#23312C]">Acceso no disponible</h2>
                  <p className="mt-1 text-sm leading-6 text-[#23312C]/75">
                    La protección administrativa debe configurarse de forma segura en el servidor antes de usar este módulo.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form action={loginDispatchAction} className="space-y-5">
              <div>
                <label
                  className="mb-2 block text-sm font-bold text-[#23312C]"
                  htmlFor="dispatch-password"
                >
                  Contraseña administrativa
                </label>
                <div className="relative">
                  <LockKeyhole
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#285F50]"
                    size={19}
                  />
                  <input
                    autoComplete="current-password"
                    autoFocus
                    className="min-h-12 w-full rounded-xl border border-[#D9D1B9] bg-white py-3 pl-12 pr-4 text-base text-[#23312C] outline-none transition focus:border-[#285F50] focus:ring-4 focus:ring-[#285F50]/10"
                    id="dispatch-password"
                    maxLength={1024}
                    name="password"
                    required
                    type="password"
                  />
                </div>
              </div>

              {invalidPassword && (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
                  role="alert"
                >
                  La contraseña no es correcta.
                </p>
              )}

              <button
                className="min-h-12 w-full rounded-xl bg-[#285F50] px-5 py-3 text-base font-bold text-white transition hover:bg-[#23312C] focus:outline-none focus:ring-4 focus:ring-[#285F50]/20"
                type="submit"
              >
                Entrar al módulo
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
