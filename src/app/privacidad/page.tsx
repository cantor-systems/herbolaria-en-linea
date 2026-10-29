import type { Metadata } from 'next';
import Link from 'next/link';
import { canonicalAlternates } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacidad',
  description: 'Información sobre los datos utilizados para operar compras, pedidos y analítica en Herbolaria en Línea.',
  ...canonicalAlternates('/privacidad'),
};

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="space-y-3">
        <span className="text-xs font-black uppercase tracking-wider text-[#D17B24]">Información del sitio</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#23312C]">Privacidad</h1>
        <p className="text-sm text-[#6F8F69] leading-relaxed">
          Esta página describe, de forma general, los datos utilizados por los flujos actualmente implementados en Herbolaria en Línea.
        </p>
      </header>

      <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-3">
        <h2 className="text-xl font-extrabold text-[#23312C]">Datos utilizados al comprar</h2>
        <p className="text-sm leading-relaxed">
          El checkout solicita correo electrónico, teléfono, nombre completo y datos de entrega como calle, colonia, ciudad, estado y código postal. También procesa los productos, cantidades, modalidad de envío, promoción seleccionada y la preferencia para recibir actualizaciones por WhatsApp.
        </p>
      </section>

      <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-3">
        <h2 className="text-xl font-extrabold text-[#23312C]">Para qué se utilizan</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
          <li>Crear, cobrar, preparar y dar seguimiento a pedidos.</li>
          <li>Gestionar entrega, rastreo y soporte relacionado con la compra.</li>
          <li>Enviar comunicaciones operativas sobre el pedido cuando corresponda.</li>
          <li>Mantener seguridad, consistencia e historial operativo de las transacciones.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-3">
        <h2 className="text-xl font-extrabold text-[#23312C]">Servicios que intervienen</h2>
        <p className="text-sm leading-relaxed">
          El flujo actual utiliza Mercado Pago para iniciar y verificar pagos, Supabase para persistir pedidos y Resend para comunicaciones transaccionales por correo cuando está configurado. Cada proveedor puede tratar la información necesaria para prestar su servicio conforme a sus propias condiciones.
        </p>
      </section>

      <section className="rounded-2xl border border-[#D9D1B9] bg-[#FAF7E8] p-5 space-y-3">
        <h2 className="text-xl font-extrabold text-[#23312C]">Analítica y almacenamiento local</h2>
        <p className="text-sm leading-relaxed">
          Google Analytics y Microsoft Clarity pueden cargarse cuando sus identificadores públicos están configurados. Estas herramientas pueden recopilar información técnica y de interacción. El navegador también guarda localmente el contenido del carrito y la promoción seleccionada para conservar la sesión de compra.
        </p>
      </section>

      <section className="rounded-2xl border border-[#D9D1B9] bg-[#F4EFD6] p-5 space-y-3">
        <h2 className="text-xl font-extrabold text-[#23312C]">Consultas sobre datos</h2>
        <p className="text-sm leading-relaxed">
          Para realizar una consulta relacionada con tus datos o con un pedido, utiliza únicamente los canales que aparezcan habilitados en la página de contacto.
        </p>
        <Link href="/contacto" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#285F50] px-5 py-3 text-xs font-bold text-white hover:bg-[#23312C]">
          Ir a contacto
        </Link>
      </section>
    </main>
  );
}
