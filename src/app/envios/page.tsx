import type { Metadata } from 'next';
import Link from 'next/link';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { formatCurrency } from '@/lib/utils';
import { canonicalAlternates } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Envíos',
  description: 'Consulta la cobertura, modalidades, costos y tiempos estimados de envío de Herbolaria en Línea.',
  ...canonicalAlternates('/envios'),
};

export default function ShippingPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="space-y-3">
        <span className="text-xs font-black uppercase tracking-wider text-[#D17B24]">Información de compra</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#23312C]">Envíos</h1>
        <p className="text-sm text-[#6F8F69] leading-relaxed">
          Información sobre las modalidades de entrega disponibles al comprar en Herbolaria en Línea.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-2">
          <h2 className="font-extrabold text-[#285F50]">Cobertura</h2>
          <p className="text-sm leading-relaxed">{SHIPPING_CONFIG.coverage}.</p>
          <p className="text-xs text-[#6F8F69]">
            La disponibilidad final depende de la zona postal y la cobertura de la paquetería.
          </p>
        </section>

        <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-2">
          <h2 className="font-extrabold text-[#285F50]">Paqueterías</h2>
          <p className="text-sm leading-relaxed">{SHIPPING_CONFIG.couriers.join(', ')}.</p>
          <p className="text-xs text-[#6F8F69]">
            La paquetería aplicable puede variar según el destino y la operación del pedido.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-4">
        <h2 className="text-xl font-extrabold text-[#23312C]">Modalidades y costos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[#F4EFD6] p-4 space-y-1">
            <h3 className="font-bold text-[#285F50]">Envío estándar</h3>
            <p className="text-sm">Costo regular: {formatCurrency(SHIPPING_CONFIG.standardShippingCents)}.</p>
            <p className="text-sm">Tiempo estimado: {SHIPPING_CONFIG.standardEstimatedDays}.</p>
          </div>
          <div className="rounded-xl bg-[#F4EFD6] p-4 space-y-1">
            <h3 className="font-bold text-[#285F50]">Envío exprés</h3>
            <p className="text-sm">Costo regular: {formatCurrency(SHIPPING_CONFIG.expressShippingCents)}.</p>
            <p className="text-sm">Tiempo estimado: {SHIPPING_CONFIG.expressEstimatedDays}.</p>
            <p className="text-xs text-[#6F8F69]">
              Cuando el pedido ya tiene envío estándar gratis, el upgrade exprés cuesta {formatCurrency(SHIPPING_CONFIG.expressUpgradeCents)}.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-3">
        <h2 className="text-xl font-extrabold text-[#23312C]">Envío estándar gratis</h2>
        <p className="text-sm leading-relaxed">
          El envío estándar no tiene costo cuando el subtotal alcanza {formatCurrency(SHIPPING_CONFIG.freeShippingThresholdCents)}, cuando el carrito incluye una presentación participante o cuando el descuento de mayoreo activo incluye ese beneficio.
        </p>
        <p className="text-xs text-[#6F8F69]">
          Las condiciones aplicables y el costo final se muestran en el carrito y en el checkout antes del pago.
        </p>
      </section>

      {SHIPPING_CONFIG.trackingAvailable && (
        <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-3">
          <h2 className="text-xl font-extrabold text-[#23312C]">Rastreo</h2>
          <p className="text-sm leading-relaxed">
            Una vez despachado el pedido, la información de seguimiento puede consultarse con los datos de la compra.
          </p>
          <Link href="/rastrear-pedido" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#285F50] px-5 py-3 text-xs font-bold text-white hover:bg-[#23312C]">
            Rastrear pedido
          </Link>
        </section>
      )}

      <p className="rounded-2xl border border-[#D9D1B9] bg-[#F4EFD6] p-5 text-sm leading-relaxed text-[#23312C]">
        {SHIPPING_CONFIG.disclaimer} No se promete una fecha exacta de entrega.
      </p>
    </main>
  );
}
