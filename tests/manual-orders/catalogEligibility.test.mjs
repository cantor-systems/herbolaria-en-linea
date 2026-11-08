import assert from 'node:assert/strict';
import test from 'node:test';
import { admin, errorCode, harness, line, plain, policy, product, request, special } from './helpers.mjs';

const expectedEligible = ['var-caps-1', 'var-gotas-1', 'var-hierba-1'];
const expectedPromotional = ['var-caps-3', 'var-caps-5', 'var-caps-10', 'var-caps-20', 'var-gotas-3', 'var-gotas-5', 'var-gotas-10', 'var-gotas-20', 'var-hierba-3', 'var-hierba-5', 'var-hierba-10'];
const expectedUnreviewed = ['var-colesterol-trigliceridos-1', 'var-higado-1', 'var-rinones-1', 'var-super-curcuma-1', 'var-super-propoleo-1'];

test('every real variant has a documented explicit policy, without using existing wholesale flags', () => {
  const h = harness(), all = h.catalog.PRODUCTS.flatMap(p => Array.from(p.variants));
  assert.equal(all.length, 20);
  for (const variant of all) {
    assert.equal(variant.manualWholesaleDiscountPolicy.policyVersion, 'manual-catalog-v1');
    const resolved = h.manualCatalog.resolveManualEligibility(variant.manualWholesaleDiscountPolicy);
    assert.deepEqual(plain(resolved), plain(variant.manualWholesaleDiscountPolicy));
  }
  assert.deepEqual(plain(all.filter(v => v.manualWholesaleDiscountPolicy.eligibility === 'eligible').map(v => v.id).sort()), expectedEligible);
  for (const id of expectedPromotional) assert.equal(all.find(v => v.id === id).manualWholesaleDiscountPolicy.reason, 'promotional_presentation');
  for (const id of expectedUnreviewed) assert.equal(all.find(v => v.id === id).manualWholesaleDiscountPolicy.reason, 'unreviewed');
  assert.equal(all.find(v => v.id === 'var-pkg-1').manualWholesaleDiscountPolicy.reason, 'promotional_bundle');
});

test('all visible products and packages remain listed, including excluded and unreviewed variants', () => {
  const h = harness(), listed = h.manualCatalog.listManualCatalog();
  assert.equal(listed.length, 9); assert.equal(listed.flatMap(p => Array.from(p.variants)).length, 18);
  assert.ok(listed.some(p => p.productId === 'prod-paquete-integral'));
  assert.ok(listed.flatMap(p => Array.from(p.variants)).some(v => v.eligibility.reason === 'unreviewed'));
  assert.ok(!listed.flatMap(p => Array.from(p.variants)).some(v => ['var-gotas-10', 'var-caps-10'].includes(v.variantId)));
  const kit = listed.find(p => p.productId === 'prod-paquete-integral').variants[0];
  assert.equal(kit.commercialUnitsPerPackage, null); assert.equal(kit.selectable, true);
});

test('missing and inconsistent policies fail closed regardless of names, units, price or wholesaleEligible', () => {
  for (const rawPolicy of [undefined, null, {}, [], 'eligible', { eligibility: 'eligible', reason: 'promotional_bundle', policyVersion: 'v1' }, { eligibility: 'excluded', reason: 'regular_individual', policyVersion: 'v1' }, { eligibility: 'eligible', reason: 'regular_individual', policyVersion: '' }, { eligibility: 'eligible', reason: 'regular_individual', policyVersion: '<v1>' }]) {
    const p = product('looks-regular', 30000, { name: 'Individual regular', unitsCount: 1, wholesaleEligible: true, manualWholesaleDiscountPolicy: rawPolicy });
    const h = harness({ products: [p] }), normal = h.quote(request([line(p)]), admin);
    assert.equal(normal.eligibleBaseCents, 0); assert.equal(normal.lines[0].eligibility.reason, 'unreviewed');
    assert.throws(() => h.quote(request([line(p)], { discount: special() }), admin), errorCode('no_eligible_base'));
  }
});

for (const reason of ['promotional_presentation', 'promotional_bundle', 'promotional_individual', 'incompatible_promotion', 'unreviewed']) {
  test(`explicit ${reason} is selectable but cannot receive a special discount`, () => {
    const p = product('excluded', 10000, { manualWholesaleDiscountPolicy: policy('excluded', reason), wholesaleEligible: true });
    const h = harness({ products: [p] });
    assert.equal(h.manualCatalog.listManualCatalog()[0].variants[0].selectable, true);
    assert.throws(() => h.quote(request([line(p)], { discount: special(10000) }), admin), errorCode('no_eligible_base'));
  });
}

test('unreviewed individual extraction does not turn its legacy wholesale flag into special eligibility', () => {
  const h = harness();
  const q = h.quote(request([{ productId: 'prod-plantas-higado', variantId: 'var-higado-1', packageQuantity: 20 }]), admin);
  assert.equal(q.normalDiscountAvailable.wholesalePercentage, 35);
  assert.equal(q.eligibleBaseCents, 0); assert.equal(q.discountCents, 234500);
});

test('visible sold-out products can be displayed disabled without being quotable', () => {
  const p = { ...product(), stockStatus: 'out_of_stock' }, h = harness({ products: [p] });
  assert.equal(h.manualCatalog.listManualCatalog()[0].variants[0].selectable, false);
  assert.throws(() => h.quote(request([line(p)]), admin), errorCode('unavailable_variant'));
});
