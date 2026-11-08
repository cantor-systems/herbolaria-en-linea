import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { loadSource, loadPricing } from '../helpers/isolatedModule.mjs';

export function syntheticProduct(priceCents = 69900, overrides = {}) {
  return {
    id: 'synthetic-product', slug: 'synthetic-product', name: 'Producto sintético',
    status: 'active', stockStatus: 'in_stock',
    variants: [{ id: 'synthetic-variant', name: 'Presentación sintética', unitsCount: 1, priceCents, unitPriceCents: priceCents, freeShippingEligible: false, wholesaleEligible: false, ...overrides }],
  };
}
const item = (quantity = 1) => [{ slug: 'synthetic-product', variantId: 'synthetic-variant', quantity }];
const pricing = loadPricing();

for (const [slug, prefix, single, rows] of [
  ['moronel-gotas-50ml', 'gotas', 33000, [[1, 33000, 33000, 0], [3, 89100, 29700, 10], [5, 140250, 28050, 15], [20, 528000, 26400, 20]]],
  ['moronel-capsulas-60-capsulas', 'caps', 33500, [[1, 33500, 33500, 0], [3, 90450, 30150, 10], [5, 142375, 28475, 15], [20, 536000, 26800, 20]]],
]) {
  for (const [units, price, unitPrice, discount] of rows) {
    test(`approved server quote: ${prefix} x${units} at ${price} cents, ${discount}% saving`, () => {
      const product = pricing.catalog.PRODUCTS.find(p => p.slug === slug);
      const variant = product.variants.find(v => v.id === `var-${prefix}-${units}`);
      assert.equal(product.priceCents, single); assert.equal(product.compareAtPriceCents, single);
      assert.equal(variant.unitsCount, units); assert.equal(variant.priceCents, price);
      assert.equal(variant.unitPriceCents, unitPrice); assert.equal(variant.compareAtPriceCents, single * units);
      assert.equal(price * 100, single * units * (100 - discount));
      for (const [method, shipping] of [['standard', units === 1 ? 9900 : 0], ['express', units === 1 ? 18600 : 7900]]) {
        const cart = pricing.server.priceCheckoutCart([{ slug, variantId: variant.id, quantity: 1 }], method, null);
        assert.equal(cart.items[0].variantId, variant.id); assert.equal(cart.items[0].unitPriceCents, price);
        assert.equal(cart.subtotalCents, price); assert.equal(cart.discountCents, 0);
        assert.equal(cart.wholesaleDiscountPercent, 0); assert.equal(cart.shippingCents, shipping);
        assert.equal(cart.totalCents, price + shipping);
      }
    });
  }
}

test('all other product prices and presentations remain unchanged and variant IDs are unique', () => {
  const expected = {
    'prod-moronel-hierba': [25500, 25500, 70500, 119900, 219000],
    'prod-paquete-integral': [83600, 83600],
    'prod-plantas-colesterol-trigliceridos': [33500, 33500],
    'prod-plantas-higado': [33500, 33500],
    'prod-plantas-rinones': [33500, 33500],
    'prod-super-curcuma': [33500, 33500],
    'prod-super-propoleo': [35000, 35000],
  };
  for (const product of pricing.catalog.PRODUCTS.slice(2)) {
    assert.deepEqual([product.priceCents, ...Array.from(product.variants, v => v.priceCents)], expected[product.id]);
    assert.ok(product.variants.every(v => !v.hiddenFromSelection));
  }
  const ids = Array.from(pricing.catalog.PRODUCTS).flatMap(p => Array.from(p.variants, v => v.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('saved ten-unit carts retain their identity, old price and quantity and stay quotable directly', () => {
  const products = pricing.catalog.PRODUCTS.slice(0, 2);
  const old = [['var-gotas-10', 268000, 335000, 26800], ['var-caps-10', 271200, 339000, 27120]];
  const storage = new Map([['herbolaria_cart_items_v1', JSON.stringify(Array.from(products, (p, i) => ({ id: 'old-line-' + i, product: { id: p.id }, variant: { id: old[i][0], priceCents: old[i][1] }, quantity: 2 })))]]);
  const states = [], effects = [];
  let index = 0, effectIndex = 0;
  const { CartProvider } = loadSource('src/context/CartContext.tsx', {
    react: { ...React, useState(initial) { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; }, useEffect(fn) { effects[effectIndex++] = fn; } },
    '@/config/shipping': pricing.shippingConfig, '@/data/products': pricing.catalog,
    '@/lib/analytics': { trackAddToCart: () => {} }, '@/lib/promotions': pricing.promotionRules,
    '@/lib/shipping': pricing.shipping, '@/lib/wholesale': pricing.wholesale,
  }, { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
  const render = () => { index = 0; effectIndex = 0; return CartProvider({ children: null }).props.value; };
  render(); effects[0](); const client = render(); effects[1]();
  assert.equal(client.cart.length, 2);
  for (const [i, line] of client.cart.entries()) {
    const [id, price, comparison, unit] = old[i];
    assert.equal(line.variant.id, id); assert.equal(line.variant.unitsCount, 10); assert.equal(line.quantity, 2);
    assert.equal(line.variant.priceCents, price); assert.equal(line.variant.compareAtPriceCents, comparison);
    assert.equal(line.variant.unitPriceCents, unit); assert.equal(line.variant.hiddenFromSelection, true);
    assert.ok(line.variant.name.startsWith('10 Frascos'));
    const direct = pricing.server.priceCheckoutCart([{ slug: line.product.slug, variantId: id, quantity: 2 }], 'standard', null);
    assert.equal(direct.subtotalCents, price * 2); assert.equal(direct.items[0].variantLabel, line.variant.name);
  }
  assert.equal(client.subtotalCents, 1078400); assert.equal(client.discountCents, 0);
  const server = pricing.server.priceCheckoutCart(Array.from(client.cart, line => ({ slug: line.product.slug, variantId: line.variant.id, quantity: line.quantity })), 'standard', null);
  assert.equal(client.totalCents, server.totalCents);
  const saved = JSON.parse(storage.get('herbolaria_cart_items_v1'));
  assert.deepEqual(saved.map(line => [line.variant.id, line.quantity]), old.map(row => [row[0], 2]));
});

test('shipping retains all rates and uses the approved inclusive 69900-cent threshold', () => {
  const config = pricing.shippingConfig.SHIPPING_CONFIG;
  assert.equal(config.freeShippingThresholdCents, 69900);
  assert.equal(config.standardShippingCents, 9900);
  assert.equal(config.expressShippingCents, 18600);
  assert.equal(config.expressUpgradeCents, 7900);
  for (const [subtotalCents, standard, express] of [[69899, 9900, 18600], [69900, 0, 7900], [69901, 0, 7900]]) {
    const local = loadPricing({ products: [syntheticProduct(subtotalCents)] });
    for (const [method, expected] of [['standard', standard], ['express', express]]) {
      const server = local.server.priceCheckoutCart(item(), method, null);
      const client = local.shipping.calculateShippingCents({ subtotalCents, lines: [{ freeShippingEligible: false }], method });
      assert.equal(client, expected); assert.equal(server.shippingCents, client);
      assert.equal(server.totalCents, subtotalCents + expected);
    }
  }
});

test('only carts in the newly approved interval change cost compared with the previous threshold', () => {
  const old = loadSource('src/lib/shipping.ts', { '@/config/shipping': { SHIPPING_CONFIG: { ...pricing.shippingConfig.SHIPPING_CONFIG, freeShippingThresholdCents: 79900 } } });
  for (const subtotalCents of [33500, 69899, 69900, 70500, 79899, 79900, 90000]) {
    for (const method of ['standard', 'express']) {
      const input = { subtotalCents, method, lines: [{ freeShippingEligible: false }] };
      const before = old.calculateShippingCents(input), after = pricing.shipping.calculateShippingCents(input);
      assert.equal(before - after, subtotalCents >= 69900 && subtotalCents < 79900 ? (method === 'standard' ? 9900 : 10700) : 0);
    }
  }
});

test('special-presentation and wholesale free shipping survive below the new threshold', () => {
  const special = loadPricing({ products: [syntheticProduct(10000, { freeShippingEligible: true })] });
  assert.equal(special.server.priceCheckoutCart(item(), 'standard', null).shippingCents, 0);
  assert.equal(special.server.priceCheckoutCart(item(), 'express', null).shippingCents, 7900);
  const wholesale = loadPricing({ products: [syntheticProduct(1000, { wholesaleEligible: true })] });
  for (const [method, shipping] of [['standard', 0], ['express', 7900]]) {
    const cart = wholesale.server.priceCheckoutCart(item(20), method, null);
    assert.equal(cart.subtotalCents, 20000); assert.equal(cart.wholesaleDiscountPercent, 35);
    assert.equal(cart.discountCents, 7000); assert.equal(cart.shippingCents, shipping);
    assert.equal(cart.totalCents, 13000 + shipping);
  }
});

test('a synthetic coupon does not change the pre-discount threshold and expired real coupons stay expired', () => {
  const promotions = { PROMOTIONS_ENABLED: true, PROMOTIONS_CONFIG: [{ code: 'SYNTHETIC20', enabled: true, type: 'percentage', value: 20, minimumSubtotalCents: 0, timeZone: 'America/Mexico_City' }] };
  for (const [subtotal, shipping] of [[69899, 9900], [69900, 0], [70000, 0]]) {
    const local = loadPricing({ products: [syntheticProduct(subtotal)], promotions });
    const cart = local.server.priceCheckoutCart(item(), 'standard', 'SYNTHETIC20');
    assert.ok(cart.subtotalCents - cart.discountCents < 69900);
    assert.equal(cart.shippingCents, shipping);
    assert.equal(cart.totalCents, subtotal - cart.discountCents + shipping);
  }
  const expired = pricing.promotionRules.validatePromotion({ code: 'MORONEL15', subtotalCents: 100000, now: new Date('2026-11-07T12:00:00Z') });
  assert.equal(expired.valid, false); assert.equal(expired.reason, 'expired');
});

test('an existing cart keeps its selected multi-unit package and quantity while shipping is recalculated', () => {
  const product = pricing.catalog.PRODUCTS.find(p => p.id === 'prod-moronel-hierba');
  const variant = product.variants.find(v => v.unitsCount === 3);
  const storage = new Map([['herbolaria_cart_items_v1', JSON.stringify([{ id: 'old-line', product: { id: product.id }, variant: { id: variant.id, priceCents: 1 }, quantity: 1 }])]]);
  const states = [], effects = [];
  let index = 0, effectIndex = 0;
  const { CartProvider } = loadSource('src/context/CartContext.tsx', {
    react: { ...React, useState(initial) { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; }, useEffect(fn) { effects[effectIndex++] = fn; } },
    '@/config/shipping': pricing.shippingConfig, '@/data/products': pricing.catalog,
    '@/lib/analytics': { trackAddToCart: () => {} }, '@/lib/promotions': pricing.promotionRules,
    '@/lib/shipping': pricing.shipping, '@/lib/wholesale': pricing.wholesale,
  }, { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
  const render = () => { index = 0; effectIndex = 0; return CartProvider({ children: null }).props.value; };
  render(); effects[0]();
  let client = render(); effects[1]();
  assert.equal(client.cart[0].variant, variant); assert.equal(client.cart[0].quantity, 1);
  assert.equal(client.subtotalCents, 70500); assert.equal(client.shippingCents, 0);
  assert.equal(client.freeShippingRemainingCents, 0); assert.equal(client.hasFreeShippingPromotion, false);
  const server = pricing.server.priceCheckoutCart([{ slug: product.slug, variantId: variant.id, quantity: 1 }], 'standard', null);
  assert.equal(client.totalCents, server.totalCents);
  const saved = JSON.parse(storage.get('herbolaria_cart_items_v1'));
  assert.equal(saved[0].variant.id, variant.id); assert.equal(saved[0].quantity, 1);
  client.updateQuantity(client.cart[0].id, 2); client = render();
  assert.equal(client.cart[0].variant.id, variant.id); assert.equal(client.cart[0].quantity, 2);
  assert.equal(client.subtotalCents, 141000); assert.equal(client.shippingCents, 0);
});
