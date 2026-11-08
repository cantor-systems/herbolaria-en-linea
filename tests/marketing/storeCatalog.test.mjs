import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadSource, loadPricing } from '../helpers/isolatedModule.mjs';

const pricing = loadPricing();
const { PRODUCTS } = pricing.catalog;
const utils = loadSource('src/lib/utils.ts');
const { StockStatusBadge } = loadSource('src/components/product/StockStatusBadge.tsx');
const Link = ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);
function card(product, context) {
  let selected;
  const cartCalls = [];
  const { ProductCard } = loadSource('src/components/product/ProductCard.tsx', {
    react: { ...React, useState(initial) {
      selected ??= typeof initial === 'function' ? initial() : initial;
      return [selected, (next) => { selected = next; }];
    } },
    'next/link': { __esModule: true, default: Link }, '@/lib/utils': utils,
    '@/context/CartContext': { useCart: () => ({ addToCart: (...args) => cartCalls.push(args) }) },
    '@/data/brands': { getBrandBySlug: () => ({ name: 'Marca de prueba' }) },
    './StockStatusBadge': { StockStatusBadge }, '@/config/shipping': pricing.shippingConfig,
    '@/lib/shipping': pricing.shipping,
  });
  const tree = () => ProductCard({ product, ...(context ? { context } : {}) });
  const nodes = (node) => React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : [];
  return {
    html: () => renderToStaticMarkup(tree()),
    selected: () => { tree(); return selected; },
    choose: (units) => nodes(tree()).find(node => node.type === 'button' && node.props.children === `${units} unidades`).props.onClick(),
    buy: () => nodes(tree()).find(node => node.type === 'button' && Object.hasOwn(node.props, 'disabled')).props.onClick(),
    nodes: () => nodes(tree()), cartCalls,
  };
}

test('Store selects one actual unit even when popular is first; other contexts preserve popular selection', () => {
  for (const product of PRODUCTS.filter(p => p.variants.length > 1)) {
    const single = product.variants.find(v => v.unitsCount === 1);
    const popular = product.variants.find(v => v.isPopular) ?? product.variants[0];
    assert.equal(card(product, 'store').selected(), single ?? product.variants[0]);
    assert.equal(card(product).selected(), popular);
    const reordered = { ...product, variants: [popular, ...product.variants.filter(v => v !== popular)] };
    assert.equal(card(reordered, 'store').selected(), single ?? reordered.variants[0]);
  }
  const bulkOnly = { ...PRODUCTS[0], variants: [PRODUCTS[0].variants[2]] };
  const bulk = card(bulkOnly, 'store');
  assert.equal(bulk.selected().unitsCount, 5);
  bulk.buy(); assert.equal(bulk.cartCalls[0][1], bulkOnly.variants[0]);
});

test('Store copy, stock semantics and sober accents stay isolated from default cards', () => {
  const product = PRODUCTS[0];
  const store = card(product, 'store');
  const html = store.html();
  for (const text of [product.name, 'Elige tu presentación', 'Agregar al carrito', 'Ver detalles', 'Disponible', utils.formatCurrency(product.variants.find(v => v.unitsCount === 1).priceCents)]) assert.ok(html.includes(text));
  assert.doesNotMatch(html, /Precio por unidad:/);
  assert.doesNotMatch(html, /Ahorro|line-through|#D17B24/);
  assert.match(html, /aria-pressed="true"[^>]*>1 unidad/);
  assert.match(html, /href="\/producto\/moronel-gotas-50ml"/);
  assert.match(html, /src="\/images\/products\/moronel-gotas-50ml.webp"/);
  const legacy = card(product).html();
  for (const text of ['Seleccionar presentación:', 'Agregar al Carrito', 'Ver detalle', 'En stock', 'Equivale a', '#D17B24']) assert.ok(legacy.includes(text));
  assert.doesNotMatch(legacy, /Disponible|Precio por unidad:|aria-pressed/);
  for (const status of ['in_stock', 'low_stock', 'out_of_stock']) {
    const original = renderToStaticMarkup(React.createElement(StockStatusBadge, { stockStatus: status }));
    const localized = renderToStaticMarkup(React.createElement(StockStatusBadge, { stockStatus: status, inStockLabel: 'Disponible' }));
    assert.equal(original.match(/class="([^"]+)"/)[1], localized.match(/class="([^"]+)"/)[1]);
    assert.equal(localized, status === 'in_stock' ? original.replace('En stock', 'Disponible') : original);
  }
});

test('Selecting available packages updates prices, comparison, unit equivalent, percentage and the exact cart variant', () => {
  for (const product of PRODUCTS.filter(p => p.variants.length > 1)) {
    const ui = card(product, 'store');
    for (const variant of product.variants.filter(v => v.unitsCount > 1 && !v.hiddenFromSelection)) {
      const units = variant.unitsCount;
      ui.choose(units);
      const html = ui.html();
      const savings = utils.calculateSavingsPercentage(variant.compareAtPriceCents ?? 0, variant.priceCents);
      assert.ok(html.includes(utils.formatCurrency(variant.priceCents)));
      assert.ok(html.includes(`Precio por unidad: ${utils.formatCurrency(variant.unitPriceCents)}`));
      if (savings > 0) {
        assert.ok(html.includes(`-${savings}% Ahorro`));
        assert.ok(html.includes(utils.formatCurrency(variant.compareAtPriceCents)));
        assert.match(html, /line-through/);
      }
      assert.match(html, new RegExp(`aria-pressed="true"[^>]*>${units} unidades`));
      assert.doesNotMatch(html, /15% Ahorro Extra|Máximo Ahorro|#D17B24/);
      ui.buy();
      const args = ui.cartCalls.at(-1);
      assert.equal(args[0], product); assert.equal(args[1], variant); assert.equal(args.length, 2);
    }
  }
});

test('Moronel offers 1/3/5/20 in cards and detail while legacy IDs remain in the catalog', () => {
  const { VariantSelector } = loadSource('src/components/product/VariantSelector.tsx', { '@/lib/utils': utils });
  for (const product of PRODUCTS.slice(0, 2)) {
    assert.deepEqual(Array.from(product.variants.filter(v => !v.hiddenFromSelection), v => v.unitsCount), [1, 3, 5, 20]);
    const legacy = product.variants.find(v => v.unitsCount === 10);
    assert.equal(legacy.hiddenFromSelection, true);
    const twenty = product.variants.find(v => v.unitsCount === 20);
    assert.equal(twenty.image, product.images[0]);
    for (const context of ['store', 'default']) {
      const ui = card(product, context);
      assert.doesNotMatch(ui.html(), />10 unidades</);
      assert.match(ui.html(), />20 unidades</);
      ui.choose(20); ui.buy();
      assert.equal(ui.cartCalls.at(-1)[1].id, twenty.id);
      assert.match(ui.html(), /20% Ahorro/);
    }
    // Even a formerly popular legacy reference must never become a fresh selection.
    const reordered = { ...product, variants: [{ ...legacy, isPopular: true }, ...product.variants.filter(v => v !== legacy)] };
    assert.notEqual(card(reordered).selected().id, legacy.id);
    let chosen;
    const selector = VariantSelector({ variants: product.variants, selectedVariant: twenty, onSelectVariant: v => { chosen = v; } });
    const html = renderToStaticMarkup(selector);
    assert.ok(!html.includes(legacy.name)); assert.ok(html.includes(twenty.name));
    const buttons = selector.props.children[1].props.children;
    buttons.at(-1).props.onClick(); assert.equal(chosen, twenty);
    for (const [units, percentage] of [[3, 10], [5, 15], [20, 20]]) {
      const variant = product.variants.find(v => v.unitsCount === units);
      assert.equal(variant.badge, `${percentage}% Ahorro`);
      assert.equal(utils.calculateSavingsPercentage(variant.compareAtPriceCents, variant.priceCents), percentage);
    }
  }
});

test('Store shipping microcopy distinguishes a qualifying presentation from the general condition', () => {
  const single = card(PRODUCTS[0], 'store');
  assert.match(single.html(), /Envío estándar gratis desde \$699 MXN/);
  assert.doesNotMatch(single.html(), /Esta presentación incluye|Alcanza el mínimo/);
  single.choose(3);
  assert.match(single.html(), /Esta presentación incluye envío estándar gratis/);
  const herb = card(PRODUCTS.find(p => p.id === 'prod-moronel-hierba'), 'store');
  herb.choose(3);
  assert.equal(herb.selected().freeShippingEligible, false);
  assert.equal(herb.selected().priceCents, 70500);
  assert.match(herb.html(), /Esta presentación incluye envío estándar gratis/);
});

test('Store page supplies the localized context without renaming products or changing filters', () => {
  const calls = [];
  const { default: StoreCatalogPage } = loadSource('src/app/tienda/page.tsx', {
    react: { ...React, useState: value => [value, () => {}], useMemo: fn => fn() },
    'next/navigation': { useSearchParams: () => new URLSearchParams() },
    '@/data/products': { PRODUCTS },
    '@/data/categories': loadSource('src/data/categories.ts'),
    '@/data/brands': loadSource('src/data/brands.ts'),
    '@/components/product/ProductCard': { ProductCard: props => { calls.push(props); return React.createElement('article', null, props.product.name); } },
  });
  const html = renderToStaticMarkup(React.createElement(StoreCatalogPage));
  for (const text of ['Encuentra tus productos herbolarios', 'Explora extractos, cápsulas, hierbas y paquetes seleccionados para ti.', '¿Qué producto estás buscando?', 'Ordenar productos', 'Filtrar por categoría']) assert.ok(html.includes(text));
  assert.equal(calls.length, PRODUCTS.filter(p => p.status === 'active').length);
  assert.ok(calls.every(props => props.context === 'store' && PRODUCTS.includes(props.product)));
  const contexts = [];
  const { ProductGrid } = loadSource('src/components/product/ProductGrid.tsx', {
    './ProductCard': { ProductCard: props => { contexts.push(props.context); return null; } },
  });
  renderToStaticMarkup(React.createElement(ProductGrid, { products: [PRODUCTS[0]] }));
  assert.deepEqual(contexts, [undefined]);
});

test('the global announcement names standard shipping and derives its amount from the shared configuration', () => {
  const { TopAnnouncementBar } = loadSource('src/components/store/TopAnnouncementBar.tsx', {
    '@/config/shipping': pricing.shippingConfig,
    '@/config/store': { STORE_CONFIG: { contact: { whatsapp: { enabled: false } } } },
  });
  const html = renderToStaticMarkup(React.createElement(TopAnnouncementBar));
  assert.match(html, /Envío estándar gratis en compras desde \$699 MXN/);
  assert.doesNotMatch(html, /799/);
});
