'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { getBrandBySlug } from '@/data/brands';
import { formatCurrency } from '@/lib/utils';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { trackBeginCheckout } from '@/lib/analytics';
import { ShoppingBag, Trash2, Plus, Minus, Tag, ArrowRight, ArrowLeft, Truck } from 'lucide-react';

export default function CartPage() {
  const {
    cart,
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

  const [promoInput, setPromoInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (wholesaleDiscountPercent > 0 || !promoInput.trim()) return;
    const res = applyPromoCode(promoInput);
    setPromoFeedback(res);
    if (res.success) setPromoInput('');
  };

  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotalCents / SHIPPING_CONFIG.freeShippingThresholdCents) * 100)
  );
  const handleBeginCheckout = () => trackBeginCheckout(cart.map((item) => ({ item_id: item.product.slug, item_name: item.product.name, item_variant: item.variant.name, price: item.variant.priceCents / 100, quantity: item.quantity })), totalCents / 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#D9D1B9] pb-4">
        <div>
          <span className="text-xs font-black uppercase text-[#D17B24] tracking-wider block">
            Resumen de tu pedido
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23312C]">
            Carrito de compras
          </h1>
        </div>
        <Link
          href="/tienda"
          className="min-h-[44px] text-xs font-bold text-[#285F50] hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Seguir Comprando</span>
        </Link>
      </div>

      {cart.length === 0 ? (
        <div className="bg-[#FAF7E8] p-12 text-center rounded-3xl border border-[#D9D1B9] max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F4EFD6] flex items-center justify-center mx-auto text-[#285F50]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-xl text-[#23312C]">Tu carrito está vacío</h3>
          <p className="text-sm text-[#6F8F69]">
            Agrega productos desde la tienda para comenzar tu compra.
          </p>
          <Link
            href="/tienda"
            className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 bg-[#285F50] text-[#FAF7E8] font-bold text-xs rounded-xl shadow-md hover:bg-[#23312C]"
          >
            <span>Ver productos</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Cart Items List (8 cols) */}
          <div className="lg:col-span-8 space-y-4">

            {/* Items */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#FAF7E8] p-4 rounded-2xl border border-[#D9D1B9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <img
                      src={item.variant.image || item.product.images[0]}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded-xl border border-[#D9D1B9] bg-[#F4EFD6] shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-[#D17B24] uppercase block">
                        {getBrandBySlug(item.product.brandSlug)?.name ?? item.product.brandSlug}
                      </span>
                      <h4 className="font-extrabold text-[#23312C] text-sm leading-snug line-clamp-2">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-[#6F8F69] mt-0.5">
                        Presentación: {item.variant.name}
                      </p>
                      <span className="text-xs font-extrabold text-[#285F50] block sm:hidden mt-1">
                        {formatCurrency(item.variant.priceCents)} c/u
                      </span>
                    </div>
                  </div>

                  {/* Quantity and Price Desktop */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D9D1B9]/60">
                    <div className="flex items-center border border-[#D9D1B9] rounded-xl bg-[#F4EFD6]">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#D9D1B9]/50 text-[#23312C] rounded-l-xl"
                        aria-label={`Disminuir cantidad de ${item.product.name}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold text-[#23312C]">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#D9D1B9]/50 text-[#23312C] rounded-r-xl"
                        aria-label={`Aumentar cantidad de ${item.product.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-[#285F50] text-base block">
                        {formatCurrency(item.variant.priceCents * item.quantity)}
                      </span>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#98552B] hover:text-red-700 rounded-lg hover:bg-red-50"
                      title="Eliminar"
                      aria-label={`Eliminar ${item.product.name} del carrito`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {/* Shipping status */}
            <div className="bg-[#FAF7E8] p-4 rounded-2xl border border-[#D9D1B9] space-y-2">
              {freeShippingRemainingCents > 0 ? (
                <div>
                  <div className="flex justify-between gap-3 text-xs font-bold text-[#23312C] mb-1">
                    <span>Agrega <strong className="text-[#285F50]">{formatCurrency(freeShippingRemainingCents)}</strong> para envío gratis</span>
                    <span className="shrink-0">{freeShippingProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#D9D1B9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D17B24] rounded-full transition-all duration-300"
                      style={{ width: `${freeShippingProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {wholesaleDiscountPercent > 0
                      ? 'Tu mayoreo incluye envío estándar gratis'
                      : hasFreeShippingPromotion
                        ? 'Tu carrito incluye envío estándar gratis por promoción'
                        : 'Tu pedido tiene envío estándar gratis'}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Order Summary Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#FAF7E8] p-5 rounded-3xl border-2 border-[#D9D1B9] shadow-sm space-y-4">
              <h3 className="font-extrabold text-[#23312C] text-base border-b border-[#D9D1B9] pb-3">
                Resumen de compra
              </h3>

              {wholesalePiecesUntilDiscount !== null && (
                <p className="rounded-xl border border-[#D17B24]/30 bg-[#D17B24]/10 p-2.5 text-[11px] font-bold text-[#7A3F22]">
                  Agrega {wholesalePiecesUntilDiscount}{' '}
                  {wholesalePiecesUntilDiscount === 1 ? 'pieza' : 'piezas'} más para obtener 35% de descuento de mayoreo.
                </p>
              )}

              {wholesaleDiscountPercent > 0 && (
                <div
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-emerald-900"
                  id="cart-wholesale-coupon-note"
                >
                  <p className="font-bold">Descuento de mayoreo aplicado: {wholesaleDiscountPercent}%</p>
                  <p className="mt-0.5">El descuento de mayoreo reemplaza cupones y otras promociones.</p>
                </div>
              )}

              {/* Promo Code Input */}
              <form onSubmit={handleApplyPromo} className="space-y-2">
                <label className="text-xs font-bold text-[#23312C] uppercase block">
                  ¿Tienes un cupón de descuento?:
                </label>
                <div className="flex gap-2">
                  <input
                    aria-describedby={
                      wholesaleDiscountPercent > 0
                        ? 'cart-wholesale-coupon-note'
                        : undefined
                    }
                    disabled={wholesaleDiscountPercent > 0}
                    type="text"
                    placeholder="Ej. MORONEL15"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    aria-label="Código de cupón"
                    className="min-h-[44px] min-w-0 flex-1 bg-[#F4EFD6] border border-[#D9D1B9] text-xs font-bold px-3 py-2 rounded-xl text-[#23312C] uppercase disabled:cursor-not-allowed disabled:opacity-55"
                  />
                  <button
                    disabled={wholesaleDiscountPercent > 0}
                    type="submit"
                    className="min-h-[44px] px-3 py-2 bg-[#285F50] text-white text-xs font-bold rounded-xl disabled:cursor-not-allowed disabled:bg-[#23312C]/45"
                  >
                    Aplicar
                  </button>
                </div>
              </form>

              {appliedPromo && (
                <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 p-2.5 rounded-xl font-bold">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span>Cupón {appliedPromo.code} · se verificará al pagar</span>
                  </div>
                  <button
                    onClick={() => {
                      removePromoCode();
                      setPromoFeedback(null);
                    }}
                    className="min-h-[44px] px-2 text-red-600 hover:underline text-[11px]"
                  >
                    Quitar
                  </button>
                </div>
              )}

              {promoFeedback && !appliedPromo && wholesaleDiscountPercent === 0 && (
                <p className={`text-[11px] font-medium ${promoFeedback.success ? 'text-emerald-700' : 'text-red-600'}`}>
                  {promoFeedback.message}
                </p>
              )}

              {/* Costs Breakdown */}
              <div className="space-y-2 text-xs text-[#23312C] border-t border-[#D9D1B9] pt-3">
                <div className="flex justify-between">
                  <span className="text-[#6F8F69]">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotalCents)}</span>
                </div>

                {discountCents > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
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
                      <strong className="text-emerald-700">GRATIS</strong>
                    ) : (
                      formatCurrency(shippingCents)
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-lg font-black text-[#285F50] border-t border-[#D9D1B9] pt-3">
                  <span>Total estimado:</span>
                  <span>{formatCurrency(totalCents)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={handleBeginCheckout}
                className="w-full py-3.5 px-4 bg-[#D17B24] hover:bg-[#98552B] text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 min-h-[48px]"
              >
                <span>Proceder al pago</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
