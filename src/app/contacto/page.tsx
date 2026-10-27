'use client';

import React, { useState } from 'react';
import { STORE_CONFIG, getWhatsAppHref } from '@/config/store';
import { MessageCircle, Mail, Clock, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { trackWhatsAppClick } from '@/lib/analytics';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-[#285F50] text-[#FAF7E8] p-8 sm:p-10 rounded-3xl shadow-lg space-y-2 text-center">
        <span className="text-xs font-black uppercase text-[#D17B24]">Atención al Cliente</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold">Contacto y Asistencia Moronel</h1>
        <p className="text-xs sm:text-sm text-[#FAF7E8]/90 max-w-lg mx-auto">
          ¿Tienes preguntas sobre tu pedido, envíos o presentaciones Herbazen? Estamos listos para atenderte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Contact Info (5 cols) */}
        <div className="md:col-span-5 bg-[#FAF7E8] p-6 rounded-3xl border border-[#D9D1B9] space-y-6">
          <h3 className="font-extrabold text-[#23312C] text-base border-b border-[#D9D1B9] pb-3">
            Canales Directos
          </h3>

          <div className="space-y-4 text-xs font-semibold text-[#23312C]">
            <a
              href={getWhatsAppHref() || undefined}
              target={STORE_CONFIG.contact.whatsapp.enabled ? '_blank' : undefined}
              rel={STORE_CONFIG.contact.whatsapp.enabled ? 'noopener noreferrer' : undefined}
              style={{ display: STORE_CONFIG.contact.whatsapp.enabled ? undefined : 'none' }}
              onClick={() => trackWhatsAppClick('contact', { placement: 'contact_page' })}
              className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="block font-bold">Atención por WhatsApp</span>
                <span className="text-[11px] font-normal">WhatsApp</span>
              </div>
            </a>

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

        {/* Form (7 cols) */}
        <div className="md:col-span-7 bg-[#FAF7E8] p-6 sm:p-8 rounded-3xl border border-[#D9D1B9] space-y-4">
          <h3 className="font-extrabold text-[#23312C] text-lg border-b border-[#D9D1B9] pb-3">
            Envíanos un Mensaje
          </h3>

          {submitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-extrabold text-sm">¡Mensaje enviado con éxito!</h4>
              <p className="text-xs">Te responderemos a la brevedad a tu correo electrónico.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#23312C] mb-1">Tu Nombre *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23312C] mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl"
                  placeholder="tu@correo.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23312C] mb-1">Mensaje o Pregunta *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium p-4 rounded-xl"
                  placeholder="Escribe tu duda sobre productos, envíos o pedidos..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-[#285F50] hover:bg-[#23312C] text-[#FAF7E8] font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 text-[#D17B24]" />
                <span>Enviar Mensaje</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
