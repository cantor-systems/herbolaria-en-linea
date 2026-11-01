import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CheckoutPreferenceExpiredError,
  CheckoutPreferenceProviderError,
  CheckoutPreferenceRecoveryConflictError,
  CheckoutPreferenceRecoveryPendingError,
  resolveCheckoutPreference,
  validatePreference,
  type CheckoutPreferenceSnapshot,
  type PreferenceFailureCode,
  type PreferencePersistence,
  type PreferenceProvider,
  type ProviderPreference,
} from '../../src/lib/mercadopago/preferenceLifecycle.ts';

const snapshot: CheckoutPreferenceSnapshot = {
  externalReference: 'order_11111111-1111-4111-8111-111111111111',
  currency: 'MXN',
  totalCents: 89900,
  items: [
    {
      id: 'var-gotas-3',
      title: 'Moronel Gotas - 3 Frascos',
      quantity: 1,
      unit_price: 849,
      currency_id: 'MXN',
    },
  ],
  shippingCents: 5000,
  validFrom: '2026-11-01T12:00:00.000Z',
  expiresAt: '2026-11-01T12:30:00.000Z',
  offlineExpiresAt: '2026-11-04T12:30:00.000Z',
};

function preference(overrides: Partial<ProviderPreference> = {}): ProviderPreference {
  return {
    id: 'preference-1',
    external_reference: snapshot.externalReference,
    items: snapshot.items,
    shipments: { cost: 50 },
    metadata: {
      order_id: snapshot.externalReference,
      expected_total_cents: snapshot.totalCents,
    },
    expires: true,
    expiration_date_from: snapshot.validFrom,
    expiration_date_to: snapshot.expiresAt,
    date_of_expiration: snapshot.offlineExpiresAt,
    init_point: 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=1',
    ...overrides,
  };
}

function persistence(overrides: Partial<PreferencePersistence> = {}) {
  const failures: PreferenceFailureCode[] = [];
  return {
    failures,
    value: {
      claimCreation: async () => true,
      attach: async () => true,
      recordFailure: async (code: PreferenceFailureCode) => {
        failures.push(code);
      },
      ...overrides,
    } satisfies PreferencePersistence,
  };
}

function provider(overrides: Partial<PreferenceProvider> = {}): PreferenceProvider {
  return {
    create: async () => preference(),
    get: async () => preference(),
    searchByExternalReference: async () => ({
      total: 1,
      elements: [{ id: 'preference-1' }],
    }),
    ...overrides,
  };
}

test('validates price, currency, items, reference, metadata and expiration dates', () => {
  assert.deepEqual(validatePreference(preference(), snapshot), {
    valid: true,
    issues: [],
  });

  const invalidCases: ProviderPreference[] = [
    preference({ external_reference: 'other-order' }),
    preference({ metadata: { order_id: snapshot.externalReference, expected_total_cents: 1000 } }),
    preference({ items: [{ ...snapshot.items[0], currency_id: 'USD' }] }),
    preference({ items: [{ ...snapshot.items[0], unit_price: 10 }] }),
    preference({ items: [{ ...snapshot.items[0], id: 'another-variant' }] }),
    preference({ expiration_date_to: '2026-11-01T12:31:00.000Z' }),
    preference({ date_of_expiration: '2026-11-04T12:31:00.000Z' }),
  ];

  for (const candidate of invalidCases) {
    assert.equal(validatePreference(candidate, snapshot).valid, false);
  }

  assert.equal(
    validatePreference(
      preference({
        items: [{ ...snapshot.items[0], id: undefined, unit_price: '849.00' }],
      }),
      snapshot
    ).valid,
    true
  );
});

test('accepts a normalized create response before durable association', async () => {
  let attached = false;
  const normalizedCreateResponse = preference({
    external_reference: undefined,
    metadata: undefined,
    items: undefined,
    shipments: undefined,
    expires: undefined,
    expiration_date_from: undefined,
    expiration_date_to: undefined,
    date_of_expiration: undefined,
  });
  const store = persistence({
    attach: async () => {
      attached = true;
      return true;
    },
  });

  const result = await resolveCheckoutPreference({
    action: 'create',
    preferenceId: null,
    preferenceErrorCode: null,
    expected: snapshot,
    provider: provider({ create: async () => normalizedCreateResponse }),
    persistence: store.value,
    now: () => new Date('2026-11-01T12:10:00.000Z'),
  });

  assert.equal(attached, true);
  assert.equal(result.preferenceId, 'preference-1');
});

test('recovers a created preference after persistence fails without creating twice', async () => {
  let creates = 0;
  const firstPersistence = persistence({
    attach: async () => {
      throw new Error('supabase_unavailable');
    },
  });
  const sharedProvider = provider({
    create: async () => {
      creates += 1;
      return preference();
    },
  });

  await assert.rejects(
    resolveCheckoutPreference({
      action: 'create',
      preferenceId: null,
      preferenceErrorCode: null,
      expected: snapshot,
      provider: sharedProvider,
      persistence: firstPersistence.value,
      now: () => new Date('2026-11-01T12:10:00.000Z'),
    }),
    CheckoutPreferenceRecoveryPendingError
  );
  assert.deepEqual(firstPersistence.failures, ['preference_persistence_failed']);

  const retryPersistence = persistence();
  const recovered = await resolveCheckoutPreference({
    action: 'create',
    preferenceId: null,
    preferenceErrorCode: 'preference_persistence_failed',
    expected: snapshot,
    provider: sharedProvider,
    persistence: retryPersistence.value,
    now: () => new Date('2026-11-01T12:11:00.000Z'),
  });

  assert.equal(creates, 1);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.preferenceId, 'preference-1');
});

test('treats an empty search and total zero as inconclusive', async () => {
  let creates = 0;
  const store = persistence();
  await assert.rejects(
    resolveCheckoutPreference({
      action: 'create',
      preferenceId: null,
      preferenceErrorCode: 'preference_outcome_unknown',
      expected: snapshot,
      provider: provider({
        create: async () => {
          creates += 1;
          return preference();
        },
        searchByExternalReference: async () => ({ total: 0, elements: [] }),
      }),
      persistence: store.value,
    }),
    CheckoutPreferenceRecoveryPendingError
  );
  assert.equal(creates, 0);
  assert.deepEqual(store.failures, ['preference_recovery_failed']);
});

test('classifies 401 invalid_caller_id as a definitive provider failure', async () => {
  const store = persistence();
  const error = Object.assign(new Error('invalid caller'), {
    status: 401,
    error: 'invalid_caller_id',
  });

  await assert.rejects(
    resolveCheckoutPreference({
      action: 'create',
      preferenceId: null,
      preferenceErrorCode: null,
      expected: snapshot,
      provider: provider({ create: async () => Promise.reject(error) }),
      persistence: store.value,
    }),
    (caught: unknown) =>
      caught instanceof CheckoutPreferenceProviderError &&
      caught.providerCode === 'invalid_caller_id'
  );
  assert.deepEqual(store.failures, ['preference_provider_failed']);
});

test('keeps recovery closed when search returns 401 invalid_caller_id', async () => {
  let creates = 0;
  const store = persistence();
  const error = Object.assign(new Error('invalid caller'), {
    status: 401,
    error: 'invalid_caller_id',
  });

  await assert.rejects(
    resolveCheckoutPreference({
      action: 'create',
      preferenceId: null,
      preferenceErrorCode: 'preference_outcome_unknown',
      expected: snapshot,
      provider: provider({
        create: async () => {
          creates += 1;
          return preference();
        },
        searchByExternalReference: async () => Promise.reject(error),
      }),
      persistence: store.value,
    }),
    (caught: unknown) =>
      caught instanceof CheckoutPreferenceProviderError &&
      caught.providerCode === 'invalid_caller_id'
  );
  assert.equal(creates, 0);
  assert.deepEqual(store.failures, ['preference_recovery_failed']);
});

test('allows only one concurrent request to create a provider preference', async () => {
  let claimed = false;
  let creates = 0;
  const store = persistence({
    claimCreation: async () => {
      if (claimed) return false;
      claimed = true;
      return true;
    },
  });
  const sharedProvider = provider({
    create: async () => {
      creates += 1;
      await Promise.resolve();
      return preference();
    },
  });
  const request = () =>
    resolveCheckoutPreference({
      action: 'create' as const,
      preferenceId: null,
      preferenceErrorCode: null,
      expected: snapshot,
      provider: sharedProvider,
      persistence: store.value,
      now: () => new Date('2026-11-01T12:10:00.000Z'),
    });

  const results = await Promise.allSettled([request(), request()]);
  assert.equal(creates, 1);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.ok(rejected && rejected.status === 'rejected');
  assert.ok(rejected.reason instanceof CheckoutPreferenceRecoveryPendingError);
});

test('keeps the association but withholds a URL after crossing the 30-minute boundary', async () => {
  let attached = false;
  const store = persistence({
    attach: async () => {
      attached = true;
      return true;
    },
  });

  await assert.rejects(
    resolveCheckoutPreference({
      action: 'create',
      preferenceId: null,
      preferenceErrorCode: null,
      expected: snapshot,
      provider: provider(),
      persistence: store.value,
      now: () => new Date(snapshot.expiresAt),
    }),
    CheckoutPreferenceExpiredError
  );
  assert.equal(attached, true);
});

test('does not apply the new expiration policy to historical null-date preferences', async () => {
  const legacy = preference({
    metadata: undefined,
    expires: undefined,
    expiration_date_from: undefined,
    expiration_date_to: undefined,
    date_of_expiration: undefined,
    items: undefined,
    shipments: undefined,
  });
  const result = await resolveCheckoutPreference({
    action: 'reuse_legacy',
    preferenceId: 'preference-1',
    preferenceErrorCode: null,
    expected: snapshot,
    provider: provider({ get: async () => legacy }),
    persistence: persistence().value,
    now: () => new Date('2030-01-01T00:00:00.000Z'),
  });

  assert.equal(result.preferenceId, 'preference-1');
});

test('never attaches a recovered preference that differs from the durable order', async () => {
  let attached = false;
  const store = persistence({
    attach: async () => {
      attached = true;
      return true;
    },
  });
  await assert.rejects(
    resolveCheckoutPreference({
      action: 'create',
      preferenceId: null,
      preferenceErrorCode: 'preference_outcome_unknown',
      expected: snapshot,
      provider: provider({
        get: async () => preference({ items: [{ ...snapshot.items[0], unit_price: 10 }] }),
      }),
      persistence: store.value,
    }),
    CheckoutPreferenceRecoveryConflictError
  );
  assert.equal(attached, false);
  assert.deepEqual(store.failures, ['preference_recovery_conflict']);
});
