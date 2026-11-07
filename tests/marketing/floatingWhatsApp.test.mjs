import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(relativePath, dependencies = {}, globals = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, ...globals,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name === 'react/jsx-runtime') return require(name);
      throw new Error(`Unexpected floating contact dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}

function harness({ pathname = '/', number = '525500000000', cartOpen = false, footerExists = true, observerSupported = true } = {}) {
  const config = load('../../src/config/store.ts', {}, { process: { env: { NEXT_PUBLIC_WHATSAPP_NUMBER: number } } });
  let footerVisible = true;
  let effect, callback, observed, disconnected = false;
  const footer = {};
  class Observer {
    constructor(fn) { callback = fn; }
    observe(element) { observed = element; }
    disconnect() { disconnected = true; }
  }
  const { FloatingWhatsAppButton } = load('../../src/components/store/FloatingWhatsAppButton.tsx', {
    react: { ...React, useState: () => [footerVisible, (next) => { footerVisible = next; }], useEffect: (fn) => { effect = fn; } },
    'next/navigation': { usePathname: () => pathname },
    '@/config/store': config,
    '@/context/CartContext': { useCart: () => ({ isCartOpen: cartOpen }) },
    './FloatingWhatsAppButton.module.css': { __esModule: true, default: { button: 'floating-whatsapp' } },
  }, {
    document: { querySelector: (selector) => { assert.equal(selector, 'footer'); return footerExists ? footer : null; } },
    window: observerSupported ? { IntersectionObserver: Observer } : {},
    IntersectionObserver: Observer,
  });
  return {
    render: () => renderToStaticMarkup(FloatingWhatsAppButton()),
    observe: () => effect(),
    intersect: (visible) => callback([{ isIntersecting: visible }]),
    get observedFooter() { return observed === footer; },
    get disconnected() { return disconnected; },
  };
}

test('floating contact waits for footer visibility, opens the configured channel safely and has one accessible name', () => {
  const ui = harness();
  assert.equal(ui.render(), '');
  const cleanup = ui.observe();
  assert.equal(ui.observedFooter, true);
  ui.intersect(false);
  const html = ui.render();
  assert.match(html, /href="https:\/\/wa\.me\/525500000000"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /aria-label="Contactar por WhatsApp"/);
  assert.match(html, /<svg[^>]+aria-hidden="true"[^>]+focusable="false"/);
  assert.doesNotMatch(html, /<title|<span|onclick|onClick/);
  ui.intersect(true);
  assert.equal(ui.render(), '');
  ui.intersect(false);
  assert.notEqual(ui.render(), '');
  cleanup();
  assert.equal(ui.disconnected, true);
});

test('floating contact never appears in operations, cart or checkout, including nested routes', () => {
  for (const pathname of [null, '/operaciones', '/operaciones/login', '/operaciones/despacho', '/operaciones/despacho/synthetic', '/carrito', '/carrito/', '/checkout', '/checkout/confirmacion']) {
    const ui = harness({ pathname });
    assert.equal(ui.render(), '');
    assert.equal(ui.observe(), undefined);
  }
});

test('floating contact is available on public content and uses route boundaries instead of broad prefixes', () => {
  for (const pathname of ['/', '/tienda', '/producto/synthetic', '/categoria/synthetic', '/blog', '/contacto', '/preguntas-frecuentes', '/operaciones-publicas']) {
    const ui = harness({ pathname });
    ui.render(); ui.observe(); ui.intersect(false);
    assert.notEqual(ui.render(), '');
  }
});

test('floating contact stays absent when the public WhatsApp channel is disabled', () => {
  for (const number of [undefined, '', '   ', '+ ()']) {
    const ui = harness({ number: number ?? '' });
    assert.equal(ui.render(), '');
    assert.equal(ui.observe(), undefined);
  }
});

test('floating contact stays absent while the existing cart drawer is open', () => {
  const ui = harness({ cartOpen: true });
  ui.render(); ui.observe(); ui.intersect(false);
  assert.equal(ui.render(), '');
});

test('floating contact fails closed when footer visibility cannot be observed', () => {
  for (const options of [{ footerExists: false }, { observerSupported: false }]) {
    const ui = harness(options);
    assert.equal(ui.render(), '');
    assert.equal(ui.observe(), undefined);
    assert.equal(ui.render(), '');
  }
});
