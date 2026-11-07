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
    module, exports: module.exports, process: { env: { NODE_ENV: 'test' } },
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (['react', 'react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
      throw new Error(`Unexpected category test dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}

const shared = load('../../src/data/categories.ts');
const homeCopy = load('../../src/content/home-categories.ts');
const homepage = load('../../src/content/homepage.ts', {
  '@/config/shipping': { SHIPPING_CONFIG: { standardEstimatedDays: 'plazo sintético', expressEstimatedDays: 'plazo sintético' } },
  '@/config/store': { STORE_CONFIG: { contact: { whatsapp: { enabled: false } } } },
});
const active = shared.getActiveCategories();
const beforeShared = JSON.stringify(shared.CATEGORIES);
const Link = { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
const empty = () => null;

function renderCategories(categories = active) {
  const dependencies = {
    'next/link': Link,
    '@/data/categories': { getActiveCategories: () => categories },
    '@/content/home-categories': homeCopy,
    '@/content/homepage': homepage,
    '@/content/promotional-slides': { PROMOTIONAL_SLIDES: [], allowPromotionalPreview: () => false, selectPromotionalSlides: () => [] },
    '@/lib/site': { canonicalAlternates: () => ({}) },
    '@/lib/catalog': { getFeaturedProducts: () => [] },
  };
  for (const [folder, name] of [
    ['marketing', 'HeroBanner'], ['marketing', 'PromotionalSlider'], ['product', 'ProductGrid'],
    ['marketing', 'HowToBuySteps'], ['store', 'TrustBar'], ['marketing', 'EducationalSection'],
    ['marketing', 'FeaturedPromoPackage'], ['marketing', 'FAQSection'], ['marketing', 'FinalCTA'],
  ]) dependencies[`@/components/${folder}/${name}`] = { [name]: empty };
  // Execute the real Home renderer. Unrelated UI and providers are isolated.
  const Page = load('../../src/app/page.tsx', dependencies).default;
  const html = renderToStaticMarkup(React.createElement(Page));
  const section = html.match(/<section id="categorias"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section);
  return section;
}

function links(html) {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({ href: match[1], html: match[2] }));
}

test('Home copy covers every active category by stable ID and configures distinct CTAs', () => {
  assert.deepEqual(Object.keys(homeCopy.HOME_CATEGORY_CARDS).sort(), Array.from(active, (category) => category.id).sort());
  assert.deepEqual(Array.from(active, (category) => homeCopy.HOME_CATEGORY_CARDS[category.id].ctaText), ['Ver extractos', 'Ver cápsulas', 'Explorar hierbas', 'Ver promociones']);
  for (const category of active) {
    const copy = homeCopy.HOME_CATEGORY_CARDS[category.id];
    assert.equal(typeof copy.microLabel, 'string');
    assert.ok(copy.microLabel.length && copy.description.length && copy.ctaText.length);
  }
});

test('Home renders the approved section and full descriptions, preserving order, images and routes', () => {
  const html = renderCategories();
  for (const text of Object.values(homeCopy.HOME_CATEGORY_SECTION)) assert.ok(html.includes(text));
  assert.match(html, /<h2[^>]*>Encuentra la presentación ideal para ti<\/h2>/);
  assert.doesNotMatch(html, /<h1|line-clamp-/);
  const rendered = links(html);
  assert.equal(rendered.length, 4);
  assert.deepEqual(rendered.map((link) => link.href), [
    '/categoria/extractos-y-gotas', '/categoria/capsulas', '/categoria/hierbas-e-infusiones', '/categoria/paquetes-y-promociones',
  ]);
  active.forEach((category, index) => {
    const copy = homeCopy.HOME_CATEGORY_CARDS[category.id];
    for (const text of [category.name, copy.microLabel, copy.description, copy.ctaText]) assert.ok(rendered[index].html.includes(text));
    assert.ok(rendered[index].html.includes(`src="${category.image}"`));
  });
});

test('CTA selection is independent of display names and array positions', () => {
  const renamed = Array.from(active).reverse().map((category) => ({ ...category, name: 'Nombre sintético' }));
  const rendered = links(renderCategories(renamed));
  renamed.forEach((category, index) => {
    assert.equal(rendered[index].href, `/categoria/${category.slug}`);
    assert.ok(rendered[index].html.includes(homeCopy.HOME_CATEGORY_CARDS[category.id].ctaText));
  });
});

test('unverified shared package claims and badge do not leak into Home; shared data is not mutated', () => {
  const immutable = Object.freeze(Array.from(active, (category) => Object.freeze({ ...category })));
  const html = renderCategories(immutable);
  assert.doesNotMatch(html, /Máximo Ahorro|descuentos exclusivos|envío estándar gratis/i);
  assert.equal(JSON.stringify(shared.CATEGORIES), beforeShared);
  assert.equal(shared.getCategoryBySlug('paquetes-y-promociones').badge, 'Máximo Ahorro');
});

test('internal category metadata continues using the original shared content', async () => {
  const categoryPage = load('../../src/app/categoria/[slug]/page.tsx', {
    'next/link': Link, 'next/navigation': { notFound() { throw new Error('not found'); } },
    '@/data/categories': shared, '@/data/products': { PRODUCTS: [] },
    '@/components/product/ProductCard': { ProductCard: empty },
    '@/lib/site': { canonicalAlternates: () => ({}) },
    '@/lib/catalog': { getProductCountByCategory: () => 0 },
  });
  for (const category of active) {
    const metadata = await categoryPage.generateMetadata({ params: Promise.resolve({ slug: category.slug }) });
    assert.equal(metadata.title, category.name);
    assert.equal(metadata.description, category.description);
    assert.equal(metadata.openGraph.description, category.description);
    assert.equal(metadata.twitter.description, category.description);
    assert.notEqual(metadata.description, homeCopy.HOME_CATEGORY_CARDS[category.id].description);
  }
});
