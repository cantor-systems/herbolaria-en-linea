'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ProductVariant } from '@/types';
import { SHIPPING_CONFIG } from '@/config/shipping';
import { PRODUCTS } from '@/data/products';
import { trackAddToCart } from '@/lib/analytics';
import {
  normalizePromotionCode,
  validatePromotion,
  type ValidatedPromotion,
} from '@/lib/promotions';
import {
  calculateShippingCents,
  hasFreeShippingPromotion as cartHasFreeShippingPromotion,
} from '@/lib/shipping';
import {
  calculateWholesaleDiscount,
  isWholesaleEligiblePresentation,
  type WholesaleDiscountPercent,
} from '@/lib/wholesale';

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  clearCart: () => void;
  appliedPromo: ValidatedPromotion | null;
  promotionCode: string | null;
  applyPromoCode: (code: string) => { success: boolean; message: string };
  removePromoCode: () => void;
  subtotalCents: number;
  discountCents: number;
  wholesaleEligibleQuantity: number;
  wholesaleDiscountPercent: WholesaleDiscountPercent;
  wholesalePiecesUntilDiscount: number | null;
  shippingCents: number;
  totalCents: number;
  freeShippingRemainingCents: number;
  hasFreeShippingPromotion: boolean;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPromotionCode, setSelectedPromotionCode] = useState<string | null>(null);

  // Load saved cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('herbolaria_cart_items_v1');
      if (savedCart) {
        const parsedCart: unknown = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          const currentCart = parsedCart.flatMap((savedItem) => {
            if (typeof savedItem !== 'object' || savedItem === null) return [];
            const item = savedItem as Partial<CartItem>;
            const product = PRODUCTS.find((candidate) => candidate.id === item.product?.id);
            const variant = product?.variants.find((candidate) => candidate.id === item.variant?.id);
            if (!product || !variant || !Number.isSafeInteger(item.quantity) || (item.quantity ?? 0) < 1) {
              return [];
            }
            return [{ id: `${product.id}-${variant.id}`, product, variant, quantity: item.quantity! }];
          });
          setCart(currentCart);
        }
      }
      const savedPromo = localStorage.getItem('herbolaria_applied_promo_v1');
      if (savedPromo) {
        let savedCode = savedPromo;
        try {
          const parsedPromo: unknown = JSON.parse(savedPromo);
          if (typeof parsedPromo === 'string') savedCode = parsedPromo;
          if (
            typeof parsedPromo === 'object' &&
            parsedPromo !== null &&
            'code' in parsedPromo &&
            typeof parsedPromo.code === 'string'
          ) {
            savedCode = parsedPromo.code;
          }
        } catch {
          // Current storage format is the normalized code itself.
        }
        setSelectedPromotionCode(normalizePromotionCode(savedCode));
      }
    } catch (e) {
      console.error('Error loading cart from storage', e);
    }
  }, []);

  // Save cart changes
  useEffect(() => {
    try {
      localStorage.setItem('herbolaria_cart_items_v1', JSON.stringify(cart));
      if (selectedPromotionCode) {
        localStorage.setItem('herbolaria_applied_promo_v1', selectedPromotionCode);
      } else {
        localStorage.removeItem('herbolaria_applied_promo_v1');
      }
    } catch (e) {
      console.error('Error saving cart to storage', e);
    }
  }, [cart, selectedPromotionCode]);

  const addToCart = (product: Product, variant: ProductVariant, quantity: number = 1) => {
    const itemId = `${product.id}-${variant.id}`;
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === itemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prevCart, { id: itemId, product, variant, quantity }];
    });
    setIsCartOpen(true);
    trackAddToCart({ item_id: product.slug, item_name: product.name, item_variant: variant.name, price: variant.priceCents / 100, quantity });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    setSelectedPromotionCode(null);
  };

  const subtotalCents = cart.reduce((acc, item) => acc + item.variant.priceCents * item.quantity, 0);

  const wholesaleDiscount = calculateWholesaleDiscount(
    cart.map((item) => ({
      quantity: item.quantity,
      unitPriceCents: item.variant.priceCents,
      wholesaleEligible: isWholesaleEligiblePresentation(item.product, item.variant),
    }))
  );

  const promotionValidation = selectedPromotionCode
    ? validatePromotion({ code: selectedPromotionCode, subtotalCents })
    : null;
  const appliedPromo =
    wholesaleDiscount.percent === 0 && promotionValidation?.valid
      ? promotionValidation
      : null;
  const promotionCode = appliedPromo?.code ?? null;

  const applyPromoCode = (code: string) => {
    const result = validatePromotion({ code, subtotalCents });
    if (!result.valid) {
      return { success: false, message: result.message };
    }
    setSelectedPromotionCode(result.code);
    if (wholesaleDiscount.percent > 0) {
      return {
        success: true,
        message: 'Cupón guardado. El descuento de mayoreo lo reemplaza mientras esté activo.',
      };
    }
    return {
      success: true,
      message: `Cupón ${result.code} aplicado al total estimado. Se validará nuevamente al pagar.`,
    };
  };

  const removePromoCode = () => {
    setSelectedPromotionCode(null);
  };

  const discountCents =
    wholesaleDiscount.percent > 0
      ? wholesaleDiscount.discountCents
      : appliedPromo?.discountCents ?? 0;

  const netSubtotal = Math.max(0, subtotalCents - discountCents);

  const shippingLines = cart.map((item) => ({
    freeShippingEligible: item.variant.freeShippingEligible,
  }));
  const hasFreeShippingPromotion = cartHasFreeShippingPromotion(shippingLines);

  const freeShippingRemainingCents = Math.max(
    0,
    hasFreeShippingPromotion || wholesaleDiscount.percent > 0
      ? 0
      : SHIPPING_CONFIG.freeShippingThresholdCents - subtotalCents
  );

  const shippingCents = calculateShippingCents({
    subtotalCents,
    lines: shippingLines,
    method: 'standard',
    freeStandardShipping: wholesaleDiscount.percent > 0,
  });

  const totalCents = netSubtotal + shippingCents;

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        appliedPromo,
        promotionCode,
        applyPromoCode,
        removePromoCode,
        subtotalCents,
        discountCents,
        wholesaleEligibleQuantity: wholesaleDiscount.eligibleQuantity,
        wholesaleDiscountPercent: wholesaleDiscount.percent,
        wholesalePiecesUntilDiscount: wholesaleDiscount.piecesUntilDiscount,
        shippingCents,
        totalCents,
        freeShippingRemainingCents,
        hasFreeShippingPromotion,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider');
  }
  return context;
};
