import assert from 'node:assert/strict';
import test from 'node:test';
import { admin, errorCode, harness, line, plain, policy, product, reason, request, special } from './helpers.mjs';

const p = product();
const h = harness({ products: [p] });

test('BF20 is refused explicitly in manual quotes, including normalized codes and wholesale', () => {
  for (const code of ['BF20', ' bf20 ']) for (const quantity of [1, 20]) {
    assert.throws(() => h.quote(request([line(p, quantity)], { discount: { mode: 'normal', promotionCode: code } }), admin), errorCode('invalid_discount'));
  }
});

test('regular individual quantities mean packages purchased, not a promotional variant', () => {
  const q = h.quote(request([line(p, 2)], { discount: special() }), admin);
  assert.equal(q.subtotalCents, 60000); assert.equal(q.eligibleBaseCents, 60000);
  assert.equal(q.discountCents, 21000); assert.equal(q.lines[0].packageQuantity, 2);
  assert.equal(q.lines[0].totalCommercialUnits, 2); assert.equal(q.totalCents, 48900);
  assert.equal(q.persistenceImplemented, false); assert.equal(q.requiresAdministrativeConfirmation, true);
});

test('mixed order discounts eligible regular lines only and retains promotional prices', () => {
  const pack = product('pack', 90000, { unitsCount: 3, manualWholesaleDiscountPolicy: policy('excluded', 'promotional_presentation') });
  const promo = product('promo', 20000, { manualWholesaleDiscountPolicy: policy('excluded', 'promotional_individual') });
  const kit = product('kit', 80000, { unitsCount: 1, manualWholesaleDiscountPolicy: policy('excluded', 'promotional_bundle') });
  const q = harness({ products: [p, pack, promo, kit] }).quote(request([line(p, 2), line(pack), line(promo), line(kit)], { discount: special() }), admin);
  assert.equal(q.subtotalCents, 250000); assert.equal(q.eligibleBaseCents, 60000); assert.equal(q.discountCents, 21000);
  for (const row of q.lines.filter(row => row.productId !== p.id)) {
    assert.equal(row.specialDiscountCents, 0); assert.equal(row.netCents, row.subtotalCents);
  }
  const kitLine = q.lines.find(row => row.productId === 'kit');
  assert.equal(kitLine.packageQuantity, 1); assert.equal(kitLine.totalCommercialUnits, null);
  assert.equal(kitLine.composition, 'unstructured'); assert.ok(q.notices.includes('unstructured_composition'));
});

for (const percentageBps of [0, 3500, 3501, 5000, 10000]) {
  test(`principal administrator accepts ${percentageBps} basis points on eligible base`, () => {
    const q = h.quote(request([line(p)], { discount: special(percentageBps) }), admin);
    assert.equal(q.discountCents, Math.floor(30000 * percentageBps / 10000));
    assert.equal(q.lines[0].specialDiscountCents, q.discountCents);
  });
}

test('future seller arithmetic is capped at 35%, while all seller quotes remain disabled', () => {
  assert.equal(h.discounts.FUTURE_SELLER_WHOLESALE_MAX_BPS, 3500);
  assert.equal(h.discounts.calculateSpecialDiscount(60000, 3500, 3500), 21000);
  assert.throws(() => h.discounts.calculateSpecialDiscount(60000, 3501, 3500), errorCode('invalid_discount'));
  for (const customerSegment of ['retail', 'wholesale']) for (const percentageBps of [3500, 5000]) {
    assert.throws(() => h.quote(request([line(p)], { discount: special(percentageBps) }), { role: 'seller', actor: 'synthetic-seller', customerSegment }), errorCode('seller_operations_disabled'));
  }
});

test('missing or forged authorization is rejected; no caller context is read from request', () => {
  for (const context of [null, {}, { ...admin, role: 'owner' }, { ...admin, actor: 'a-person' }, { ...admin, customerSegment: 'anything' }]) {
    assert.throws(() => h.quote(request([line(p)]), context));
  }
  for (const field of ['role', 'authorizationContext', 'totalCents', 'eligibility', 'priceCents']) {
    assert.throws(() => h.quote({ ...request([line(p)]), [field]: 'forged' }, admin), errorCode('invalid_request'));
    assert.throws(() => h.quote(request([{ ...line(p), [field]: 'forged' }]), admin), errorCode('invalid_request'));
  }
});

test('fixed discounts and normal/special stacking fields are rejected', () => {
  for (const discount of [{ mode: 'fixed_amount', amountCents: 100 }, { ...special(), promotionCode: 'SYNTHETIC' }, { ...special(), lineDiscounts: [{ variantId: 'forged', amountCents: 10 }] }]) {
    assert.throws(() => h.quote(request([line(p)], { discount }), admin));
  }
});

test('invalid percentages and missing, short, excessive or unsafe reasons fail closed', () => {
  for (const percentageBps of [-1, 10001, 3500.1, NaN, Infinity, '3500', null]) {
    assert.throws(() => h.quote(request([line(p)], { discount: { ...special(), percentageBps } }), admin), errorCode('invalid_discount'));
  }
  for (const invalidReason of ['', 'short', 'x'.repeat(501), 'invalid\nreason long', '<invalid reason>', null]) {
    assert.throws(() => h.quote(request([line(p)], { discount: { ...special(), reason: invalidReason } }), admin), errorCode('invalid_reason'));
  }
});

test('special percentage floors fractions of a cent, including tiny positive bases', () => {
  const tiny = product('tiny', 17);
  const q = harness({ products: [tiny] }).quote(request([line(tiny)], { discount: special() }), admin);
  assert.equal(q.discountCents, 5); assert.equal(q.lines[0].netCents, 12);
  const one = product('one', 1);
  const belowCent = harness({ products: [one] }).quote(request([line(one)], { discount: special(1) }), admin);
  assert.equal(belowCent.discountCents, 0); assert.equal(belowCent.specialDiscountApplied, null);
});

test('largest remainders preserve exact sum and deterministic ties under reordered input', () => {
  const products = ['a', 'b', 'c'].map(id => product(id, 1));
  const engine = harness({ products });
  const input = request(products.map(p => line(p)), { discount: special(5000) });
  const q = engine.quote(input, admin), reversed = engine.quote({ ...input, items: [...input.items].reverse() }, admin);
  assert.equal(q.discountCents, 1); assert.equal(q.lines.reduce((s, v) => s + v.specialDiscountCents, 0), 1);
  assert.deepEqual(plain(q), plain(reversed)); assert.equal(q.lines[0].specialDiscountCents, 1);
  for (const v of q.lines) assert.ok(v.netCents >= 0);
  const all = engine.quote({ ...input, discount: special(10000) }, admin);
  assert.equal(all.discountCents, 3); assert.ok(all.lines.every(v => v.netCents === 0));
});

test('allocation rejects unsafe money, duplicate keys, over-discount and invalid caps', () => {
  for (const amount of [-1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 11]) {
    assert.throws(() => h.discounts.distributeDiscount([{ key: 'a', baseCents: 10 }], amount), errorCode('invalid_money'));
  }
  assert.throws(() => h.discounts.distributeDiscount([{ key: 'a', baseCents: 1 }, { key: 'a', baseCents: 1 }], 1), errorCode('invalid_items'));
  assert.throws(() => h.discounts.calculateSpecialDiscount(10, 1, Infinity), errorCode('invalid_discount'));
  assert.throws(() => h.discounts.calculateSpecialDiscount(-1, 1, 10000), errorCode('invalid_money'));
});

test('courtesy waives paid standard shipping with required reason and no price change', () => {
  const q = h.quote(request([line(p)], { standardShippingCourtesy: { requested: true, reason } }), admin);
  assert.equal(q.normalShippingCents, 9900); assert.equal(q.shippingCourtesyApplied.amountCents, 9900);
  assert.equal(q.shippingCourtesyApplied.reason, reason); assert.equal(q.shippingCents, 0); assert.equal(q.totalCents, 30000);
  assert.throws(() => h.quote(request([line(p)], { standardShippingCourtesy: { requested: true, reason: '' } }), admin), errorCode('invalid_reason'));
});

test('courtesy never upgrades express or records an already-free benefit', () => {
  assert.throws(() => h.quote(request([line(p)], { shippingMethod: 'express', standardShippingCourtesy: { requested: true, reason } }), admin), errorCode('courtesy_requires_standard'));
  const costly = product('costly', 69900);
  const q = harness({ products: [costly] }).quote(request([line(costly)], { standardShippingCourtesy: { requested: true, reason } }), admin);
  assert.equal(q.normalShippingCents, 0); assert.equal(q.shippingCourtesyApplied, null); assert.ok(q.notices.includes('courtesy_already_free'));
});

test('699 threshold remains inclusive before discounts with unchanged express tariffs', () => {
  for (const [price, standard, express] of [[69899, 9900, 18600], [69900, 0, 7900], [69901, 0, 7900]]) {
    const item = product('threshold', price), engine = harness({ products: [item] });
    for (const [shippingMethod, expected] of [['standard', standard], ['express', express]]) {
      const q = engine.quote(request([line(item)], { shippingMethod, discount: special(9000) }), admin);
      assert.equal(q.normalShippingCents, expected); assert.equal(q.shippingCents, expected);
    }
  }
});

test('normal quote preserves wholesale while special replaces it without stacking or losing shipping eligibility', () => {
  const individual = product('individual', 1000, { wholesaleEligible: true });
  const engine = harness({ products: [individual] }), input = request([line(individual, 20)]);
  const normal = engine.quote(input, admin), selected = engine.quote({ ...input, discount: special(5000) }, admin);
  assert.equal(normal.normalDiscountAvailable.amountCents, 7000); assert.equal(normal.discountCents, 7000);
  assert.equal(selected.normalDiscountAvailable.amountCents, 7000); assert.equal(selected.discountCents, 10000);
  assert.equal(selected.totalCents, 10000); assert.equal(selected.shippingCents, 0);
  assert.equal(selected.lines[0].appliedDiscountCents, 10000); assert.equal(selected.lines[0].normalDiscountAvailableCents, 7000);
});

test('normal quote reuses coupon validation and never changes public promotion rules', () => {
  const promotions = { PROMOTIONS_ENABLED: true, PROMOTIONS_CONFIG: [{ code: 'SYNTHETIC10', type: 'percentage', value: 10, minimumSubtotalCents: 0, enabled: true, timeZone: 'America/Mexico_City' }] };
  const engine = harness({ products: [p], promotions });
  const q = engine.quote(request([line(p)], { discount: { mode: 'normal', promotionCode: ' synthetic10 ' } }), admin);
  assert.equal(q.normalDiscountAvailable.promotionCode, 'SYNTHETIC10'); assert.equal(q.discountCents, 3000);
  assert.equal(q.lines[0].appliedDiscountCents, 3000);
  assert.throws(() => engine.quote(request([line(p)], { discount: { mode: 'normal', promotionCode: 'MISSING' } }), admin), errorCode('normal_pricing_failed'));
});

test('zero total is computable but never authorizes creation or fabricates a payment', () => {
  const q = h.quote(request([line(p)], { discount: special(10000), standardShippingCourtesy: { requested: true, reason } }), admin);
  assert.equal(q.totalCents, 0); assert.deepEqual(plain(q.blockingReasons), ['zero_total_persistence_not_authorized']);
  assert.equal(q.persistenceImplemented, false); assert.equal('status' in q, false); assert.equal('paymentId' in q, false);
});

test('limits apply to raw lines and aggregated packages; malformed payloads are rejected', () => {
  for (const quantity of [0, -1, 1.1, 100, Infinity, NaN, '1', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => h.quote(request([line(p, quantity)]), admin), errorCode('invalid_quantity'));
  }
  assert.throws(() => h.quote(request([line(p, 50), line(p, 50)]), admin), errorCode('invalid_quantity'));
  assert.throws(() => h.quote(request(Array.from({ length: 51 }, () => line(p))), admin), errorCode('invalid_items'));
  assert.throws(() => h.quote(request([]), admin), errorCode('invalid_items'));
  assert.equal(h.quote(request(Array.from({ length: 50 }, () => line(p))), admin).lines[0].packageQuantity, 50);
  assert.equal(h.quote(request([line(p, 99)]), admin).lines[0].packageQuantity, 99);
});

test('unknown, hidden, draft and sold-out variants cannot be quoted', () => {
  const hidden = product('hidden', 30000, { hiddenFromSelection: true });
  const draft = { ...product('draft'), status: 'draft' }, out = { ...product('out'), stockStatus: 'out_of_stock' };
  const engine = harness({ products: [hidden, draft, out] });
  for (const item of [hidden, draft, out, p]) assert.throws(() => engine.quote(request([line(item)]), admin), errorCode('unavailable_variant'));
});

test('normalized intent and pricing fingerprints are deterministic, versioned and sensitive to changes', () => {
  const input = request([line(p, 2)]), q = h.quote(input, admin);
  const reordered = h.quote(request([line(p), line(p)]), admin);
  assert.equal(q.requestFingerprint, reordered.requestFingerprint); assert.equal(q.pricingFingerprint, reordered.pricingFingerprint);
  assert.match(q.pricingFingerprint, /^[a-f0-9]{64}$/);
  const changed = harness({ products: [product('synthetic', 31000)] }).quote(input, admin);
  assert.equal(q.requestFingerprint, changed.requestFingerprint); assert.notEqual(q.pricingFingerprint, changed.pricingFingerprint);
  const adjusted = h.quote({ ...input, discount: special() }, admin);
  assert.notEqual(q.requestFingerprint, adjusted.requestFingerprint);
  assert.equal(q.snapshot.policyVersion, 'manual-pricing-v1'); assert.equal(q.snapshot.lines[0].eligibility.policyVersion, 'synthetic-policy-v1');
  assert.doesNotThrow(() => JSON.stringify(q.snapshot));
  input.items[0].packageQuantity = 99; assert.equal(q.snapshot.intent.items[0].packageQuantity, 2);
});

test('visible real-catalog prices and shipping match public server quotes without changing catalog data', () => {
  const engine = harness(), before = JSON.stringify(engine.catalog.PRODUCTS);
  for (const p of engine.catalog.PRODUCTS) for (const variant of p.variants.filter(v => !v.hiddenFromSelection)) {
    for (const shippingMethod of ['standard', 'express']) {
      const q = engine.quote(request([{ productId: p.id, variantId: variant.id, packageQuantity: 1 }], { shippingMethod }), admin);
      const baseline = engine.server.priceCheckoutCart([{ slug: p.slug, variantId: variant.id, quantity: 1 }], shippingMethod, null);
      assert.equal(q.subtotalCents, baseline.subtotalCents); assert.equal(q.discountCents, baseline.discountCents);
      assert.equal(q.shippingCents, baseline.shippingCents); assert.equal(q.totalCents, baseline.totalCents);
      assert.equal(q.lines[0].unitPriceCents, variant.priceCents);
    }
  }
  assert.equal(JSON.stringify(engine.catalog.PRODUCTS), before);
});

test('authorization segments must be literal values and commercial-unit counts stay safe', () => {
  assert.throws(() => h.quote(request([line(p)]), { ...admin, customerSegment: { toString: () => 'retail' } }), errorCode('unauthorized_context'));
  const huge = product('huge-units', 100, { unitsCount: Number.MAX_SAFE_INTEGER });
  assert.throws(() => harness({ products: [huge] }).quote(request([line(huge, 2)]), admin), errorCode('invalid_items'));
});

test('allocation invariants hold across mixed cent bases, rates and input permutations', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const lines = Array.from({ length: 7 }, (_, index) => ({ key: `line-${index}`, baseCents: (seed * 73 + index * 41) % 503 }));
    const base = lines.reduce((s, line) => s + line.baseCents, 0);
    for (const bps of [1, 3333, 3500, 5001, 9999, 10000]) {
      const amount = h.discounts.calculateSpecialDiscount(base, bps, 10000);
      const allocation = h.discounts.distributeDiscount(lines, amount);
      const reversed = h.discounts.distributeDiscount([...lines].reverse(), amount);
      assert.equal([...allocation.values()].reduce((s, n) => s + n, 0), amount);
      for (const line of lines) {
        const applied = allocation.get(line.key);
        assert.ok(Number.isSafeInteger(applied) && applied >= 0 && applied <= line.baseCents);
        assert.equal(applied, reversed.get(line.key));
      }
    }
  }
});

test('less favorable specials expose a stable blocker and preserve both calculated alternatives', () => {
  const eligible = product('eligible', 1000, { wholesaleEligible: true });
  const excluded = product('excluded', 1000, { wholesaleEligible: true, manualWholesaleDiscountPolicy: policy('excluded', 'unreviewed') });
  const engine = harness({ products: [eligible, excluded] });
  for (const [items, bps, normalDiscount, specialDiscount, subtotal] of [
    [[line(eligible, 20)], 3000, 7000, 6000, 20000],
    [[line(eligible, 20), line(excluded, 20)], 5000, 17200, 10000, 40000],
  ]) {
    const normal = engine.quote(request(items), admin);
    const selected = engine.quote(request(items, { discount: special(bps) }), admin);
    assert.equal(normal.discountCents, normalDiscount);
    assert.equal(selected.normalDiscountAvailable.amountCents, normalDiscount);
    assert.equal(selected.specialDiscountRequested.percentageBps, bps);
    assert.equal(selected.specialDiscountApplied.amountCents, specialDiscount);
    assert.equal(selected.discountCents, specialDiscount);
    assert.equal(selected.totalCents, subtotal - specialDiscount);
    assert.equal(normal.totalCents, subtotal - normalDiscount);
    assert.equal(selected.lines.reduce((sum, row) => sum + row.appliedDiscountCents, 0), specialDiscount);
    assert.deepEqual(plain(selected.blockingReasons), ['special_discount_less_favorable']);
    assert.deepEqual(plain(normal.blockingReasons), []);
  }
});

test('equal and more favorable specials stay available, including the existing zero-total blocker', () => {
  const individual = product('individual', 1000, { wholesaleEligible: true });
  const engine = harness({ products: [individual] });
  for (const [bps, discount, blockers] of [
    [3500, 7000, []], [5000, 10000, []], [10000, 20000, ['zero_total_persistence_not_authorized']],
  ]) {
    const selected = engine.quote(request([line(individual, 20)], { discount: special(bps) }), admin);
    assert.equal(selected.normalDiscountAvailable.amountCents, 7000);
    assert.equal(selected.specialDiscountApplied.amountCents, discount);
    assert.equal(selected.totalCents, 20000 - discount);
    assert.deepEqual(plain(selected.blockingReasons), blockers);
    assert.equal(selected.persistenceImplemented, false);
  }
});

test('comparison uses rounded cent benefit rather than comparing percentage labels', () => {
  const individual = product('cents', 1, { wholesaleEligible: true });
  const engine = harness({ products: [individual] });
  const less = engine.quote(request([line(individual, 22)], { discount: special(3500) }), admin);
  assert.equal(less.normalDiscountAvailable.amountCents, 8);
  assert.equal(less.specialDiscountApplied.amountCents, 7);
  assert.deepEqual(plain(less.blockingReasons), ['special_discount_less_favorable']);
  const equal = engine.quote(request([line(individual, 22)], { discount: special(3999) }), admin);
  assert.equal(equal.specialDiscountApplied.amountCents, 8);
  assert.deepEqual(plain(equal.blockingReasons), []);
});
