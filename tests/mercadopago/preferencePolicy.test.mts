import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPreferenceExpirationPolicy,
  decidePreferenceAction,
} from '../../src/lib/mercadopago/preferencePolicy.ts';

const ORDER_CREATED_AT = '2026-11-01T12:00:00.000Z';

test('builds deterministic 30-minute and three-day expiration windows', () => {
  const first = createPreferenceExpirationPolicy(ORDER_CREATED_AT);
  const retry = createPreferenceExpirationPolicy(ORDER_CREATED_AT);

  assert.deepEqual(retry, first);
  assert.deepEqual(first, {
    validFrom: ORDER_CREATED_AT,
    expiresAt: '2026-11-01T12:30:00.000Z',
    offlinePaymentExpiresAt: '2026-11-04T12:30:00.000Z',
  });
});

test('creates a preference only while its prospective window is active', () => {
  assert.equal(
    decidePreferenceAction({
      preferenceId: null,
      storedExpiresAt: null,
      prospectiveExpiresAt: '2026-11-01T12:30:00.000Z',
      now: new Date('2026-11-01T12:29:59.999Z'),
    }),
    'create'
  );
  assert.equal(
    decidePreferenceAction({
      preferenceId: null,
      storedExpiresAt: null,
      prospectiveExpiresAt: '2026-11-01T12:30:00.000Z',
      now: new Date('2026-11-01T12:30:00.000Z'),
    }),
    'expired'
  );
});

test('reuses active preferences and expires them exactly at the boundary', () => {
  assert.equal(
    decidePreferenceAction({
      preferenceId: 'preference-1',
      storedExpiresAt: '2026-11-01T12:30:00.000Z',
      prospectiveExpiresAt: '2026-11-01T12:30:00.000Z',
      now: new Date('2026-11-01T12:29:59.999Z'),
    }),
    'reuse_active'
  );
  assert.equal(
    decidePreferenceAction({
      preferenceId: 'preference-1',
      storedExpiresAt: '2026-11-01T12:30:00.000Z',
      prospectiveExpiresAt: '2026-11-01T12:30:00.000Z',
      now: new Date('2026-11-01T12:30:00.000Z'),
    }),
    'expired'
  );
});

test('keeps historical preferences with null expiration as legacy', () => {
  assert.equal(
    decidePreferenceAction({
      preferenceId: 'historical-preference',
      storedExpiresAt: null,
      prospectiveExpiresAt: '2020-01-01T00:30:00.000Z',
      now: new Date('2026-11-01T12:00:00.000Z'),
    }),
    'reuse_legacy'
  );
});

test('rejects invalid timestamps instead of silently reusing a preference', () => {
  assert.throws(
    () =>
      decidePreferenceAction({
        preferenceId: 'preference-1',
        storedExpiresAt: 'not-a-date',
        prospectiveExpiresAt: '2026-11-01T12:30:00.000Z',
      }),
    /invalid_preference_policy_date/
  );
});
