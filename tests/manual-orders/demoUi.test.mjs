import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadSource } from '../helpers/isolatedModule.mjs';
import { harness, product, line, policy } from './helpers.mjs';

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const real = harness();
const demoTypes = loadSource('src/lib/manual-orders/demo-types.ts');
const demoData = loadSource('src/lib/manual-orders/demo-data.ts', { 'server-only': {}, './catalog': real.manualCatalog, './pricing': { quoteManualOrder: real.quote } });
const first = real.manualCatalog.listManualCatalog().find(p => p.variants.some(v => v.selectable && v.eligibility.eligibility === 'eligible'));
const variant = first.variants.find(v => v.selectable && v.eligibility.eligibility === 'eligible');
function form(overrides = {}) {
  const values = { revision: '0', channel: 'whatsapp', ...demoData.DEMO_FORM_DEFAULTS, relationship: 'customer', frequency: 'new', segment: 'retail',
    shippingMethod: 'standard', discountMode: 'normal', items: JSON.stringify([{ productId: first.productId, variantId: variant.variantId, packageQuantity: 1 }]), ...overrides };
  const f = new FormData(); for (const [k, v] of Object.entries(values)) f.set(k, v); return f;
}
function calculator(engine = real) { return loadSource('src/lib/manual-orders/demo-quote.ts', { 'server-only': {}, './pricing': { quoteManualOrder: engine.quote }, './types': engine.types }, { FormData }).calculateDemoQuote; }
const calculate = calculator();
const css = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
const Link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };

test('demo flag fails closed, exact true only; production always refuses demonstration', async () => {
  for (const value of [undefined, '', 'false', 'TRUE', '1', ' true', 'true ']) {
    const access = loadSource('src/lib/manual-orders/demo-access.ts', { 'server-only': {}, '@/lib/dispatch/auth': { requireDispatchAdminSession: async () => {} }, 'next/navigation': { notFound() { throw new Error('not-found'); } } }, { process: { env: { MANUAL_ORDERS_DEMO_ENABLED: value } } });
    assert.equal(access.isManualDemoEnabled(), false); await assert.rejects(access.requireManualDemoAccess(), /not-found/);
  }
  for (const environment of ['preview', undefined, 'production']) {
    let auth = 0;
    const access = loadSource('src/lib/manual-orders/demo-access.ts', { 'server-only': {}, '@/lib/dispatch/auth': { requireDispatchAdminSession: async () => { auth++; } }, 'next/navigation': { notFound() { throw new Error('not-found'); } } }, { process: { env: { MANUAL_ORDERS_DEMO_ENABLED: 'true', VERCEL_ENV: environment } } });
    assert.equal(access.isManualDemoEnabled(), environment !== 'production');
    if (environment === 'production') await assert.rejects(access.requireManualDemoAccess(), /not-found/); else await access.requireManualDemoAccess();
    assert.equal(auth, 1);
  }
});

test('real guard denies missing session; quote action checks authorization before parsing/calculation', async () => {
  const access = loadSource('src/lib/manual-orders/demo-access.ts', { 'server-only': {}, '@/lib/dispatch/auth': { requireDispatchAdminSession: async () => { throw new Error('session-denied'); } }, 'next/navigation': { notFound() { throw new Error('not-found'); } } }, { process: { env: { MANUAL_ORDERS_DEMO_ENABLED: 'true' } } });
  await assert.rejects(access.requireManualDemoAccess(), /session-denied/);
  let calculations = 0;
  const action = loadSource('src/app/operaciones/pedidos/actions.ts', { '@/lib/manual-orders/demo-access': access, '@/lib/manual-orders/demo-quote': { calculateDemoQuote() { calculations++; } } });
  await assert.rejects(action.quoteManualDemoAction({}, form()), /session-denied/); assert.equal(calculations, 0);
  const calls = [];
  const valid = loadSource('src/app/operaciones/pedidos/actions.ts', { '@/lib/manual-orders/demo-access': { requireManualDemoAccess: async () => calls.push('auth') }, '@/lib/manual-orders/demo-quote': { calculateDemoQuote(f) { calls.push('quote'); return calculate(f); } } });
  assert.equal((await valid.quoteManualDemoAction({}, form())).status, 'success'); assert.deepEqual(calls, ['auth', 'quote']);
});

test('all private routes refuse before reading fixtures, catalog, params or rendering children', async () => {
  let reads = 0; const denied = { requireManualDemoAccess: async () => { throw new Error('denied'); } };
  const data = { getDemoOrders() { reads++; return []; }, filterDemoOrders() { reads++; return []; } };
  const common = { '@/lib/manual-orders/demo-access': denied, '@/lib/manual-orders/demo-data': data, '@/lib/manual-orders/demo-types': demoTypes, 'next/link': Link, 'next/navigation': { notFound() {} } };
  for (const [path, extras, args] of [
    ['layout.tsx', { './demo.module.css': css }, { children: 'private' }],
    ['page.tsx', { './demo.module.css': css }, { searchParams: Promise.resolve({}) }],
    ['[orderId]/page.tsx', { '../demo.module.css': css }, { params: Promise.resolve({ orderId: 'demo-whatsapp-001' }) }],
    ['nuevo/page.tsx', { '../demo.module.css': css, '@/lib/manual-orders/catalog': { listManualCatalog() { reads++; return []; } }, '../actions': {}, '../_components/ManualOrderDemoForm': {} }, {}],
  ]) {
    const route = loadSource(`src/app/operaciones/pedidos/${path}`, { ...common, ...extras }).default;
    await assert.rejects(route(args), /denied/);
  }
  assert.equal(reads, 0);
});

test('fixtures are server-only, unmistakably synthetic, and filters operate only on fixtures', () => {
  const orders = demoData.getDemoOrders(); assert.equal(orders.length, 4);
  assert.equal(new Set(orders.map(o => o.channel)).size, 4);
  for (const o of orders) { assert.match(o.folio, /^DEMO-/); assert.match(o.customer.name, /DEMO/); assert.match(o.customer.email, /\.invalid$/); assert.equal(o.customer.phone, '5500000000'); assert.ok(o.quote.totalCents > 0); }
  assert.equal(demoData.filterDemoOrders(orders, { q: 'demo-001' }).length, 1);
  assert.equal(demoData.filterDemoOrders(orders, { channel: 'online' })[0].origin, 'online_checkout');
  assert.equal(demoData.filterDemoOrders(orders, { payment: 'partial' }).length, 1);
  assert.equal(demoData.filterDemoOrders(orders, { q: 'not-existing' }).length, 0);
});

test('catalog preserves every visible product/variant, packages and explicit eligibility', () => {
  const catalog = real.manualCatalog.listManualCatalog();
  const active = real.catalog.PRODUCTS.filter(p => p.status === 'active');
  assert.deepEqual(catalog.map(p => p.productId), active.map(p => p.id));
  active.forEach((p, i) => assert.deepEqual(catalog[i].variants.map(v => v.variantId), p.variants.filter(v => !v.hiddenFromSelection).map(v => v.id)));
  assert.ok(catalog.some(p => p.variants.some(v => v.commercialUnitsPerPackage === null)));
  assert.ok(catalog.some(p => p.variants.some(v => v.eligibility.eligibility === 'excluded')));
});

test('quote validates customer, classification, complete address and rejects authoritative browser fields', () => {
  for (const [key, value] of [['channel', 'online'], ['customerName', 'Persona real'], ['customerEmail', 'person@example.com'], ['customerPhone', '3312345678'], ['relationship', 'forged'], ['frequency', 'invalid'], ['segment', 'admin'], ['streetAddress', ''], ['colonia', ''], ['city', ''], ['state', ''], ['postalCode', 'abcde'], ['totalCents', '0'], ['role', 'principal_admin'], ['discountMode', 'fixed']]) {
    const result = calculate(form({ [key]: value })); assert.equal(result.status, 'error', key); assert.equal(result.quote, null);
  }
  assert.equal(calculate(form({ channel: 'other' })).status, 'error');
  assert.equal(calculate(form({ channel: 'other', otherChannelDetail: 'Canal DEMO' })).status, 'success');
  const duplicate = form(); duplicate.append('channel', 'phone'); assert.equal(calculate(duplicate).status, 'error');
});

test('standard/express quote and courtesy use original server rules; reasons are mandatory', () => {
  const normal = calculate(form()); assert.equal(normal.status, 'success');
  const courtesy = calculate(form({ courtesy: 'on', courtesyReason: 'Cortesía sintética de revisión.' })); assert.equal(courtesy.status, 'success'); assert.equal(courtesy.quote.shippingCents, 0);
  assert.equal(calculate(form({ courtesy: 'on', courtesyReason: 'short' })).status, 'error');
  assert.equal(calculate(form({ shippingMethod: 'express', courtesy: 'on', courtesyReason: 'Cortesía sintética de revisión.' })).status, 'error');
  assert.equal(calculate(form({ shippingMethod: 'express' })).status, 'success');
  const direct = real.quote({ items: [{ productId: first.productId, variantId: variant.variantId, packageQuantity: 1 }], shippingMethod: 'standard', discount: { mode: 'normal', promotionCode: null }, standardShippingCourtesy: { requested: false, reason: null } }, { role: 'principal_admin', actor: 'shared_admin', customerSegment: 'retail' });
  assert.equal(normal.quote.totalCents, direct.totalCents);
});

test('special excludes promotional lines, preserves both alternatives, blocks lesser savings and zero', () => {
  const eligible = product('eligible', 1000, { wholesaleEligible: true });
  const excluded = product('kit', 5000, { manualWholesaleDiscountPolicy: policy('excluded', 'promotional_bundle') });
  const synthetic = harness({ products: [eligible, excluded] }), calc = calculator(synthetic);
  const base = { items: JSON.stringify([line(eligible, 20), line(excluded)]), discountMode: 'special_percentage', discountReason: 'Descuento sintético para pruebas.' };
  for (const percent of ['-1', '100.01', 'Infinity', '35.001']) assert.equal(calc(form({ ...base, discountPercent: percent })).status, 'error');
  assert.equal(calc(form({ ...base, discountPercent: '35', discountReason: '' })).status, 'error');
  const less = calc(form({ ...base, discountPercent: '10' })); assert.equal(less.status, 'success'); assert.ok(less.quote.blockingReasons.includes('special_discount_less_favorable')); assert.ok(less.normal.totalCents < less.quote.totalCents);
  const equal = calc(form({ ...base, discountPercent: '35' })); assert.equal(equal.quote.blockingReasons.length, 0); assert.equal(equal.quote.eligibleBaseCents, 20000); assert.equal(equal.quote.lines.find(l => l.productId === excluded.id).specialDiscountCents, 0);
  const zero = calc(form({ ...base, items: JSON.stringify([line(eligible, 1)]), discountPercent: '100', courtesy: 'on', courtesyReason: 'Cortesía sintética para pruebas.' }));
  assert.equal(zero.quote.totalCents, 0); assert.ok(zero.quote.blockingReasons.includes('zero_total_persistence_not_authorized'));
});

function renderForm(result = demoTypes.DEMO_INITIAL_STATE, pending = false) {
  const ReactForSSR = { ...React, useActionState: () => [result, '/synthetic-quote-only', pending] };
  const component = loadSource('src/app/operaciones/pedidos/_components/ManualOrderDemoForm.tsx', { react: ReactForSSR, '@/lib/manual-orders/demo-types': demoTypes, '../demo.module.css': css }).ManualOrderDemoForm;
  return renderToStaticMarkup(React.createElement(component, { catalog: real.manualCatalog.listManualCatalog(), defaults: demoData.DEMO_FORM_DEFAULTS, quoteAction: async () => result }));
}
test('form renders labels, unchecked review, loading state and permanently disabled creation', () => {
  const html = renderForm();
  assert.match(html, /<option value="whatsapp" selected/);
  assert.match(html, /<button[^>]*type="button"[^>]*disabled=""[^>]*>Captura disponible después de habilitar el módulo/);
  assert.match(html, /aria-label="Resumen calculado en servidor"/); assert.match(html, /htmlFor|for="customerName"/);
  assert.match(html, /aria-live="polite"/); assert.match(html, /Monto fijo · No habilitado/);
  assert.doesNotMatch(html, /checked=""/);
  assert.match(renderForm(demoTypes.DEMO_INITIAL_STATE, true), /Calculando en servidor/);
});
test('quote UI associates errors and displays zero/less-favorable blockers without enabling capture', () => {
  const error = { ...demoTypes.DEMO_INITIAL_STATE, status: 'error', revision: '0', errors: { streetAddress: 'Dirección obligatoria' } };
  assert.match(renderForm(error), /aria-invalid="true" aria-describedby="streetAddress-hint streetAddress-error"/);
  const result = calculate(form()); result.quote.blockingReasons = ['special_discount_less_favorable', 'zero_total_persistence_not_authorized'];
  const html = renderForm(result); assert.match(html, /Bloqueado: el descuento especial/); assert.match(html, /Total cero/); assert.match(html, /Alternativa normal/); assert.match(html, /Captura disponible después de habilitar el módulo/);
});

test('editing, quoting and reviewing retain the entered percentage and invalidate stale totals', async () => {
  const slots = []; let cursor = 0, response = demoTypes.DEMO_INITIAL_STATE;
  const hooks = { ...React,
    useState(initial) { const slot = cursor++; if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial; return [slots[slot], value => { slots[slot] = typeof value === 'function' ? value(slots[slot]) : value; }]; },
    useActionState() { return [response, async data => { response = calculate(data); }, false]; },
  };
  const component = loadSource('src/app/operaciones/pedidos/_components/ManualOrderDemoForm.tsx', { react: hooks, '@/lib/manual-orders/demo-types': demoTypes, '../demo.module.css': css }).ManualOrderDemoForm;
  const render = () => { cursor = 0; return component({ catalog: real.manualCatalog.listManualCatalog(), defaults: demoData.DEMO_FORM_DEFAULTS, quoteAction: async () => response }); };
  const nodes = tree => { const all = []; function walk(n) { if (Array.isArray(n)) return n.forEach(walk); if (n && typeof n === 'object' && n.props) { all.push(n); walk(n.props.children); } } walk(tree); return all; };
  const control = (tree, id) => nodes(tree).find(n => n.props.id === id && ['input', 'select', 'textarea'].includes(n.type));
  const change = (tree, id, value) => { control(tree, id).props.onChange({ target: { value } }); tree.props.onChange({ target: { dataset: {} } }); return render(); };
  let tree = render();
  const picker = nodes(tree).find(n => n.props.product?.productId === first.productId);
  picker.props.add(first.productId, variant.variantId); tree = render();
  tree = change(tree, 'discountMode', 'special_percentage');
  tree = change(tree, 'discountPercent', '50');
  tree = change(tree, 'discountReason', 'Descuento sintético de revisión.');
  const data = new FormData();
  for (const node of nodes(tree)) {
    if (!['input', 'select', 'textarea'].includes(node.type) || !node.props.name || node.props.disabled || (node.props.type === 'checkbox' && !node.props.checked)) continue;
    data.set(node.props.name, node.props.value ?? 'on');
  }
  await tree.props.action(data); tree = render();
  assert.equal(response.status, 'success'); assert.equal(response.quote.specialDiscountRequested.percentageBps, 5000);
  assert.equal(control(tree, 'discountPercent').props.value, '50', 'form action must not replace user input with the 35% default');
  const review = nodes(tree).find(n => n.type === 'input' && n.props.type === 'checkbox' && n.props['data-quote-ignore']);
  assert.equal(review.props.checked, false); assert.equal(review.props.disabled, false);
  review.props.onChange({ target: { checked: true } }); tree = render();
  tree = change(tree, 'quantity-1', '2');
  assert.equal(nodes(tree).find(n => n.type === 'input' && n.props['data-quote-ignore'] && n.props.type === 'checkbox').props.checked, false);
  assert.ok(!nodes(tree).some(n => n.type === 'dd'), 'changed quote must disappear until recalculated');
  assert.ok(nodes(tree).some(n => n.type === 'button' && n.props.disabled && n.props.children === 'Captura disponible después de habilitar el módulo'));
});

test('demo graph has no persistence/providers or public navigation; responsive rules keep summary in flow', () => {
  const paths = ['src/lib/manual-orders/demo-access.ts', 'src/lib/manual-orders/demo-data.ts', 'src/lib/manual-orders/demo-quote.ts', 'src/lib/manual-orders/demo-types.ts'];
  function walk(dir) { for (const e of readdirSync(new URL(`../../${dir}`, import.meta.url), { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(p)) paths.push(p); } }
  walk('src/app/operaciones/pedidos');
  for (const p of paths) assert.doesNotMatch(read(p), /manual-orders\/(?:service|repository|attestation)|from ['"].*(?:supabase|mercadopago|resend)|\.rpc\(|\.from\(|localStorage|sessionStorage|MANUAL_ORDERS_ENABLED/);
  const style = read('src/app/operaciones/pedidos/demo.module.css'); assert.match(style, /@media\(max-width:639px\)/); assert.match(style, /grid-template-columns:1fr/); assert.doesNotMatch(style, /position:\s*(fixed|sticky)/); assert.match(style, /focus-visible/);
  for (const p of ['src/components/store/Header.tsx', 'src/components/store/Footer.tsx', 'src/app/operaciones/login/page.tsx']) assert.doesNotMatch(read(p), /operaciones\/pedidos|requireManualDemoAccess/);
});
