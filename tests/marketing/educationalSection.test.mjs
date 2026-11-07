import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
      throw new Error(`Unexpected educational section dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}
const content = load('../../src/content/homepage.ts', {
  '@/config/shipping': { SHIPPING_CONFIG: { standardEstimatedDays: 'plazo sintético', expressEstimatedDays: 'plazo sintético' } },
  '@/config/store': { STORE_CONFIG: { contact: { whatsapp: { enabled: false } } } },
});
const { EducationalSection } = load('../../src/components/marketing/EducationalSection.tsx', {
  '@/content/homepage': content,
  'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
});
const render = () => renderToStaticMarkup(React.createElement(EducationalSection));

test('the educational section renders the exact approved editorial copy and accessible hierarchy', () => {
  const before = JSON.stringify(content.HOMEPAGE_CONTENT);
  const html = render();
  assert.match(html, /<section aria-labelledby="educational-title"/);
  assert.match(html, />Conocimiento herbolario<\/span>/);
  assert.match(html, /<h2 id="educational-title"[^>]*>Descubre el mundo de las plantas medicinales<\/h2>/);
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((match) => match[1]);
  assert.deepEqual(paragraphs, [
    'Historia, tradición y conocimiento botánico.',
    'Explora el conocimiento tradicional de las plantas medicinales, sus características y las distintas formas en que han sido utilizadas a lo largo del tiempo.',
  ]);
  assert.doesNotMatch(html, /<h1|<ul|<ol|<form|<button|Moronel|Lonicera|Contenido sobre la especie/);
  assert.equal(JSON.stringify(content.HOMEPAGE_CONTENT), before);
});

test('the local botanical image leads the reading order and the sole CTA links to the existing blog', () => {
  const html = render();
  const image = content.HOMEPAGE_CONTENT.educational.image;
  assert.equal(image.src, '/images/banners/herbal-editorial.webp');
  assert.ok(existsSync(new URL('../../public' + image.src, import.meta.url)));
  assert.ok(existsSync(new URL('../../src/app/blog/page.tsx', import.meta.url)));
  assert.ok(html.includes(`alt="${image.alt}"`));
  assert.match(html, /width="2245" height="1035" loading="lazy" decoding="async"/);
  assert.match(html, /<a href="\/blog"[^>]*>[\s\S]*?<span>Leer artículos<\/span>/);
  assert.equal((html.match(/<a\b/g) ?? []).length, 1);
  const positions = ['<img', 'Conocimiento herbolario', '<h2', 'Historia, tradición', 'Explora el conocimiento', '<a'].map((text) => html.indexOf(text));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])));
});
