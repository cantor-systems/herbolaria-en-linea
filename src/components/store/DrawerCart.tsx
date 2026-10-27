'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, Tag, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { trackBeginCheckout } from '@/lib/analytics';

export const DrawerCart: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    appliedPromo,
    applyPromoCode,
    removePromoCode,
    subtotalCents,
    discountCents,
    wholesaleDiscountPercent,
    wholesalePiecesUntilDiscount,
    shippingCents,
    totalCents,
    freeShippingRemainingCents,
    hasFreeShippingPromotion,
  } = useCart();

  const handleBeginCheckout = () => trackBeginCheckout(cart.map((item) => ({ item_id: item.product.slug, item_name: item.product.name, item_variant: item.variant.name, price: item.variant.priceCents / 100, quantity: item.quantity })), totalCents / 100);

  const [promoInput, setPromoInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isCartOpen) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (wholesaleDiscountPercent > 0 || !promoInput.trim()) return;
    const res = applyPromoCode(promoInput);
    setPromoFeedback(res);
    if (res.success) {
      setPromoInput('');
    }
  };

  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotalCents / SHIPPING_CONFIG.freeShippingThresholdCents) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-0 flex justify-end overflow-hidden pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md h-dvh max-h-dvh min-h-0 overflow-hidden bg-[#F4EFD6] shadow-2xl flex flex-col border-l border-[#D9D1B9] animate-in slide-in-from-right duration-300">

          {/* Header */}
          <div className="shrink-0 p-4 sm:p-5 bg-[#285F50] text-[#FAF7E8] flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#D17B24]" />
              <h3 className="text-lg font-bold">Tu Carrito de Compras</h3>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-[#FAF7E8]/80 hover:text-white hover:bg-white/10 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Cerrar carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Meter */}
          <div className="shrink-0 bg-[#FAF7E8] p-3 border-b border-[#D9D1B9] text-xs">
            {freeShippingRemainingCents > 0 ? (
              <div className="space-y-1.5">
                <div className="flex justify-between font-medium text-[#23312C]">
                  <span>Agrega <strong className="text-[#285F50]">{formatCurrency(freeShippingRemainingCents)}</strong> más para envío GRATIS</span>
                  <span className="font-bold">{freeShippingProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#D9D1B9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D17B24] transition-all duration-300 rounded-full"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-800 font-bold justify-center">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>
                  {wholesaleDiscountPercent > 0
                    ? '¡Tu mayoreo incluye envío estándar GRATIS!'
                    : hasFreeShippingPromotion
                      ? '¡Tu carrito incluye una promoción de envío estándar GRATIS!'
                    : '¡Felicidades! Tienes envío estándar GRATIS en tu pedido'}
                </span>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#23312C]/70">
                <div className="w-16 h-16 rounded-full bg-[#D9D1B9]/40 flex items-center justify-center mb-4 text-[#285F50]">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-lg text-[#23312C] mb-1">Tu carrito está vacío</h4>
                <p className="text-sm text-[#6F8F69] mb-6">
                  Agrega presentaciones de Moronel Planta de la Vida para continuar.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 bg-[#285F50] text-[#FAF7E8] font-bold rounded-xl shadow-md hover:bg-[#23312C] transition-colors"
                >
                  Explorar Productos
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#FAF7E8] p-3 sm:p-4 rounded-xl border border-[#D9D1B9] flex gap-3 shadow-2xs relative"
                >
                  <img
                    src={item.variant.image || item.product.images[0]}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded-lg border border-[#D9D1B9] shrink-0"
                  />
                  <div className="flex-1 min-w-0 pr-6">
                    <span className="text-[10px] font-bold text-[#D17B24] uppercase tracking-wider block">
                      {item.product.brand}
                    </span>
                    <h5 className="font-bold text-[#23312C] text-sm leading-tight truncate mb-1">
                      {item.product.name}
                    </h5>
                    <p className="text-xs text-[#6F8F69] font-medium mb-2">
                      Presentación: {item.variant.name}
                    </p>
                    {wholesaleDiscountPercent === 0 && item.variant.freeShippingEligible && (
                      <p className="text-[10px] font-bold text-emerald-700 mb-2">
                        Promoción: envío estándar gratis para todo el pedido
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-[#D9D1B9] rounded-lg bg-[#F4EFD6]">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-[#D9D1B9]/50 rounded-l-lg text-[#23312C]"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-[#23312C]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-[#D9D1B9]/50 rounded-r-lg text-[#23312C]"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-[#285F50] text-sm">
                          {formatCurrency(item.variant.priceCents * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="absolute top-3 right-3 text-[#98552B] hover:text-red-700 p-1"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Controls & Checkout CTA */}
          {cart.length > 0 && (
            <div className="shrink-0 p-4 bg-[#FAF7E8] border-t border-[#D9D1B9] space-y-3 shadow-lg">
              {wholesalePiecesUntilDiscount !== null && (
                <p className="rounded-lg border border-[#D17B24]/30 bg-[#D17B24]/10 p-2 text-[11px] font-bold text-[#7A3F22]">
                  Agrega {wholesalePiecesUntilDiscount}{' '}
                  {wholesalePiecesUntilDiscount === 1 ? 'pieza' : 'piezas'} más para obtener 35% de descuento de mayoreo.
                </p>
              )}

              {wholesaleDiscountPercent > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-900">
                  <p className="font-bold">
                    Descuento de mayoreo aplicado: {wholesaleDiscountPercent}%
                  </p>
                  <p className="mt-0.5" id="drawer-wholesale-coupon-note">
                    El descuento de mayoreo reemplaza cupones y otras promociones.
                  </p>
                </div>
              )}

              {/* Promo Code Form */}
              <form onSubmit={handleApplyCode} className="flex gap-2">
                <input
                  aria-describedby={
                    wholesaleDiscountPercent > 0
                      ? 'drawer-wholesale-coupon-note'
                      : undefined
                  }
                  disabled={wholesaleDiscountPercent > 0}
                  type="text"
                  placeholder="Código de cupón (ej. MORONEL15)"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="flex-1 bg-[#F4EFD6] border border-[#D9D1B9] text-xs px-3 py-2 rounded-lg text-[#23312C] font-semibold focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-55"
                />
                <button
                  disabled={wholesaleDiscountPercent > 0}
                  type="submit"
                  className="px-3 py-2 bg-[#285F50] text-white text-xs font-bold rounded-lg hover:bg-[#23312C] disabled:cursor-not-allowed disabled:bg-[#23312C]/45"
                >
                  Aplicar
                </button>
              </form>

              {appliedPromo && (
                <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 p-2 rounded-lg">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cupón {appliedPromo.code} · se verificará al pagar</span>
                  </div>
                  <button
                    onClick={() => {
                      removePromoCode();
                      setPromoFeedback(null);
                    }}
                    className="text-red-600 font-bold hover:underline text-[11px]"
                  >
                    Quitar
                  </button>
                </div>
              )}

              {promoFeedback && !appliedPromo && wholesaleDiscountPercent === 0 && (
                <p
                  className={`text-[11px] font-medium ${
                    promoFeedback.success ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {promoFeedback.message}
                </p>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-[#23312C] border-t border-[#D9D1B9]/60 pt-2">
                <div className="flex justify-between">
                  <span className="text-[#6F8F69]">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotalCents)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-emerald-800 font-medium">
                    <span>
                      {wholesaleDiscountPercent > 0
                        ? `Descuento mayoreo (${wholesaleDiscountPercent}%)`
                        : `Descuento ${appliedPromo?.code}`}
                      :
                    </span>
                    <span>-{formatCurrency(discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6F8F69]">Envío estándar:</span>
                  <span className="font-semibold">
                    {shippingCents === 0 ? (
                      <span className="text-emerald-700 font-bold">GRATIS</span>
                    ) : (
                      formatCurrency(shippingCents)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#285F50] border-t border-[#D9D1B9] pt-2">
                  <span>Total estimado:</span>
                  <span>{formatCurrency(totalCents)}</span>
                </div>
              </div>

              {/* Checkout Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/carrito"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full text-center py-2.5 px-3 border border-[#285F50] text-[#285F50] font-bold text-xs rounded-xl hover:bg-[#285F50]/10 transition-colors"
                >
                  Ver Carrito
                </Link>
                <Link
                  href="/checkout"
                  onClick={() => { handleBeginCheckout(); setIsCartOpen(false); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#D17B24] text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-[#98552B] transition-colors"
                >
                  <span>Proceder al Pago</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="hidden flex items-center justify-center gap-1.5 text-[11px] text-[#6F8F69] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#285F50]" />
                <span>Compra garantizada con Mercado Pago</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
