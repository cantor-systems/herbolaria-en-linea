'use client';

import React from 'react';
import Link from 'next/link';
import { Leaf, MessageCircle, Mail, Clock, ShieldCheck, MapPin, Truck } from 'lucide-react';
import { STORE_CONFIG, getWhatsAppHref } from '@/config/store';
import { trackWhatsAppClick } from '@/lib/analytics';
import { SOCIAL_CONFIG } from '@/config/social';
import { getActiveCategories } from '@/data/categories';

const activeCategories = getActiveCategories();

export const Footer: React.FC = () => {
  const enabledSocials = SOCIAL_CONFIG.filter((s) => s.enabled && s.href);
  const whatsappHref = getWhatsAppHref();

  return (
    <footer className="bg-[#23312C] text-[#F4EFD6] pt-12 pb-8 border-t-4 border-[#285F50] w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#285F50] text-[#FAF7E8] flex items-center justify-center shadow-md">
                <Leaf className="w-5 h-5 text-[#D17B24]" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-[#FAF7E8] leading-tight">
                  {STORE_CONFIG.storeName}
                </span>
                <span className="text-xs font-semibold text-[#AFC28E] uppercase tracking-wider">
                  Tienda herbolaria
                </span>
              </div>
            </div>
            <p className="text-xs text-[#F4EFD6]/80 leading-relaxed">
              {STORE_CONFIG.description}
            </p>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#285F50]/60 border border-[#285F50] text-xs text-[#FAF7E8]">
                <ShieldCheck className="w-4 h-4 text-[#D17B24]" />
                <span>Pago mediante Mercado Pago</span>
              </div>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#D17B24] uppercase tracking-wider">
              Navegación de Tienda
            </h4>
            <ul className="space-y-2 text-xs font-medium text-[#F4EFD6]/90">
              <li>
                <Link href="/tienda" className="hover:text-[#AFC28E] transition-colors">
                  Catálogo Completo
                </Link>
              </li>
              {activeCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categoria/${category.slug}`}
                    className={`hover:text-[#AFC28E] transition-colors ${
                      category.slug === 'paquetes-y-promociones'
                        ? 'text-[#D17B24] font-bold'
                        : ''
                    }`}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/conocer-moronel" className="hover:text-[#AFC28E] transition-colors">
                  Conocer Moronel
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Tracking */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#D17B24] uppercase tracking-wider">
              Atención y Rastreo
            </h4>
            <ul className="space-y-2 text-xs font-medium text-[#F4EFD6]/90">
              <li>
                <Link href="/rastrear-pedido" className="hover:text-[#AFC28E] transition-colors flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#D17B24]" />
                  <span>Rastrear mi Pedido</span>
                </Link>
              </li>
              <li>
                <Link href="/mi-cuenta" className="hover:text-[#AFC28E] transition-colors">
                  Mi Cuenta / Historial
                </Link>
              </li>
              <li>
                <Link href="/preguntas-frecuentes" className="hover:text-[#AFC28E] transition-colors">
                  Preguntas Frecuentes (FAQ)
                </Link>
              </li>
              <li>
                <Link href="/envios" className="hover:text-[#AFC28E] transition-colors">
                  Envíos
                </Link>
              </li>
              <li>
                <Link href="/devoluciones-y-cambios" className="hover:text-[#AFC28E] transition-colors">
                  Devoluciones y cambios
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-[#AFC28E] transition-colors">
                  Contacto y Asistencia
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Direct Support & Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#D17B24] uppercase tracking-wider">
              Atención al Cliente
            </h4>
            <div className="space-y-2.5 text-xs text-[#F4EFD6]/90">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick('footer', { placement: 'footer' })}
                  className="flex items-center gap-2 text-emerald-300 font-bold hover:underline"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              )}
              <div className="flex items-center gap-2" style={{ display: STORE_CONFIG.contact.email.enabled ? undefined : 'none' }}>
                <Mail className="w-4 h-4 text-[#C9AD83] shrink-0" />
                <span>{STORE_CONFIG.contact.email.value}</span>
              </div>
              <div className="flex items-center gap-2" style={{ display: STORE_CONFIG.contact.businessHours.enabled ? undefined : 'none' }}>
                <Clock className="w-4 h-4 text-[#C9AD83] shrink-0" />
                <span>{STORE_CONFIG.contact.businessHours.value}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C9AD83] shrink-0" />
                <span>Cobertura de envíos a todo México</span>
              </div>
            </div>

            {enabledSocials.length > 0 && (
              <div className="pt-2 flex items-center gap-2">
                {enabledSocials.map((soc) => (
                  <a
                    key={soc.id}
                    href={soc.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#285F50] text-[#FAF7E8] hover:bg-[#D17B24] transition-colors text-xs font-bold"
                  >
                    {soc.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="bg-[#285F50]/40 border border-[#285F50] p-4 rounded-xl text-[11px] text-[#F4EFD6]/80 leading-relaxed space-y-1.5">
          <p className="font-bold text-[#AFC28E] uppercase tracking-wider">
            Aviso de Responsabilidad y Uso Herbolario Tradicional:
          </p>
          <p>
            Los productos herbolarios disponibles en esta tienda se comercializan dentro del contexto de la tradición herbolaria. La información del sitio es exclusivamente informativa y no constituye una recomendación, diagnóstico ni prescripción médica. Si tienes una condición de salud particular, consulta previamente a un profesional sanitario calificado.
          </p>
        </div>

        {/* Bottom Bar & Copyright */}
        <div className="pt-4 border-t border-[#285F50] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F4EFD6]/70">
          <p>© {new Date().getFullYear()} {STORE_CONFIG.storeName}. Todos los derechos reservados.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px]">
            <Link href="/privacidad" className="hover:text-[#AFC28E] transition-colors">Privacidad</Link>
            <Link href="/terminos-y-condiciones" className="hover:text-[#AFC28E] transition-colors">Términos y condiciones</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
