import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const plain = (value) => JSON.parse(JSON.stringify(value));
const id = '00000000-0000-4000-8000-000000000001';
const timestamp = '2026-01-02T12:00:00.000Z';

// Real source modules, explicit in-memory substitutes only. An unexpected import
// fails closed; no environment files, Supabase clients or external provider load.
function load(path, overrides = {}, globals = {}) {
  const filename = new URL(`../../${path}`, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, URL, TextDecoder, FormData,
    console: { error() {} },
    ...globals,
    require(name) {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === 'server-only') return {};
      if (name === '@/lib/orders/types') return types;
      if (['react', 'react/jsx-runtime', 'lucide-react', 'node:crypto'].includes(name)) return require(name);
      throw new Error(`Unexpected isolated test dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}
const types = load('src/lib/orders/types.ts');

test('delivery activation accepts only the exact server environment value true', () => {
  for (const value of [undefined, '', 'false', 'TRUE', 'True', ' true', 'true ', '1', 'on', 'true']) {
    const env = value === undefined ? {} : { DELIVERY_CONFIRMATION_ENABLED: value };
    const { isDeliveryConfirmationEnabled } = load('src/lib/dispatch/delivery.ts', {}, { process: { env } });
    assert.equal(isDeliveryConfirmationEnabled(), value === 'true');
  }
});
const row = (overrides = {}) => ({
  id, public_order_number: '7K9Q2X', external_reference: 'synthetic-order',
  status: 'approved', currency: 'MXN', subtotal_cents: 100, discount_cents: 0,
  promotion_code: null, shipping_cents: 0, total_cents: 100, shipping_method: 'standard',
  fulfillment_status: 'delivered', shipping_carrier: 'Synthetic Courier',
  tracking_number: 'SYNTHETIC-GUIDE', tracking_url: 'https://tracking.invalid/synthetic',
  shipped_at: '2026-01-01T12:00:00.000Z', delivered_at: timestamp,
  delivery_confirmation_source: 'admin_manual', created_at: '2026-01-01T10:00:00.000Z',
  updated_at: timestamp, paid_at: '2026-01-01T11:00:00.000Z',
  customer_email: 'synthetic@example.invalid', customer_name: 'Synthetic Customer',
  customer_phone: '5500000000', shipping_address: null,
  mercadopago_payment_id: 'synthetic-payment', ...overrides,
});
const order = (overrides = {}) => ({
  id, publicOrderNumber: '7K9Q2X', status: 'approved', fulfillmentStatus: 'delivered',
  customerName: 'Synthetic Customer', customerPhone: '5500000000', customerEmail: 'synthetic@example.invalid',
  shippingCarrier: 'Synthetic Courier', trackingNumber: 'SYNTHETIC-GUIDE',
  trackingUrl: 'https://tracking.invalid/synthetic', shippedAt: row().shipped_at,
  deliveredAt: timestamp, deliveryConfirmationSource: 'admin_manual',
  whatsappNotificationsOptIn: true, whatsappShippingNotifiedAt: null,
  totalCents: 100, shippingCents: 0, currency: 'MXN', shippingMethod: 'standard',
  createdAt: row().created_at, externalReference: 'synthetic-order', shippingAddress: null,
  items: [], shippingEmailNotification: { status: 'failed', sentAt: null }, ...overrides,
});

test('delivery persistence uses only the protected RPC and maps its safe timestamp/source', async () => {
  const calls = [];
  let result = { data: row(), error: null };
  const repository = load('src/lib/orders/repository.ts', {
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ rpc(name, args) {
      calls.push([name, args]); return { maybeSingle: async () => result };
    } }) },
  });
  const saved = await repository.persistOrderDeliveryConfirmation({ orderId: id });
  assert.deepEqual(plain(calls), [['mark_order_delivered', { p_order_id: id }]]);
  assert.equal(saved.fulfillmentStatus, 'delivered');
  assert.equal(saved.deliveredAt, timestamp);
  assert.equal(saved.deliveryConfirmationSource, 'admin_manual');
  assert.equal(saved.trackingNumber, 'SYNTHETIC-GUIDE');
  result = { data: row({ delivered_at: 'invalid', delivery_confirmation_source: 'unknown' }), error: null };
  const invalid = await repository.persistOrderDeliveryConfirmation({ orderId: id });
  assert.equal(invalid.deliveredAt, null);
  assert.equal(invalid.deliveryConfirmationSource, null);
  result = { data: null, error: { message: 'synthetic database failure' } };
  await assert.rejects(repository.persistOrderDeliveryConfirmation({ orderId: id }), repository.OrderPersistenceError);
});

test('administrative detail queries only approved orders and safely maps delivery data and legacy nulls', async () => {
  const calls = [];
  let value = row();
  const dispatch = load('src/lib/dispatch/orders.ts', {
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({
      from(table) {
        return {
          select(columns) { calls.push([table, 'select', columns]); return this; },
          eq(column, match) { calls.push([table, column, match]); return this; },
          async maybeSingle() { return { data: table === 'orders' ? value : null, error: null }; },
          async order() { return { data: [], error: null }; },
        };
      },
    }) },
  });
  const detail = await dispatch.getApprovedDispatchOrder(id);
  assert.equal(detail.deliveredAt, timestamp);
  assert.equal(detail.deliveryConfirmationSource, 'admin_manual');
  assert.equal(detail.trackingNumber, 'SYNTHETIC-GUIDE');
  assert.ok(calls.some(([table, key, match]) => table === 'orders' && key === 'status' && match === 'approved'));
  value = row({ fulfillment_status: 'shipped', delivered_at: null, delivery_confirmation_source: null });
  const legacy = await dispatch.getApprovedDispatchOrder(id);
  assert.equal(legacy.deliveredAt, null);
  assert.equal(legacy.deliveryConfirmationSource, null);
  assert.equal(legacy.shippedAt, value.shipped_at);
});

test('delivery service sends no notifications, and shipment notification failure cannot undo shipping', async () => {
  let emails = 0;
  const delivered = order();
  const service = load('src/lib/orders/fulfillment.ts', {
    '@/lib/orders/repository': {
      persistOrderDeliveryConfirmation: async () => delivered,
      persistOrderShipment: async () => order({ fulfillmentStatus: 'shipped' }),
    },
    '@/lib/orders/notifications': { async processCustomerOrderShippedEmailNotification() { emails++; throw new Error('simulated failure'); } },
  });
  assert.equal(await service.markOrderDelivered({ orderId: id }), delivered);
  assert.equal(emails, 0);
  assert.equal((await service.markOrderShipped({ orderId: id })).fulfillmentStatus, 'shipped');
  assert.equal(emails, 1);
});

class Redirect extends Error { constructor(path) { super(path); this.path = path; } }
function actionHarness(overrides = {}) {
  const events = [];
  const data = { order: order(), enabled: true, ...overrides };
  const actions = load('src/app/operaciones/actions.ts', {
    'next/navigation': { redirect(path) { throw new Redirect(path); } },
    'next/cache': { revalidatePath(path) { events.push(['revalidate', path]); } },
    '@/lib/dispatch/auth': { async requireDispatchAdminSession() {
      events.push(['auth']); if (data.unauthorized) throw new Error('unauthorized');
    } },
    '@/lib/dispatch/delivery': { isDeliveryConfirmationEnabled: () => data.enabled },
    '@/lib/dispatch/orders': {
      async getApprovedDispatchOrder() { events.push(['read']); return data.order; },
      async getShippingEmailNotificationStatus() { return { status: 'sent' }; },
      async markWhatsAppShippingNotified() { events.push(['whatsapp-record']); },
    },
    '@/lib/dispatch/whatsapp': { buildWhatsAppShippingUrl: () => 'https://wa.me/synthetic' },
    '@/lib/orders/fulfillment': {
      async markOrderDelivered(input) { events.push(['deliver', plain(input)]); if (data.fail) throw new Error('synthetic failure'); },
      async markOrderShipped() { events.push(['ship']); },
    },
    '@/lib/orders/notifications': { async processCustomerOrderShippedEmailNotification() { events.push(['email']); return 'sent'; } },
  });
  return { actions, events, data };
}
function form(values = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ orderId: id, ...values })) data.set(key, value);
  return data;
}
const redirects = (promise, suffix) => assert.rejects(promise, (error) => error instanceof Redirect && error.path.endsWith(suffix));

test('all dispatch writes authenticate before reading order data', async () => {
  for (const action of ['markOrderDeliveredAction', 'markOrderShippedAction', 'retryShippingEmailAction', 'confirmWhatsAppSentAction']) {
    const h = actionHarness({ unauthorized: true });
    await assert.rejects(h.actions[action](form({ confirmDelivery: 'on' })), /unauthorized/);
    assert.deepEqual(h.events, [['auth']]);
  }
});

test('delivery action requires a valid UUID and explicit checkbox on the server', async () => {
  for (const values of [{}, { confirmDelivery: 'true' }, { confirmDelivery: 'off' }]) {
    const h = actionHarness();
    await redirects(h.actions.markOrderDeliveredAction(form(values)), 'delivery=invalid');
    assert.deepEqual(h.events, [['auth']]);
  }
  const h = actionHarness();
  await redirects(h.actions.markOrderDeliveredAction(form({ orderId: 'invalid', confirmDelivery: 'on' })), 'error=invalid-order');
  assert.deepEqual(h.events, [['auth']]);
});

test('disabled delivery rejects a direct action request before reading or persisting orders', async () => {
  const h = actionHarness({ enabled: false });
  await redirects(h.actions.markOrderDeliveredAction(form({ confirmDelivery: 'on' })), 'delivery=disabled');
  assert.deepEqual(h.events, [['auth']]);
});

test('delivery still requires a session whether activation is enabled or disabled', async () => {
  for (const enabled of [false, true]) {
    const h = actionHarness({ enabled, unauthorized: true });
    await assert.rejects(h.actions.markOrderDeliveredAction(form({ confirmDelivery: 'on' })), /unauthorized/);
    assert.deepEqual(h.events, [['auth']]);
  }
});

test('delivery action accepts shipped/repeated delivered and rejects pending/unapproved/missing orders', async () => {
  for (const fulfillmentStatus of ['shipped', 'delivered']) {
    const h = actionHarness({ order: order({ fulfillmentStatus }) });
    await redirects(h.actions.markOrderDeliveredAction(form({ confirmDelivery: 'on' })), 'delivery=confirmed');
    assert.deepEqual(h.events, [['auth'], ['read'], ['deliver', { orderId: id }], ['revalidate', '/operaciones/despacho'], ['revalidate', `/operaciones/despacho/${id}`]]);
  }
  for (const value of [order({ fulfillmentStatus: 'pending' }), order({ status: 'rejected' }), null]) {
    const h = actionHarness({ order: value });
    await redirects(h.actions.markOrderDeliveredAction(form({ confirmDelivery: 'on' })), 'delivery=unavailable');
    assert.deepEqual(h.events, [['auth'], ['read']]);
  }
  const h = actionHarness({ fail: true });
  await redirects(h.actions.markOrderDeliveredAction(form({ confirmDelivery: 'on' })), 'delivery=failed');
  assert.equal(h.events.some(([event]) => event === 'revalidate'), false);
});

test('delivered orders retain shipping email retry and opt-in-only manual WhatsApp record', async () => {
  const h = actionHarness();
  await redirects(h.actions.retryShippingEmailAction(form()), 'email=sent');
  await redirects(h.actions.confirmWhatsAppSentAction(form()), 'whatsapp=confirmed');
  assert.ok(h.events.some(([event]) => event === 'email'));
  assert.ok(h.events.some(([event]) => event === 'whatsapp-record'));
  const denied = actionHarness({ order: order({ whatsappNotificationsOptIn: false }) });
  await redirects(denied.actions.confirmWhatsAppSentAction(form()), 'whatsapp=failed');
  assert.deepEqual(denied.events, [['auth'], ['read']]);
  const pending = actionHarness({ order: order({ fulfillmentStatus: 'pending' }) });
  await redirects(pending.actions.retryShippingEmailAction(form()), 'email=unavailable');
  const conflicting = actionHarness();
  await redirects(conflicting.actions.markOrderShippedAction(form({ shippingCarrier: 'Other', trackingNumber: 'SYNTHETIC-GUIDE', trackingUrl: 'https://tracking.invalid/synthetic' })), 'shipment=conflict');
  assert.deepEqual(conflicting.events, [['auth'], ['read']]);
});

function trackingHarness() {
  const filters = [];
  const data = { row: row(), error: null };
  const query = {
    select(columns) { filters.push(['select', columns]); return this; },
    eq(key, value) { filters.push([key, value]); return this; },
    async maybeSingle() { return { data: data.row, error: data.error }; },
  };
  const tracking = load('src/lib/orders/tracking.ts', {
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => ({ from: () => query }) },
  });
  return { tracking, data, filters };
}

test('public delivered DTO preserves shipment, sanitizes dates/URL and exposes no private fields', async () => {
  const h = trackingHarness();
  const result = await h.tracking.findPublicOrderTracking('7K9Q2X', 'synthetic@example.invalid');
  assert.deepEqual(Object.keys(result).sort(), ['orderNumber', 'state', 'shippingMethod', 'shippingCarrier', 'trackingNumber', 'trackingUrl', 'shippedAt', 'deliveredAt'].sort());
  assert.equal(result.state, 'delivered');
  assert.equal(result.deliveredAt, timestamp);
  assert.equal(result.trackingNumber, 'SYNTHETIC-GUIDE');
  assert.ok(h.filters.some(([key, value]) => key === 'customer_email' && value === 'synthetic@example.invalid'));
  h.data.row = row({ delivered_at: 'invalid', tracking_url: 'javascript:alert(1)' });
  const invalid = await h.tracking.findPublicOrderTracking('7K9Q2X', 'synthetic@example.invalid');
  assert.equal(invalid.deliveredAt, null);
  assert.equal(invalid.trackingUrl, null);
  for (const [status, fulfillment_status, state] of [
    ['approved', 'pending', 'confirmed'], ['approved', 'shipped', 'shipped'],
    ['pending', 'pending', 'payment_pending'], ['refunded', 'delivered', 'unavailable'],
  ]) {
    h.data.row = row({ status, fulfillment_status });
    const value = await h.tracking.findPublicOrderTracking('7K9Q2X', 'synthetic@example.invalid');
    assert.equal(value.state, state);
    assert.equal(value.deliveredAt, null);
    if (state !== 'shipped') assert.equal(value.trackingNumber, null);
  }
});

function routeHarness(h = trackingHarness()) {
  class ConfigurationError extends Error {}
  const route = load('src/app/api/orders/tracking/route.ts', {
    'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) } },
    '@/lib/orders/tracking': h.tracking,
    '@/lib/supabase/admin': { SupabaseConfigurationError: ConfigurationError },
  });
  return { ...h, route };
}
const request = (version, body = { orderNumber: '7k9q2x', email: ' SYNTHETIC@EXAMPLE.INVALID ' }) => new Request('http://localhost/api/orders/tracking', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(version ? { 'X-Order-Tracking-Version': version } : {}) }, body: JSON.stringify(body),
});

test('tracking header V2 opts into delivered/date; absent, V1 and unknown headers preserve exact legacy contract', async () => {
  const h = routeHarness();
  for (const version of [undefined, '1', '2', 'unsupported']) {
    const response = await h.route.POST(request(version));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const result = await response.json();
    assert.equal(result.state, version === '2' ? 'delivered' : 'shipped');
    assert.equal(Object.hasOwn(result, 'deliveredAt'), version === '2');
    assert.equal(result.trackingNumber, 'SYNTHETIC-GUIDE');
  }
});

test('tracking keeps uniform errors, body limits, no-store and no lookup for invalid requests', async () => {
  const h = routeHarness();
  for (const body of [{ orderNumber: 'bad', email: 'synthetic@example.invalid' }, { orderNumber: '7K9Q2X', email: 'synthetic@example.invalid', extra: true }]) {
    const response = await h.route.POST(request('2', body));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal(h.filters.length, 0);
  const large = await h.route.POST(request('2', { payload: 'x'.repeat(9000) }));
  assert.equal(large.status, 413);
  const method = h.route.GET();
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('Cache-Control'), 'no-store');
  h.data.row = null;
  for (const version of [undefined, '2']) {
    const response = await h.route.POST(request(version));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'No encontramos un pedido con esos datos.' });
  }
  h.data.error = { message: 'synthetic internal failure' };
  const response = await h.route.POST(request('2'));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'No fue posible consultar el pedido.' });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

function notificationsHarness() {
  const state = { status: 'failed', attempts: 1, sends: [], fail: true, order: row() };
  const supabase = {
    rpc(name, args) {
      if (name === 'mark_order_notification_failed') {
        state.status = 'failed'; return Promise.resolve({ error: null });
      }
      return { async maybeSingle() {
        if (['claim_customer_order_shipped_email_notification', 'claim_customer_order_approved_notification'].includes(name)) {
          if (state.status === 'sent') return { data: null, error: null };
          state.status = 'processing'; state.attempts++;
          return { data: { id: 'synthetic-notification', attempts: state.attempts }, error: null };
        }
        assert.equal(name, 'mark_order_notification_sent');
        assert.equal(args.p_attempt, state.attempts);
        state.status = 'sent'; return { data: { id: 'synthetic-notification' }, error: null };
      } };
    },
    from(table) {
      return {
        select() { return this; }, eq() { return this; },
        async maybeSingle() { return { data: state.order, error: null }; },
        async order() { assert.equal(table, 'order_items'); return { data: [{ product_name: 'Synthetic Product', variant_label: 'Synthetic', quantity: 1, unit_price_cents: 100, line_total_cents: 100 }], error: null }; },
      };
    },
  };
  const notifications = load('src/lib/orders/notifications.ts', {
    resend: { Resend: class { emails = { async send(message, options) {
      state.sends.push({ message: plain(message), options: plain(options) });
      return { error: state.fail ? { message: 'synthetic provider failure' } : null };
    } }; } },
    '@/config/shipping': { SHIPPING_CONFIG: { standardEstimatedDays: 'Synthetic estimate', expressEstimatedDays: 'Synthetic estimate' } },
    '@/lib/site': { SITE_NAME: 'Synthetic Store' },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => supabase },
  }, { process: { env: { RESEND_API_KEY: 'SYNTHETIC-NON-CREDENTIAL', RESEND_FROM_EMAIL: 'test@example.invalid' } } });
  return { notifications, state };
}

test('failed shipment email retries after delivery with simulated Resend, same idempotency key and no duplicate once sent', async () => {
  const h = notificationsHarness();
  assert.equal(await h.notifications.processCustomerOrderShippedEmailNotification(id), 'failed');
  assert.equal(h.state.status, 'failed');
  assert.equal(h.state.order.fulfillment_status, 'delivered');
  h.state.fail = false;
  assert.equal(await h.notifications.processCustomerOrderShippedEmailNotification(id), 'sent');
  assert.equal(await h.notifications.processCustomerOrderShippedEmailNotification(id), 'skipped');
  assert.equal(h.state.sends.length, 2);
  assert.equal(h.state.sends[0].options.idempotencyKey, h.state.sends[1].options.idempotencyKey);
  assert.match(h.state.sends[1].message.text, /SYNTHETIC-GUIDE/);
  assert.equal(h.state.sends[1].message.to, 'synthetic@example.invalid');
});

test('notification normalizer still accepts historical pending/shipped and rejects unsupported status', async () => {
  for (const status of ['pending', 'shipped', 'delivered', 'unknown']) {
    const h = notificationsHarness(); h.state.fail = false;
    h.state.order.fulfillment_status = status;
    const result = await h.notifications.processCustomerOrderShippedEmailNotification(id);
    assert.equal(result, ['shipped', 'delivered'].includes(status) ? 'sent' : 'failed');
    if (status === 'pending' || status === 'unknown') assert.equal(h.state.sends.length, 0);
  }
});

test('existing approval email remains compatible with pending, shipped and delivered normalization', async () => {
  for (const fulfillment_status of ['pending', 'shipped', 'delivered']) {
    const h = notificationsHarness(); h.state.fail = false;
    h.state.order.fulfillment_status = fulfillment_status;
    assert.equal(await h.notifications.processCustomerOrderApprovedNotification(id), 'sent');
    assert.equal(h.state.sends.length, 1);
  }
});

const link = { default: 'a', __esModule: true };
function detailPage(value, enabled = true) {
  return load('src/app/operaciones/despacho/[orderId]/page.tsx', {
    'next/link': link, 'next/navigation': { notFound() { throw new Error('not found'); } },
    '@/app/operaciones/actions': {}, '@/config/shipping': { SHIPPING_CONFIG: { couriers: [] } },
    '@/lib/dispatch/auth': { async requireDispatchAdminSession() {} },
    '@/lib/dispatch/delivery': { isDeliveryConfirmationEnabled: () => enabled },
    '@/lib/dispatch/orders': { async getApprovedDispatchOrder() { return value; } },
    '@/lib/dispatch/whatsapp': { buildWhatsAppShippingUrl: () => null },
    '@/lib/utils': { formatCurrency: () => 'Synthetic amount' },
    '../_components/shipping-label': { buildShippingLabelRows: () => [] },
    '../_components/ShippingLabelData': { ShippingLabelData: () => React.createElement('div', null, 'Datos para guía de envío') },
    '../_components/ConfirmDeliveryForm': { ConfirmDeliveryForm: () => React.createElement('button', null, 'Confirmar entrega') },
  }).default;
}

test('real detail shows confirmation only for approved shipped and retains delivered shipment and notification retry', async () => {
  for (const status of ['pending', 'shipped', 'delivered']) {
    const tree = await detailPage(order({ fulfillmentStatus: status }))({ params: Promise.resolve({ orderId: id }), searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(tree);
    assert.equal(html.includes('Confirmar entrega'), status === 'shipped');
    assert.match(html, /Datos para guía de envío/);
    if (status === 'delivered') {
      assert.match(html, /Entregado/); assert.match(html, /Confirmación manual/);
      assert.match(html, /2 de enero de 2026/); assert.match(html, /SYNTHETIC-GUIDE/);
      assert.match(html, /Reintentar email de envío/); assert.doesNotMatch(html, /Marcar como enviado/);
    }
  }
});

test('disabled panel hides delivery confirmation but preserves already delivered details', async () => {
  for (const fulfillmentStatus of ['pending', 'shipped', 'delivered']) {
    const Page = detailPage(order({ fulfillmentStatus }), false);
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ orderId: id }), searchParams: Promise.resolve({}) }));
    assert.doesNotMatch(html, /Confirmar entrega/);
    if (fulfillmentStatus === 'delivered') assert.match(html, /Confirmación manual/);
  }
});

test('confirmation checkbox starts unchecked; submit disables before acknowledgment and while pending', () => {
  let checked = false;
  let pending = false;
  const component = load('src/app/operaciones/despacho/_components/ConfirmDeliveryForm.tsx', {
    react: { useState: () => [checked, (value) => { checked = value; }] },
    'react-dom': { useFormStatus: () => ({ pending }) },
    '@/app/operaciones/actions': {},
  });
  const render = () => renderToStaticMarkup(component.ConfirmDeliveryForm({ orderId: id }));
  assert.match(render(), /type="checkbox"/);
  assert.doesNotMatch(render(), /checked=""/);
  assert.match(render(), /He comprobado en el seguimiento de la paquetería que este pedido fue entregado/);
  assert.match(render(), /disabled=""/);
  checked = true; assert.doesNotMatch(render(), /disabled=""/);
  pending = true; assert.match(render(), /disabled=""/); assert.match(render(), /Confirmando entrega/);
});

test('real list filters delivered and counts delivered in cumulative shipment/notification metrics', async () => {
  const requests = [];
  const Page = load('src/app/operaciones/despacho/page.tsx', {
    'next/link': link, '@/lib/dispatch/auth': { async requireDispatchAdminSession() {} },
    '@/lib/dispatch/orders': { async listApprovedDispatchOrders(filters) { requests.push(filters); return [order()]; } },
    '@/lib/utils': { formatCurrency: () => 'Synthetic amount' },
  }).default;
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ status: 'delivered' }) }));
  assert.equal(requests[0].fulfillmentStatus, 'delivered');
  assert.match(html, /value="delivered" selected="">Entregados/);
  assert.match(html, />Entregado</);
  assert.match(html, /Enviados y entregados/);
  assert.doesNotMatch(html, /Preparar envío/);
  assert.match(html, /WhatsApp pendiente/);
});

test('new public client sends V2 and renders delivered date and original tracking fields', async () => {
  const states = ['7K9Q2X', 'synthetic@example.invalid', 'success', {
    orderNumber: '7K9Q2X', state: 'delivered', shippingMethod: 'standard',
    shippingCarrier: 'Synthetic Courier', trackingNumber: 'SYNTHETIC-GUIDE',
    trackingUrl: 'https://tracking.invalid/synthetic', shippedAt: row().shipped_at, deliveredAt: timestamp,
  }];
  let cursor = 0;
  let requested;
  const Page = load('src/app/rastrear-pedido/page.tsx', {
    react: { __esModule: true, default: React, useState: () => [states[cursor++], () => {}] },
    '@/config/store': { getWhatsAppHref: () => null }, '@/lib/analytics': { trackWhatsAppClick() {} },
  }, { fetch: async (url, options) => { requested = { url, options }; return { status: 404 }; } }).default;
  const tree = Page();
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Pedido entregado/); assert.match(html, /Fecha de confirmación de entrega/);
  assert.match(html, /2 de enero de 2026/); assert.match(html, /SYNTHETIC-GUIDE/);
  function find(node) {
    if (!React.isValidElement(node)) return;
    if (node.type === 'form') return node;
    return React.Children.toArray(node.props.children).map(find).find(Boolean);
  }
  await find(tree).props.onSubmit({ preventDefault() {} });
  assert.equal(requested.url, '/api/orders/tracking');
  assert.equal(requested.options.headers['X-Order-Tracking-Version'], '2');
  assert.equal(requested.options.cache, 'no-store');
});
