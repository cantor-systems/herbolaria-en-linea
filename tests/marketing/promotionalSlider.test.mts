import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { PROMOTIONAL_SLIDES, allowPromotionalPreview, selectPromotionalSlides, type PromotionalSlide } from '../../src/content/promotional-slides.ts';

const sample = (changes: Partial<PromotionalSlide> = {}): PromotionalSlide => ({ ...PROMOTIONAL_SLIDES[0], previewOnly: false, ...changes });
const categoriesModule = { exports: {} as { getActiveCategories: () => { slug: string }[] } };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../../src/data/categories.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { module: categoriesModule, exports: categoriesModule.exports, require() { throw new Error('Unexpected category dependency'); } });
const { getActiveCategories } = categoriesModule.exports;

test('unapproved reference artwork is excluded from production by default', () => {
  assert.equal(selectPromotionalSlides(PROMOTIONAL_SLIDES).length, 0);
  assert.equal(selectPromotionalSlides(PROMOTIONAL_SLIDES, { allowPreview: true }).length, 3);
  assert.equal(allowPromotionalPreview('production', 'production'), false);
  assert.equal(allowPromotionalPreview('development', 'production'), false);
  assert.equal(allowPromotionalPreview('production', undefined), false);
  assert.equal(allowPromotionalPreview('production', 'preview'), true);
  assert.equal(allowPromotionalPreview('development', undefined), true);
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
  assert.deepEqual(PROMOTIONAL_SLIDES.map((slide) => slide.href), ['/tienda', `/categoria/${category.slug}`, '/blog']);
  for (const slide of PROMOTIONAL_SLIDES) {
    for (const image of [slide.desktopImage, slide.mobileImage].filter(Boolean) as string[]) {
      assert.ok(image.startsWith('/images/'));
      assert.ok(existsSync(new URL(`../../public${image}`, import.meta.url)));
    }
    assert.ok(slide.alt.length > 10);
    assert.doesNotMatch(`${slide.headline} ${slide.eyebrow} ${slide.ctaText}`, /\d+%|gratis|regalo|nuevo lanzamiento/i);
  }
});
