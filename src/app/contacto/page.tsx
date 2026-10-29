'use client';

import Link from 'next/link';
import { STORE_CONFIG, getWhatsAppHref } from '@/config/store';
import { MessageCircle, Mail, Clock, Truck, RefreshCw } from 'lucide-react';
import { trackWhatsAppClick } from '@/lib/analytics';

export default function ContactPage() {
  const whatsappHref = getWhatsAppHref();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-[#285F50] text-[#FAF7E8] p-8 sm:p-10 rounded-3xl shadow-lg space-y-2 text-center">
        <span className="text-xs font-black uppercase text-[#D17B24]">Atención al Cliente</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold">Contacto y Asistencia Herbolaria en Línea</h1>
        <p className="text-xs sm:text-sm text-[#FAF7E8]/90 max-w-lg mx-auto">
          Consulta los canales disponibles para resolver dudas sobre productos, envíos o pedidos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Contact Info (5 cols) */}
        <div className="md:col-span-5 bg-[#FAF7E8] p-6 rounded-3xl border border-[#D9D1B9] space-y-6">
          <h3 className="font-extrabold text-[#23312C] text-base border-b border-[#D9D1B9] pb-3">
            Canales Directos
          </h3>

          <div className="space-y-4 text-xs font-semibold text-[#23312C]">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('contact', { placement: 'contact_page' })}
                className="flex min-h-[44px] items-center gap-3 p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="block font-bold">Atención por WhatsApp</span>
                  <span className="text-[11px] font-normal">Canal disponible para soporte</span>
                </div>
              </a>
            )}

            <div className="flex items-center gap-3 p-3 bg-[#F4EFD6] border border-[#D9D1B9] rounded-2xl" style={{ display: STORE_CONFIG.contact.email.enabled ? undefined : 'none' }}>
              <Mail className="w-5 h-5 text-[#285F50] shrink-0" />
              <div>
                <span className="block font-bold">Correo Electrónico</span>
                <span className="text-[11px] font-normal">{STORE_CONFIG.contact.email.value}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#F4EFD6] border border-[#D9D1B9] rounded-2xl" style={{ display: STORE_CONFIG.contact.businessHours.enabled ? undefined : 'none' }}>
              <Clock className="w-5 h-5 text-[#285F50] shrink-0" />
              <div>
                <span className="block font-bold">Horario de Atención</span>
                <span className="text-[11px] font-normal">{STORE_CONFIG.contact.businessHours.value}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Available contact channel (7 cols) */}
        <div className="md:col-span-7 bg-[#FAF7E8] p-6 sm:p-8 rounded-3xl border border-[#D9D1B9] space-y-4">
          <h3 className="font-extrabold text-[#23312C] text-lg border-b border-[#D9D1B9] pb-3">
            Canales disponibles
          </h3>

          <div className="p-5 bg-[#F4EFD6] border border-[#D9D1B9] text-[#23312C] rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-[#285F50] shrink-0" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm">Rastreo de pedido</h4>
                <p className="text-xs text-[#6F8F69]">Consulta por separado el estado y la guía de una compra existente.</p>
              </div>
            </div>
            <Link href="/rastrear-pedido" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#285F50] px-5 py-3 text-xs font-bold text-white hover:bg-[#23312C]">
              Rastrear pedido
            </Link>
          </div>

          <div className="p-5 bg-[#FAF7E8] border border-[#D9D1B9] text-[#23312C] rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-[#285F50] shrink-0" />
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm">Devoluciones y cambios</h4>
                <p className="text-xs text-[#6F8F69]">Consulta cómo solicitar la revisión individual de un caso.</p>
              </div>
            </div>
            <Link href="/devoluciones-y-cambios" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#285F50] px-5 py-3 text-xs font-bold text-[#285F50] hover:bg-[#F4EFD6]">
              Ver información
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
