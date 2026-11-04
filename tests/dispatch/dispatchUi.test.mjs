import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);

// Execute the real UI modules with explicit in-memory dependencies. No Next
// server, environment file, database, notification provider or OS clipboard.
function loadUi(relativePath, overrides = {}, globals = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const source = readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, ...globals,
    require(name) {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (['react', 'react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
      throw new Error(`Unexpected UI test dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}

const label = loadUi('../../src/app/operaciones/despacho/_components/shipping-label.ts');
const synthetic = {
  customerName: 'Cliente de prueba', customerPhone: '5500000000',
  shippingAddress: { streetAddress: 'Calle de Prueba 123, interior B', colonia: 'Colonia de prueba', city: 'Ciudad de prueba', state: 'Estado de prueba', postalCode: '01000', country: 'México' },
};

function copyComponent(writeText) {
  let state = 'idle';
  const { ShippingLabelData } = loadUi('../../src/app/operaciones/despacho/_components/ShippingLabelData.tsx', {
    './shipping-label': label,
    react: { useId: () => 'copy-status', useState: () => [state, (value) => { state = value; }] },
  }, { navigator: writeText ? { clipboard: { writeText } } : {} });
  return { render: (rows) => ShippingLabelData({ rows }), state: () => state };
}

function findElement(node, type) {
  if (!React.isValidElement(node)) return undefined;
  if (node.type === type) return node;
  for (const child of React.Children.toArray(node.props.children)) {
    const result = findElement(child, type);
    if (result) return result;
  }
}

test('copy button writes exactly the displayed fields and reports success', async () => {
  let copied;
  const component = copyComponent(async (text) => { copied = text; });
  const rows = label.buildShippingLabelRows(synthetic);
  const tree = component.render(rows);
  const html = renderToStaticMarkup(tree);
  for (const { label: name, value } of rows) {
    assert.ok(html.includes(`>${name}</dt>`));
    assert.ok(html.includes(`>${value}</dd>`));
  }
  const button = findElement(tree, 'button');
  assert.equal(button.props.type, 'button');
  assert.equal(button.props.disabled, false);
  await button.props.onClick();
  assert.equal(copied, label.shippingLabelText(rows));
  assert.equal(component.state(), 'copied');
  assert.match(renderToStaticMarkup(component.render(rows)), /Datos copiados\./);
});

test('clipboard rejection keeps the visible data and offers manual copying', async () => {
  const component = copyComponent(async () => { throw new Error('simulated clipboard denial'); });
  const rows = label.buildShippingLabelRows(synthetic);
  await findElement(component.render(rows), 'button').props.onClick();
  assert.equal(component.state(), 'failed');
  const html = renderToStaticMarkup(component.render(rows));
  assert.match(html, /No se pudo copiar/);
  assert.match(html, /Calle de Prueba 123, interior B/);
  assert.doesNotMatch(html, /simulated clipboard denial/);
});

test('unsupported clipboard fails gracefully and an empty block disables copying', async () => {
  const component = copyComponent();
  await findElement(component.render(label.buildShippingLabelRows(synthetic)), 'button').props.onClick();
  assert.equal(component.state(), 'failed');
  assert.equal(findElement(component.render([]), 'button').props.disabled, true);
});

test('administrative detail requires authorization before reading or rendering customer data', async () => {
  let reads = 0;
  const guardFailure = new Error('authentication required');
  const Page = loadUi('../../src/app/operaciones/despacho/[orderId]/page.tsx', {
    'next/link': { default: 'a', __esModule: true },
    'next/navigation': { notFound() { throw new Error('not found'); } },
    '@/app/operaciones/actions': {}, '@/config/shipping': {},
    '@/lib/dispatch/auth': { async requireDispatchAdminSession() { throw guardFailure; } },
    '@/lib/dispatch/orders': { async getApprovedDispatchOrder() { reads++; return synthetic; } },
    '@/lib/dispatch/whatsapp': {}, '@/lib/utils': {},
    '@/lib/orders/types': {},
    '@/lib/dispatch/delivery': {},
    '../_components/ConfirmDeliveryForm': {},
    '../_components/shipping-label': label,
    '../_components/ShippingLabelData': { ShippingLabelData() { throw new Error('must not render'); } },
  }).default;
  await assert.rejects(Page({ params: Promise.resolve({ orderId: '00000000-0000-4000-8000-000000000001' }), searchParams: Promise.resolve({}) }), (error) => error === guardFailure);
  assert.equal(reads, 0);
});

test('public footer links only to administrative login and does not render shipping data', () => {
  const { Footer } = loadUi('../../src/components/store/Footer.tsx', {
    'next/link': { default: 'a', __esModule: true },
    '@/config/store': { STORE_CONFIG: { storeName: 'Tienda de prueba', description: 'Prueba', contact: { email: { enabled: false }, businessHours: { enabled: false } } }, getWhatsAppHref: () => null },
    '@/lib/analytics': { trackWhatsAppClick() { throw new Error('unexpected analytics'); } },
    '@/config/social': { SOCIAL_CONFIG: [] }, '@/data/categories': { getActiveCategories: () => [] },
  });
  const html = renderToStaticMarkup(React.createElement(Footer));
  assert.match(html, /href="\/operaciones\/login"[^>]*>Acceso administrativo<\/a>/);
  assert.doesNotMatch(html, /\/operaciones\/despacho|Datos para guía de envío|Cliente de prueba/);
});
