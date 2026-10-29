import type { Metadata } from 'next';
import Link from 'next/link';
import { canonicalAlternates } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Devoluciones y cambios',
  description: 'Conoce cómo solicitar la revisión de un caso relacionado con una compra en Herbolaria en Línea.',
  ...canonicalAlternates('/devoluciones-y-cambios'),
};

export default function ReturnsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="space-y-3">
        <span className="text-xs font-black uppercase tracking-wider text-[#D17B24]">Atención posterior a la compra</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#23312C]">Devoluciones y cambios</h1>
        <p className="text-sm text-[#6F8F69] leading-relaxed">
          Actualmente no se publica una política de aceptación automática con plazos o condiciones generales. Cada caso se revisa de forma individual.
        </p>
      </header>

      <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-3">
        <h2 className="text-xl font-extrabold text-[#23312C]">Cómo solicitar una revisión</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
          <li>Contacta al equipo de soporte mediante los canales disponibles.</li>
          <li>Comparte el número de pedido, tus datos de contacto y una descripción clara de la situación.</li>
          <li>Incluye información o evidencia útil del pedido cuando corresponda.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-[#D9D1B9] bg-[#F4EFD6] p-5 space-y-3">
        <h2 className="text-xl font-extrabold text-[#23312C]">Revisión del caso</h2>
        <p className="text-sm leading-relaxed">
          El envío de una solicitud no implica que un cambio, devolución o reembolso sea aceptado automáticamente. La respuesta dependerá de las circunstancias del pedido y de la información disponible.
        </p>
        <p className="text-sm leading-relaxed">
          No se establece aquí un plazo fijo ni se promete una devolución gratuita. Esta información no pretende limitar los derechos que resulten aplicables.
        </p>
      </section>

      <Link href="/contacto" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#285F50] px-5 py-3 text-xs font-bold text-white hover:bg-[#23312C]">
        Contactar soporte
      </Link>
    </main>
  );
}
