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
function loadSlider(react = React, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, ...globals,
    require(name) {
      if (name === 'react') return react;
      if (['react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
      if (name === 'next/link') return { __esModule: true, default: ({ children, prefetch, ...props }) => React.createElement('a', props, children) };
      if (name === './PromotionalSlider.module.css') return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
      throw new Error(`Unexpected slider dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}
const { PromotionalSlider, PROMOTIONAL_AUTOPLAY_MS } = loadSlider();
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

// Execute the real component and its event handlers with deterministic hook and
// browser adapters. Node's clock advances its actual interval callback; no Next
// server, providers, credentials, environment files or network are involved.
function playbackHarness(t) {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const hooks = [];
  let cursor = 0;
  let dirty = true;
  let effects = [];
  let tree;
  const mediaListeners = new Set();
  const visibilityListeners = new Set();
  const media = { matches: false, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) };
  const document = { hidden: false, addEventListener: (_, fn) => visibilityListeners.add(fn), removeEventListener: (_, fn) => visibilityListeners.delete(fn) };
  const playbackNode = { contains: (target) => target === playbackNode };
  const contentNode = { closest: () => null };
  const react = {
    ...React,
    useId: () => 'synthetic-slider',
    useRef(value) { const position = cursor++; return hooks[position] ??= { current: value }; },
    useState(initial) {
      const position = cursor++;
      if (!(position in hooks)) hooks[position] = initial;
      return [hooks[position], (next) => {
        const value = typeof next === 'function' ? next(hooks[position]) : next;
        if (!Object.is(value, hooks[position])) { hooks[position] = value; dirty = true; }
      }];
    },
    useEffect(effect, dependencies) {
      const position = cursor++;
      const previous = hooks[position];
      if (!previous || dependencies.some((value, index) => !Object.is(value, previous.dependencies[index]))) {
        effects.push(() => { previous?.cleanup?.(); hooks[position] = { dependencies, cleanup: effect() }; });
      }
    },
  };
  const Component = loadSlider(react, {
    document,
    window: { matchMedia: () => media, setInterval, clearInterval },
  }).PromotionalSlider;
  function nodes(node = tree) {
    if (!React.isValidElement(node)) return [];
    return [node, ...React.Children.toArray(node.props.children).flatMap(nodes)];
  }
  function flush() {
    while (dirty) {
      dirty = false; cursor = 0; effects = [];
      tree = Component({ slides: [slide, { ...slide, id: 'second' }] });
      for (const node of nodes()) if (node.props.ref) node.props.ref.current = playbackNode;
      for (const effect of effects) effect();
    }
  }
  const find = (predicate) => { flush(); return nodes().find(predicate); };
  const region = () => find((node) => node.props['data-promotional-slider'] !== undefined);
  const playback = () => find((node) => /cambio automático/.test(node.props['aria-label'] ?? ''));
  const call = (handler) => { handler(); flush(); };
  t.after(() => { for (const hook of hooks) hook?.cleanup?.(); });
  flush();
  return {
    playbackNode, contentNode,
    focus: (target) => call(() => region().props.onFocusCapture({ target })),
    pointer: (pointerType, target = playbackNode) => call(() => region().props.onPointerMove({ pointerType, target })),
    leave: () => call(() => region().props.onPointerLeave()),
    clickPlayback: () => call(() => playback().props.onClick()),
    key: (key) => call(() => region().props.onKeyDown({ key, preventDefault() {} })),
    rotate: () => find((node) => node.props['aria-live'] !== undefined).props['aria-live'] === 'off',
    label: () => playback()?.props['aria-label'],
    active: () => find((node) => node.props['data-slide-id'] && !node.props.hidden).props['data-slide-id'],
    tick: (ms) => { t.mock.timers.tick(ms); flush(); },
    reduced: (value) => call(() => { media.matches = value; for (const listener of mediaListeners) listener(); }),
    hidden: (value) => call(() => { document.hidden = value; for (const listener of visibilityListeners) listener(); }),
  };
}

for (const input of ['mouse', 'touch', 'keyboard']) {
  test(`${input}: pause → resume with focus retained → advance after six seconds`, (t) => {
    const ui = playbackHarness(t);
    ui.focus(ui.playbackNode);
    if (input !== 'keyboard') ui.pointer(input);
    ui.clickPlayback();
    assert.equal(ui.rotate(), false);
    assert.equal(ui.label(), 'Reanudar cambio automático');
    ui.tick(6100);
    assert.equal(ui.active(), 'synthetic');
    // No blur or click outside the carousel before resuming.
    ui.clickPlayback();
    assert.equal(ui.rotate(), true);
    assert.equal(ui.label(), 'Pausar cambio automático');
    ui.tick(5999);
    assert.equal(ui.active(), 'synthetic');
    ui.tick(102);
    assert.equal(ui.active(), 'second');
  });
}

test('new content hover, focus and keyboard navigation still pause after explicit resume', (t) => {
  const ui = playbackHarness(t);
  ui.pointer('mouse', ui.contentNode);
  ui.focus(ui.contentNode);
  assert.equal(ui.rotate(), false);
  assert.equal(ui.label(), 'Reanudar cambio automático');
  ui.focus(ui.playbackNode);
  assert.equal(ui.rotate(), false); // Merely focusing Play does not restart it.
  ui.clickPlayback();
  assert.equal(ui.rotate(), true);
  ui.pointer('mouse', ui.contentNode);
  assert.equal(ui.rotate(), false);
  ui.tick(6100);
  assert.equal(ui.active(), 'synthetic');
  ui.leave();
  ui.focus(ui.contentNode);
  assert.equal(ui.rotate(), false);
  ui.focus(ui.playbackNode);
  ui.clickPlayback();
  ui.key('ArrowRight');
  assert.equal(ui.rotate(), false);
  ui.tick(6100);
  assert.equal(ui.active(), 'second');
});

test('resume cannot override reduced motion or a hidden page; touch does not create hover', (t) => {
  const ui = playbackHarness(t);
  ui.pointer('touch', ui.contentNode);
  assert.equal(ui.rotate(), true);
  ui.hidden(true);
  assert.equal(ui.rotate(), false);
  ui.clickPlayback();
  ui.tick(6100);
  assert.equal(ui.active(), 'synthetic');
  ui.hidden(false);
  ui.reduced(true);
  assert.equal(ui.rotate(), false);
  assert.equal(ui.label(), undefined);
  ui.tick(6100);
  assert.equal(ui.active(), 'synthetic');
});
