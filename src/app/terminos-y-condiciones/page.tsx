import type { Metadata } from 'next';
import Link from 'next/link';
import { canonicalAlternates } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones generales para el uso del sitio y las compras realizadas en Herbolaria en Línea.',
  ...canonicalAlternates('/terminos-y-condiciones'),
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="space-y-3">
        <span className="text-xs font-black uppercase tracking-wider text-[#D17B24]">Uso y compra</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#23312C]">Términos y condiciones</h1>
        <p className="text-sm text-[#6F8F69] leading-relaxed">
          Estas condiciones resumen el funcionamiento comercial visible del sitio sin sustituir los derechos y obligaciones que resulten aplicables.
        </p>
      </header>

      <div className="space-y-5">
        <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-2">
          <h2 className="text-xl font-extrabold text-[#23312C]">Uso del sitio</h2>
          <p className="text-sm leading-relaxed">
            El sitio permite consultar el catálogo, agregar productos al carrito, iniciar compras y consultar información de pedidos. No debe utilizarse para interferir con su operación ni para realizar solicitudes fraudulentas.
          </p>
        </section>

        <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-2">
          <h2 className="text-xl font-extrabold text-[#23312C]">Catálogo, precios y disponibilidad</h2>
          <p className="text-sm leading-relaxed">
            Los productos, presentaciones, precios y estados de disponibilidad son los mostrados en el catálogo vigente. El carrito y el checkout presentan los importes aplicables antes de continuar al pago.
          </p>
        </section>

        <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-2">
          <h2 className="text-xl font-extrabold text-[#23312C]">Compra y pago</h2>
          <p className="text-sm leading-relaxed">
            Para iniciar una compra deben proporcionarse datos de contacto y entrega válidos. El pago se procesa mediante Mercado Pago y el estado del pedido depende de la verificación del pago correspondiente.
          </p>
        </section>

        <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-2">
          <h2 className="text-xl font-extrabold text-[#23312C]">Promociones y mayoreo</h2>
          <p className="text-sm leading-relaxed">
            Los descuentos y promociones se aplican conforme a las condiciones mostradas durante la compra. Cuando el sitio indique que una promoción reemplaza a otra, no se acumularán entre sí. El total aplicable se muestra antes del pago.
          </p>
        </section>

        <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-2">
          <h2 className="text-xl font-extrabold text-[#23312C]">Envíos y solicitudes posteriores</h2>
          <p className="text-sm leading-relaxed">
            La cobertura, costos y estimaciones de entrega se describen en la política de envíos. Las solicitudes de devolución o cambio se revisan de forma individual conforme a la información disponible del pedido.
          </p>
          <div className="flex flex-wrap gap-3 pt-1 text-xs font-bold text-[#285F50]">
            <Link href="/envios" className="hover:underline">Consultar envíos</Link>
            <Link href="/devoluciones-y-cambios" className="hover:underline">Consultar devoluciones y cambios</Link>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9D1B9] bg-[#F4EFD6] p-5 space-y-2">
          <h2 className="text-xl font-extrabold text-[#23312C]">Información herbolaria</h2>
          <p className="text-sm leading-relaxed">
            El contenido sobre productos y tradición herbolaria tiene fines informativos. No constituye diagnóstico, prescripción ni tratamiento y no sustituye la atención de profesionales de la salud.
          </p>
        </section>
      </div>
    </main>
  );
}
