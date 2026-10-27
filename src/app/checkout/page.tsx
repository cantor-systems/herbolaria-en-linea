'use client';

import React, { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { calculateShippingCents, type ShippingMethod } from '@/lib/shipping';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  User,
  MapPin,
  Lock,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

function isMercadoPagoCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      (hostname === 'mercadopago.com' ||
        hostname.endsWith('.mercadopago.com') ||
        hostname === 'mercadopago.com.mx' ||
        hostname.endsWith('.mercadopago.com.mx'))
    );
  } catch {
    return false;
  }
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const {
    cart,
    subtotalCents,
    promotionCode,
    discountCents,
    wholesaleDiscountPercent,
  } = useCart();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const checkoutAttempt = useRef<{ id: string; requestBody: string } | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappOrderUpdates, setWhatsappOrderUpdates] = useState(false);

  const [fullName, setFullName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [colonia, setColonia] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const shippingLines = cart.map((item) => ({
    freeShippingEligible: item.variant.freeShippingEligible,
  }));
  const standardShippingCents = calculateShippingCents({
    subtotalCents,
    lines: shippingLines,
    method: 'standard',
    freeStandardShipping: wholesaleDiscountPercent > 0,
  });
  const expressShippingCents = calculateShippingCents({
    subtotalCents,
    lines: shippingLines,
    method: 'express',
    freeStandardShipping: wholesaleDiscountPercent > 0,
  });
  const shippingCents =
    shippingMethod === 'standard' ? standardShippingCents : expressShippingCents;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRedirecting) return;

    try {
      setIsRedirecting(true);
      setPaymentError(null);

      const requestBody = JSON.stringify({
        items: cart.map((item) => ({
          slug: item.product.slug,
          variantId: item.variant.id,
          quantity: item.quantity,
        })),
        shippingMethod,
        promotionCode,
        whatsappNotificationsOptIn: whatsappOrderUpdates,
        buyer: {
          email,
          phone,
          fullName,
          streetAddress,
          colonia,
          city,
          state,
          postalCode,
        },
      });

      if (!checkoutAttempt.current || checkoutAttempt.current.requestBody !== requestBody) {
        checkoutAttempt.current = { id: window.crypto.randomUUID(), requestBody };
      }

      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': checkoutAttempt.current.id,
        },
        body: requestBody,
      });

      const result: unknown = await response.json();
      const responseError =
        typeof result === 'object' &&
        result !== null &&
        'error' in result &&
        typeof (result as { error?: unknown }).error === 'string'
          ? (result as { error: string }).error
          : null;
      const checkoutUrl =
        typeof result === 'object' && result !== null && 'checkoutUrl' in result
          ? (result as { checkoutUrl?: unknown }).checkoutUrl
          : undefined;

      if (!response.ok) {
        setPaymentError(responseError ?? 'No pudimos iniciar el pago. Intenta nuevamente.');
        setIsRedirecting(false);
        return;
      }
      if (!isMercadoPagoCheckoutUrl(checkoutUrl)) throw new Error('invalid_checkout_url');
      window.location.assign(checkoutUrl);
    } catch {
      setPaymentError('No pudimos iniciar el pago. Intenta nuevamente.');
      setIsRedirecting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#FAF7E8] text-center rounded-3xl border border-[#D9D1B9] space-y-4">
        <h2 className="font-extrabold text-2xl text-[#23312C]">No tienes productos en tu carrito</h2>
        <p className="text-xs text-[#6F8F69]">Agrega productos antes de acceder al checkout.</p>
        <Link href="/tienda" className="inline-block px-6 py-3 bg-[#285F50] text-white font-bold text-xs rounded-xl">
          Ver Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Checkout Steps Indicator */}
      <div className="bg-[#285F50] text-[#FAF7E8] p-6 rounded-3xl shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#D17B24]" />
            <span>Checkout Seguro Moronel Planta de la Vida</span>
          </h1>
          <span className="text-xs font-bold text-[#AFC28E]">Pago seguro con Mercado Pago</span>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2 text-[11px] font-bold text-center">
          <div className={`py-2 rounded-xl transition-colors ${step >= 1 ? 'bg-[#D17B24] text-white' : 'bg-white/10 text-white/60'}`}>
            1. Cliente
          </div>
          <div className={`py-2 rounded-xl transition-colors ${step >= 2 ? 'bg-[#D17B24] text-white' : 'bg-white/10 text-white/60'}`}>
            2. Dirección
          </div>
          <div className={`py-2 rounded-xl transition-colors ${step >= 3 ? 'bg-[#D17B24] text-white' : 'bg-white/10 text-white/60'}`}>
            3. Envío
          </div>
          <div className={`py-2 rounded-xl transition-colors ${step >= 4 ? 'bg-[#D17B24] text-white' : 'bg-white/10 text-white/60'}`}>
            4. Pago
          </div>
        </div>
      </div>

      {(searchParams?.get('payment') === 'failed' || paymentError) && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
          {paymentError ?? 'El pago no se completó. Puedes revisar tus datos e intentarlo nuevamente.'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Form Container (8 cols) */}
        <div className="lg:col-span-8 bg-[#FAF7E8] p-6 sm:p-8 rounded-3xl border border-[#D9D1B9] shadow-xs space-y-6">

          {/* STEP 1: CLIENT DATA */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-extrabold text-[#23312C] text-lg border-b border-[#D9D1B9] pb-3">
                <User className="w-5 h-5 text-[#285F50]" />
                <h3>1. Datos de Contacto del Cliente</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#23312C] mb-1">
                    Correo Electrónico (para tu guía de rastreo) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#23312C] mb-1">
                    Teléfono Celular con WhatsApp (10 dígitos en México) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="55 0000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl focus:outline-hidden"
                  />
                </div>

              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#23312C] bg-[#F4EFD6] p-3 rounded-xl border border-[#D9D1B9]">
                  <input
                    type="checkbox"
                    checked={whatsappOrderUpdates}
                    onChange={(e) => setWhatsappOrderUpdates(e.target.checked)}
                    className="mt-0.5 accent-[#285F50] w-4 h-4"
                  />
                  <span className="leading-tight">Quiero recibir actualizaciones de mi pedido por WhatsApp.</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (email && phone) setStep(2);
                  else alert('Por favor ingresa tu correo y teléfono celular.');
                }}
                className="w-full py-3.5 px-6 bg-[#285F50] text-[#FAF7E8] font-bold text-xs rounded-xl hover:bg-[#23312C] transition-colors"
              >
                Continuar a Dirección de Envío
              </button>
            </div>
          )}

          {/* STEP 2: SHIPPING ADDRESS */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-extrabold text-[#23312C] text-lg border-b border-[#D9D1B9] pb-3">
                <MapPin className="w-5 h-5 text-[#285F50]" />
                <h3>2. Dirección de Entrega en México</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#23312C] mb-1">
                    Nombre Completo de Quien Recibe *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre y Apellidos"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#23312C] mb-1">
                    Calle, Número Exterior e Interior *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Av. Hidalgo #123 Int 4B"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#23312C] mb-1">
                    Colonia / Fraccionamiento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Colonia Centro"
                    value={colonia}
                    onChange={(e) => setColonia(e.target.value)}
                    className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#23312C] mb-1">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="06000"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#23312C] mb-1">
                    Ciudad / Municipio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Cuauhtémoc"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#23312C] mb-1">
                    Estado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ciudad de México"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-medium px-4 py-3 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-4 border border-[#D9D1B9] text-[#23312C] text-xs font-bold rounded-xl"
                >
                  Regresar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fullName && streetAddress && colonia && postalCode && city && state) setStep(3);
                    else alert('Por favor completa todos los campos de dirección.');
                  }}
                  className="flex-1 py-3.5 px-6 bg-[#285F50] text-[#FAF7E8] font-bold text-xs rounded-xl"
                >
                  Continuar a Método de Envío
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SHIPPING METHOD */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-extrabold text-[#23312C] text-lg border-b border-[#D9D1B9] pb-3">
                <Truck className="w-5 h-5 text-[#285F50]" />
                <h3>3. Método de Envío Nacional</h3>
              </div>

              <div className="space-y-3">
                <label className={`flex items-center justify-between p-4 bg-[#F4EFD6] border-2 rounded-2xl cursor-pointer ${shippingMethod === 'standard' ? 'border-[#285F50]' : 'border-[#D9D1B9]'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="standard"
                      checked={shippingMethod === 'standard'}
                      onChange={() => setShippingMethod('standard')}
                      className="accent-[#285F50]"
                    />
                    <div>
                      <span className="font-extrabold text-xs text-[#23312C] block">
                        Envío Estándar
                      </span>
                      <span className="text-[11px] text-[#6F8F69]">
                        {SHIPPING_CONFIG.standardEstimatedDays}
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-xs text-[#285F50]">
                    {standardShippingCents === 0
                      ? 'GRATIS'
                      : formatCurrency(standardShippingCents)}
                  </span>
                </label>

                <label className={`flex items-center justify-between p-4 bg-[#F4EFD6] border-2 rounded-2xl cursor-pointer ${shippingMethod === 'express' ? 'border-[#285F50]' : 'border-[#D9D1B9]'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="express"
                      checked={shippingMethod === 'express'}
                      onChange={() => setShippingMethod('express')}
                      className="accent-[#285F50]"
                    />
                    <div>
                      <span className="font-extrabold text-xs text-[#23312C] block">
                        Envío Exprés
                      </span>
                      <span className="text-[11px] text-[#6F8F69]">
                        {SHIPPING_CONFIG.expressEstimatedDays}
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-xs text-[#285F50]">
                    {formatCurrency(expressShippingCents)}
                  </span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 px-4 border border-[#D9D1B9] text-[#23312C] text-xs font-bold rounded-xl"
                >
                  Regresar
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-1 py-3.5 px-6 bg-[#285F50] text-[#FAF7E8] font-bold text-xs rounded-xl"
                >
                  Continuar a Forma de Pago
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT METHOD */}
          {step === 4 && (
            <form onSubmit={handleCompleteOrder} className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-extrabold text-[#23312C] text-lg border-b border-[#D9D1B9] pb-3">
                <CreditCard className="w-5 h-5 text-[#285F50]" />
                <h3>4. Selección de Método de Pago</h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl border-2 border-[#285F50] bg-[#F4EFD6]">
                  <span className="font-extrabold text-xs text-[#23312C] block">
                    Pago Seguro con Mercado Pago
                  </span>
                  <p className="text-[11px] text-[#6F8F69] mt-0.5 leading-relaxed">
                    Serás redirigido a Mercado Pago para elegir el medio de pago. No capturamos datos de tarjeta en este sitio.
                  </p>
                  <div className="mt-3 border-t border-[#D9D1B9] pt-3 space-y-1.5">
                    <p className="text-sm font-black text-[#285F50]">
                      Total que pagarás en Mercado Pago: {formatCurrency(totalCents)} MXN
                    </p>
                    <p className="text-[11px] text-[#6F8F69] leading-relaxed">
                      Incluye productos, descuentos aplicados y el método de envío seleccionado.
                    </p>
                    <p className="text-[11px] text-[#6F8F69] leading-relaxed">
                      Mercado Pago puede mostrar productos y envío por separado. El cargo total de esta compra será de {formatCurrency(totalCents)} MXN.
                    </p>
                  </div>
                </div>
              </div>

              {paymentError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                  {paymentError}
                </p>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="py-3 px-4 border border-[#D9D1B9] text-[#23312C] text-xs font-bold rounded-xl"
                >
                  Regresar
                </button>

                <button
                  type="submit"
                  disabled={isRedirecting}
                  className="flex-1 py-4 px-6 bg-[#D17B24] hover:bg-[#98552B] disabled:cursor-wait disabled:opacity-70 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 min-h-[48px]"
                >
                  <span>
                    {isRedirecting
                      ? 'Conectando con Mercado Pago…'
                      : `Pagar con Mercado Pago (${formatCurrency(totalCents)})`}
                  </span>
                  {!isRedirecting && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Order Items Preview Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#FAF7E8] p-5 rounded-3xl border border-[#D9D1B9] shadow-xs space-y-4">
            <h3 className="font-extrabold text-[#23312C] text-sm border-b border-[#D9D1B9] pb-3">
              Resumen de Productos ({cart.reduce((a, c) => a + c.quantity, 0)})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs">
                  <img
                    src={item.variant.image || item.product.images[0]}
                    alt={item.product.name}
                    className="w-12 h-12 object-cover rounded-lg border border-[#D9D1B9] bg-[#F4EFD6] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-[#23312C] truncate">{item.product.name}</h5>
                    <span className="text-[10px] text-[#6F8F69] block">
                      Cant: {item.quantity} · {item.variant.name}
                    </span>
                    <span className="font-extrabold text-[#285F50] text-xs block">
                      {formatCurrency(item.variant.priceCents * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-xs text-[#23312C] border-t border-[#D9D1B9] pt-3">
              <div className="flex justify-between">
                <span className="text-[#6F8F69]">Subtotal:</span>
                <span>{formatCurrency(subtotalCents)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>
                    {wholesaleDiscountPercent > 0
                      ? `Descuento mayoreo (${wholesaleDiscountPercent}%)`
                      : `Descuento ${promotionCode}`}
                    :
                  </span>
                  <span>-{formatCurrency(discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#6F8F69]">
                  Envío {shippingMethod === 'standard' ? 'estándar' : 'exprés'}:
                </span>
                <span>{shippingCents === 0 ? 'GRATIS' : formatCurrency(shippingCents)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#285F50] border-t border-[#D9D1B9] pt-2">
                <span>Total:</span>
                <span>{formatCurrency(totalCents)}</span>
              </div>
            </div>

            <div className="hidden bg-[#F4EFD6] p-3 rounded-xl border border-[#D9D1B9] text-[11px] text-[#6F8F69] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#285F50]">
                <ShieldCheck className="w-4 h-4" />
                <span>Garantía de Satisfacción</span>
              </div>
              <p>Procesamos y despachamos tu pedido en días hábiles con seguimiento continuo.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Cargando checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
