import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const filename = new URL('../../src/components/marketing/PromotionalSlider.tsx', import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
  fileName: filename.pathname,
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
});
const module = { exports: {} };
vm.runInNewContext(outputText, {
  module, exports: module.exports,
  require(name) {
    if (['react', 'react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
    if (name === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) };
    if (name === './PromotionalSlider.module.css') return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    throw new Error(`Unexpected slider dependency: ${name}`);
  },
}, { filename: filename.pathname });
const { PromotionalSlider, PROMOTIONAL_AUTOPLAY_MS } = module.exports;
const slide = { id: 'synthetic', campaign: 'editorial', desktopImage: '/images/test.webp', mobileImage: '/images/test-mobile.webp', alt: 'Synthetic image', eyebrow: 'Conoce más', headline: 'Título de prueba', ctaText: 'Leer artículos', href: '/blog', active: true, order: 1, previewOnly: true };
const render = (slides) => renderToStaticMarkup(React.createElement(PromotionalSlider, { slides }));

test('SSR and no-JS retain the first photo, accessible content and CTA without extra H1 or inert controls', () => {
  const html = render([slide]);
  assert.match(html, /aria-roledescription="carrusel"/);
  assert.match(html, /<h2[^>]*>Título de prueba<\/h2>/);
  assert.match(html, /href="\/blog"/);
  assert.match(html, /fetchPriority="high"/);
  assert.match(html, /loading="eager"/);
  assert.match(html, /srcSet="\/images\/test-mobile.webp"/);
  assert.match(html, /Preview · Imagen de referencia/);
  assert.doesNotMatch(html, /<h1|<button/);
  assert.equal(PROMOTIONAL_AUTOPLAY_MS, 6000);
});

test('SSR hides later slides and does not request their images', () => {
  const html = render([slide, { ...slide, id: 'second', desktopImage: '/images/later.webp' }]);
  assert.match(html, /hidden=""[^>]*role="group"/);
  assert.doesNotMatch(html, /later.webp/);
  assert.equal((html.match(/<img /g) ?? []).length, 1);
});

test('empty configuration renders nothing and approved imagery has no reference label', () => {
  assert.equal(render([]), '');
  assert.doesNotMatch(render([{ ...slide, previewOnly: false }]), /Preview ·/);
});
