import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(relativePath, dependencies = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (['react', 'react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
      throw new Error(`Unexpected purchase steps dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}
// Load the actual content without environment files, providers or network access.
const content = load('../../src/content/homepage.ts', {
  '@/config/shipping': { SHIPPING_CONFIG: { standardEstimatedDays: 'plazo sintético', expressEstimatedDays: 'plazo sintético' } },
  '@/config/store': { STORE_CONFIG: { contact: { whatsapp: { enabled: false } } } },
});
const { HowToBuySteps } = load('../../src/components/marketing/HowToBuySteps.tsx', {
  '@/content/homepage': content,
});
const approved = [
  ['01', 'Elige tus productos', 'Explora el catálogo y selecciona las presentaciones que mejor se adapten a tus necesidades.'],
  ['02', 'Revisa tu pedido', 'Confirma productos, cantidades y opciones disponibles antes de continuar.'],
  ['03', 'Paga de forma segura', 'Completa tus datos y realiza tu pago en línea mediante Mercado Pago.'],
  ['04', 'Recibe y rastrea', 'Da seguimiento a tu compra y consulta tu guía cuando tu pedido haya sido enviado.'],
];

test('purchase steps render the exact approved heading and four descriptions in order', () => {
  const before = JSON.stringify(content.HOMEPAGE_CONTENT);
  const html = renderToStaticMarkup(React.createElement(HowToBuySteps));
  assert.match(html, />PROCESO DE COMPRA<\/span>/);
  assert.match(html, /<h2[^>]*>¿Cómo comprar en Herbolaria en Línea\?<\/h2>/);
  const rows = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1]);
  assert.equal(rows.length, 4);
  approved.forEach(([number, title, description], index) => {
    assert.ok(rows[index].includes(`>${number}</span>`));
    assert.ok(rows[index].includes(`>${title}</h3>`));
    assert.ok(rows[index].includes(`>${description}</p>`));
  });
  assert.equal(JSON.stringify(content.HOMEPAGE_CONTENT), before);
});

test('the informational section has an accessible heading, ordered list and decorative icons', () => {
  const html = renderToStaticMarkup(React.createElement(HowToBuySteps));
  assert.match(html, /<section aria-labelledby="how-to-buy-title"/);
  assert.match(html, /<h2 id="how-to-buy-title"/);
  assert.match(html, /<ol role="list"/);
  assert.equal((html.match(/<svg\b[^>]*aria-hidden="true"/g) ?? []).length, 4);
  assert.doesNotMatch(html, /<h1|<button|<a\b|<form/);
});
