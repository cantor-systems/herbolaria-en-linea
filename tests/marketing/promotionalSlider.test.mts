import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { PROMOTIONAL_SLIDES, allowPromotionalPreview, selectPromotionalSlides, type PromotionalSlide } from '../../src/content/promotional-slides.ts';

const sample = (changes: Partial<PromotionalSlide> = {}): PromotionalSlide => ({ ...PROMOTIONAL_SLIDES[1], previewOnly: false, ...changes });
const categoriesModule = { exports: {} as { getActiveCategories: () => { slug: string }[] } };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../../src/data/categories.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { module: categoriesModule, exports: categoriesModule.exports, require() { throw new Error('Unexpected category dependency'); } });
const { getActiveCategories } = categoriesModule.exports;

test('unapproved reference artwork is excluded from production by default', () => {
  const unapproved = [sample({ previewOnly: true })];
  assert.equal(selectPromotionalSlides(unapproved).length, 0);
  assert.equal(selectPromotionalSlides(unapproved, { allowPreview: true }).length, 1);
  assert.equal(allowPromotionalPreview('production', 'production'), false);
  assert.equal(allowPromotionalPreview('development', 'production'), false);
  assert.equal(allowPromotionalPreview('production', undefined), false);
  assert.equal(allowPromotionalPreview('production', 'preview'), true);
  assert.equal(allowPromotionalPreview('development', undefined), true);
});

test('the three owner-approved provisional banners are available in production', () => {
  const slides = selectPromotionalSlides(PROMOTIONAL_SLIDES, {
    now: Date.parse('2026-11-01T12:00:00Z'),
    allowPreview: allowPromotionalPreview('production', 'production'),
  });
  assert.deepEqual(slides.map((slide) => slide.id), ['moronel-featured', 'moronel-packages', 'herbal-world']);
  assert.ok(slides.every((slide) => slide.previewOnly === false));
});

test('campaign windows include the start, exclude the end and fail closed on invalid dates', () => {
  const now = Date.parse('2026-11-06T12:00:00Z');
  const start = new Date(now).toISOString();
  const end = new Date(now + 1000).toISOString();
  assert.equal(selectPromotionalSlides([sample({ startsAt: start, endsAt: end })], { now }).length, 1);
  assert.equal(selectPromotionalSlides([sample({ startsAt: start, endsAt: end })], { now: now + 1000 }).length, 0);
  assert.equal(selectPromotionalSlides([sample({ startsAt: end })], { now }).length, 0);
  for (const changes of [{ startsAt: 'invalid' }, { endsAt: 'invalid' }, { startsAt: end, endsAt: start }, { startsAt: start, endsAt: start }]) {
    assert.equal(selectPromotionalSlides([sample(changes)], { now }).length, 0);
  }
});

test('inactive slides are omitted and ordering does not mutate the versioned configuration', () => {
  const input = [sample({ id: 'last', order: 9 }), sample({ id: 'hidden', active: false }), sample({ id: 'first', order: 0 })];
  assert.deepEqual(selectPromotionalSlides(input).map((slide) => slide.id), ['first', 'last']);
  assert.equal(input[0].id, 'last');
});

test('slides use unique identifiers, local images and verified existing destinations without discount claims', () => {
  assert.equal(new Set(PROMOTIONAL_SLIDES.map((slide) => slide.id)).size, PROMOTIONAL_SLIDES.length);
  const category = getActiveCategories().find((entry) => entry.slug === 'paquetes-y-promociones');
  assert.ok(category);
  assert.deepEqual(PROMOTIONAL_SLIDES.map((slide) => slide.href), ['/tienda', '/tienda', `/categoria/${category.slug}`, '/blog']);
  for (const slide of PROMOTIONAL_SLIDES) {
    for (const image of [slide.desktopImage, slide.mobileImage].filter(Boolean) as string[]) {
      assert.ok(image.startsWith('/images/'));
      assert.ok(existsSync(new URL(`../../public${image}`, import.meta.url)));
    }
    assert.ok(slide.alt.length > 10);
    if (slide.id !== 'buen-fin-2026') assert.doesNotMatch(`${slide.headline} ${slide.eyebrow} ${slide.ctaText}`, /\d+%|gratis|regalo|nuevo lanzamiento/i);
  }
});

test('BF20 is first only inside its approved window, preserving the other three slides', () => {
  const original = ['moronel-featured', 'moronel-packages', 'herbal-world'];
  for (const [instant, active] of [['2026-11-11T23:59:59.999-06:00', false], ['2026-11-12T00:00:00-06:00', true], ['2026-11-17T23:59:59.999-06:00', true], ['2026-11-18T00:00:00-06:00', false]] as const) {
    assert.deepEqual(selectPromotionalSlides(PROMOTIONAL_SLIDES, { now: Date.parse(instant) }).map(s => s.id), active ? ['buen-fin-2026', ...original] : original);
  }
});
