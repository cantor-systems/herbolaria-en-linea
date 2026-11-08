import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource, loadPricing } from '../helpers/isolatedModule.mjs';

function harness({ products, promotions } = {}) {
  const pricing = loadPricing({ products, promotions });
  const policy = loadSource('src/lib/mercadopago/preferencePolicy.ts');
  const lifecycle = loadSource('src/lib/mercadopago/preferenceLifecycle.ts');
  const created = [], persisted = [], failures = [];
  let order, preference;
  class ConfigurationError extends Error {}
  class PreferenceMock {
    async create(input) {
      created.push(input);
      preference = { ...input.body, id: 'synthetic-preference', init_point: 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=synthetic' };
      return preference;
    }
    async get({ preferenceId }) { assert.equal(preferenceId, preference.id); return preference; }
    async search() { throw new Error('Unexpected provider search'); }
  }
  const route = loadSource('src/app/api/mercadopago/create-preference/route.ts', {
    'node:crypto': { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    'next/server': { NextResponse: { json: (body, options) => new Response(JSON.stringify(body), { ...options, headers: { ...options.headers, 'Content-Type': 'application/json' } }) } },
    mercadopago: { Preference: PreferenceMock },
    '@/lib/site': { SITE_URL: 'https://synthetic.example.invalid', absoluteUrl: path => `https://synthetic.example.invalid${path}` },
    '@/lib/checkout/serverPricing': pricing.server,
    '@/lib/mercadopago/client': { createMercadoPagoClient: () => ({}), MercadoPagoConfigurationError: ConfigurationError },
    '@/lib/mercadopago/preferencePolicy': policy, '@/lib/mercadopago/preferenceLifecycle': lifecycle,
    '@/lib/supabase/admin': { SupabaseConfigurationError: class extends Error {} },
    '@/lib/orders/repository': {
      OrderPersistenceError: class extends Error {},
      createPendingOrder: async input => {
        persisted.push(input);
        order ??= { ...input, createdAt: new Date().toISOString(), mercadoPagoPreferenceId: null, mercadoPagoPreferenceExpiresAt: null, preferenceErrorCode: null };
        return order;
      },
      claimPreferenceCreation: async () => true,
      attachPreferenceToOrder: async (reference, id, dates) => { assert.equal(reference, order.externalReference); order.mercadoPagoPreferenceId = id; order.mercadoPagoPreferenceExpiresAt = dates.preferenceExpiresAt; return true; },
      recordPreferenceFailure: async (...args) => failures.push(args),
    },
  });
  const request = (items, shippingMethod, promotionCode = null) => new Request('http://127.0.0.1/api/mercadopago/create-preference', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': '00000000-0000-4000-8000-000000000002' },
    body: JSON.stringify({ items, shippingMethod, promotionCode, whatsappNotificationsOptIn: false, buyer: { email: 'synthetic@example.invalid', phone: '5500000000', fullName: 'Comprador sintético', streetAddress: 'Calle sintética 1', colonia: 'Colonia sintética', city: 'Ciudad sintética', state: 'Estado sintético', postalCode: '00000' } }),
  });
  return { pricing, created, persisted, failures, post: (...args) => route.POST(request(...args)) };
}

test('the actual checkout API keeps server totals, the stored snapshot and a simulated preference consistent', async () => {
  for (const [slug, variantId, shippingMethod, shippingCents] of [
    ['moronel-gotas-50ml', 'var-gotas-1', 'standard', 9900],
    ['moronel-hierba-240g', 'var-hierba-3', 'standard', 0],
    ['moronel-hierba-240g', 'var-hierba-3', 'express', 7900],
  ]) {
    const h = harness(), items = [{ slug, variantId, quantity: 1 }];
    const expected = h.pricing.server.priceCheckoutCart(items, shippingMethod, null);
    const response = await h.post(items, shippingMethod);
    assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(h.created.length, 1); assert.deepEqual(h.failures, []);
    const body = h.created[0].body, snapshot = h.persisted[0];
    assert.equal(snapshot.shippingCents, shippingCents); assert.equal(snapshot.totalCents, expected.totalCents);
    assert.equal(body.shipments.cost * 100, shippingCents); assert.equal(body.shipments.free_shipping, shippingCents === 0);
    assert.equal(body.metadata.expected_total_cents, snapshot.totalCents);
    const merchandise = body.items.reduce((sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity, 0);
    assert.equal(merchandise + shippingCents, snapshot.totalCents);
    assert.equal(h.created[0].requestOptions.idempotencyKey, snapshot.externalReference);
    // In-memory repository/provider only: SQL idempotency is not claimed here.
    const retry = await h.post(items, shippingMethod);
    assert.equal(retry.status, 200); assert.equal(h.created.length, 1);
  }
});

test('a discounted synthetic preference uses pre-discount free shipping and exact cent distribution', async () => {
  const product = { id: 'synthetic', slug: 'synthetic', name: 'Producto sintético', status: 'active', stockStatus: 'in_stock', variants: [{ id: 'synthetic-unit', name: 'Una unidad sintética', unitsCount: 1, priceCents: 70000, unitPriceCents: 70000, freeShippingEligible: false, wholesaleEligible: false }] };
  const promotions = { PROMOTIONS_ENABLED: true, PROMOTIONS_CONFIG: [{ code: 'SYNTHETIC20', type: 'percentage', value: 20, enabled: true, minimumSubtotalCents: 0, timeZone: 'America/Mexico_City' }] };
  const h = harness({ products: [product], promotions });
  const response = await h.post([{ slug: 'synthetic', variantId: 'synthetic-unit', quantity: 1 }], 'express', 'SYNTHETIC20');
  assert.equal(response.status, 200);
  const snapshot = h.persisted[0], body = h.created[0].body;
  assert.equal(snapshot.subtotalCents, 70000); assert.equal(snapshot.discountCents, 14000);
  assert.equal(snapshot.shippingCents, 7900); assert.equal(snapshot.totalCents, 63900);
  assert.equal(body.items[0].unit_price * 100, 56000);
  assert.equal(body.items[0].quantity, 1); assert.equal(body.shipments.cost, 79);
  assert.equal(body.metadata.expected_total_cents, 63900); assert.deepEqual(h.failures, []);
});

test('approved Moronel prices and legacy tens reach order snapshots and simulated Mercado Pago unchanged', async () => {
  for (const [slug, prefix, rows] of [
    ['moronel-gotas-50ml', 'gotas', [[1, 33000], [3, 89100], [5, 140250], [20, 528000], [10, 268000]]],
    ['moronel-capsulas-60-capsulas', 'caps', [[1, 33500], [3, 90450], [5, 142375], [20, 536000], [10, 271200]]],
  ]) {
    for (const [units, price] of rows) {
      for (const method of ['standard', 'express']) {
        const h = harness(), variantId = `var-${prefix}-${units}`;
        const response = await h.post([{ slug, variantId, quantity: 1 }], method);
        assert.equal(response.status, 200, `${variantId}/${method}`);
        const body = h.created[0].body, snapshot = h.persisted[0];
        const shipping = units === 1 ? (method === 'standard' ? 9900 : 18600) : (method === 'standard' ? 0 : 7900);
        assert.equal(snapshot.subtotalCents, price); assert.equal(snapshot.discountCents, 0);
        assert.equal(snapshot.items[0].variantId, variantId); assert.equal(snapshot.items[0].unitPriceCents, price);
        assert.equal(snapshot.items[0].quantity, 1); assert.equal(snapshot.shippingCents, shipping);
        assert.equal(snapshot.totalCents, price + shipping);
        assert.equal(body.items[0].id, `${slug}:${variantId}`);
        assert.equal(Math.round(body.items[0].unit_price * 100), price);
        assert.equal(body.items[0].quantity, 1); assert.equal(body.shipments.cost * 100, shipping);
        assert.equal(body.metadata.expected_total_cents, price + shipping);
        assert.ok(snapshot.items[0].variantLabel.startsWith(`${units} Frasco`));
        assert.deepEqual(h.failures, []);
      }
    }
  }
});
