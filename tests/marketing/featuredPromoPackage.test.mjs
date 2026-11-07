import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(relativePath, overrides = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require(name) {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (['react', 'react/jsx-runtime', 'lucide-react', 'clsx', 'tailwind-merge'].includes(name)) return require(name);
      throw new Error(`Unexpected package dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}
const utils = load('../../src/lib/utils.ts');
const product = {
  id: 'synthetic-package', slug: 'synthetic-package', name: 'Paquete sintético',
  categorySlug: 'paquetes-y-promociones', stockStatus: 'in_stock', images: ['/images/synthetic.webp'],
  variants: [{ id: 'synthetic-first', priceCents: 83600, compareAtPriceCents: 92900 }, { id: 'synthetic-second', priceCents: 100 }],
};
function harness({ products = [product], whatsappHref = null } = {}) {
  const cartCalls = [];
  const analyticsCalls = [];
  const { FeaturedPromoPackage } = load('../../src/components/marketing/FeaturedPromoPackage.tsx', {
    '@/data/products': { PRODUCTS: products },
    '@/lib/utils': utils,
    '@/context/CartContext': { useCart: () => ({ addToCart: (...args) => cartCalls.push(args) }) },
    '@/config/store': { getWhatsAppHref: () => whatsappHref },
    '@/lib/analytics': { trackWhatsAppClick: (...args) => analyticsCalls.push(args) },
  });
  const tree = FeaturedPromoPackage();
  function nodes(node = tree) {
    if (!React.isValidElement(node)) return [];
    return [node, ...React.Children.toArray(node.props.children).flatMap(nodes)];
  }
  return { html: renderToStaticMarkup(tree), nodes: nodes(), cartCalls, analyticsCalls };
}

test('package selection and purchase preserve the catalogue product and first variant', () => {
  const other = { ...product, id: 'other', categorySlug: 'extractos' };
  const ui = harness({ products: [other, product] });
  ui.nodes.find((node) => node.type === 'button').props.onClick();
  assert.equal(ui.cartCalls.length, 1);
  assert.equal(ui.cartCalls[0][0], product);
  assert.equal(ui.cartCalls[0][1], product.variants[0]);
  const fallback = harness({ products: [other] });
  fallback.nodes.find((node) => node.type === 'button').props.onClick();
  assert.equal(fallback.cartCalls[0][0], other);
});

test('out-of-stock package disables purchase and guards a direct handler invocation', () => {
  const ui = harness({ products: [{ ...product, stockStatus: 'out_of_stock' }], whatsappHref: 'https://wa.me/000000000000' });
  const button = ui.nodes.find((node) => node.type === 'button');
  assert.equal(button.props.disabled, true);
  assert.match(ui.html, /Paquete agotado/);
  button.props.onClick();
  assert.equal(ui.cartCalls.length, 0);
  assert.match(ui.html, /Consultar por WhatsApp/);
});

test('current price, comparison and displayed savings derive from the selected variant', () => {
  const ui = harness();
  assert.match(ui.html, /\$836\.00/);
  assert.match(ui.html, /line-through[^>]*>\$929\.00/);
  assert.match(ui.html, /\$93\.00 MXN de ahorro directo/);
  const changed = harness({ products: [{ ...product, variants: [{ priceCents: 20000, compareAtPriceCents: 25000 }] }] });
  assert.match(changed.html, /\$200\.00/);
  assert.match(changed.html, /\$50\.00 MXN de ahorro directo/);
  assert.doesNotMatch(changed.html, /\$93/);
});

test('absent or non-discount comparison prices produce no strike-through or savings claim', () => {
  for (const comparison of [undefined, null, 0, 83500, 83600]) {
    const ui = harness({ products: [{ ...product, variants: [{ priceCents: 83600, compareAtPriceCents: comparison }] }] });
    assert.match(ui.html, /\$836\.00/);
    assert.doesNotMatch(ui.html, /line-through|ahorro directo/);
  }
});

test('the real photo, alternative text and five inclusions remain in mobile reading order', () => {
  const ui = harness();
  const image = ui.nodes.find((node) => node.type === 'img');
  assert.equal(image.props.src, product.images[0]);
  assert.equal(image.props.alt, product.name);
  assert.match(image.props.className, /object-contain/);
  const items = ui.nodes.filter((node) => node.type === 'li');
  assert.deepEqual(items.map((node) => node.props.children[1].props.children), [
    '1x Frasco de Gotas Concentradas de Moronel (50 ml)',
    '1x Frasco de Cápsulas Vegetales de Moronel (60 Cápsulas)',
    '1x Bolsa de Hierba Orgánica Deshidratada (240g)',
    '1x Guía de Uso Herbolario Tradicional en Físico',
    'Envío Estándar Incluido a Todo México',
  ]);
  const positions = ['<h2', '<figure', 'Prueba todas', '<ul', 'Precio Especial Paquete:', 'Comprar Paquete'].map((text) => ui.html.indexOf(text));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])));
});

test('WhatsApp stays conditional and preserves the existing click analytics without navigation', () => {
  assert.doesNotMatch(harness().html, /wa\.me|Pedir por WhatsApp/);
  const href = 'https://wa.me/000000000000'; // Deliberately synthetic; never requested.
  const ui = harness({ whatsappHref: href });
  const link = ui.nodes.find((node) => node.type === 'a');
  assert.equal(link.props.href, href);
  assert.match(ui.html, /Pedir por WhatsApp/);
  link.props.onClick();
  assert.equal(ui.analyticsCalls.length, 1);
  assert.equal(ui.analyticsCalls[0][0], 'product');
  assert.equal(ui.analyticsCalls[0][1].productSlug, product.slug);
  assert.equal(ui.analyticsCalls[0][1].placement, 'featured_package');
  assert.equal(ui.cartCalls.length, 0);
});
