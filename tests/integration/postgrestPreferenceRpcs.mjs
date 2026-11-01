import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const apiUrl = process.env.H7_LOCAL_SUPABASE_URL?.trim();
const anonKey = process.env.H7_LOCAL_ANON_KEY?.trim();
const serviceRoleKey = process.env.H7_LOCAL_SERVICE_ROLE_KEY?.trim();

if (!apiUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Set H7_LOCAL_SUPABASE_URL, H7_LOCAL_ANON_KEY and H7_LOCAL_SERVICE_ROLE_KEY.'
  );
}

const parsedApiUrl = new URL(apiUrl);
if (!['localhost', '127.0.0.1', '::1'].includes(parsedApiUrl.hostname)) {
  throw new Error('H7 PostgREST tests only run against a loopback Supabase URL.');
}

const restUrl = `${parsedApiUrl.origin}/rest/v1`;
const runId = randomUUID();
const references = {
  legacy: `h7-postgrest-legacy-${runId}`,
  versioned: `h7-postgrest-v2-${runId}`,
  claim: `h7-postgrest-claim-${runId}`,
};

async function request(path, { key, method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${restUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  return { response, payload };
}

async function rpc(name, body, key = serviceRoleKey) {
  return request(`/rpc/${name}`, { key, method: 'POST', body });
}

function assertSuccess(result, operation) {
  assert.equal(
    result.response.ok,
    true,
    `${operation} failed with HTTP ${result.response.status}: ${JSON.stringify(result.payload)}`
  );
}

const orderRows = Object.values(references).map((externalReference) => ({
  checkout_attempt_id: randomUUID(),
  external_reference: externalReference,
  currency: 'MXN',
  subtotal_cents: 89900,
  shipping_cents: 0,
  total_cents: 89900,
}));

try {
  const inserted = await request('/orders', {
    key: serviceRoleKey,
    method: 'POST',
    body: orderRows,
    prefer: 'return=minimal',
  });
  assertSuccess(inserted, 'insert isolated orders');

  const oldRpc = await rpc('attach_preference_to_order', {
    p_external_reference: references.legacy,
    p_preference_id: `pref-legacy-${runId}`,
  });
  assertSuccess(oldRpc, 'call deployed RPC');
  assert.equal(oldRpc.payload.length, 1);
  assert.equal(oldRpc.payload[0].mercadopago_preference_expires_at, null);
  assert.equal(oldRpc.payload[0].mercadopago_offline_expires_at, null);
  assert.equal(oldRpc.payload[0].order_purpose, null);

  const versionedRpc = await rpc('attach_preference_to_order_v2', {
    p_external_reference: references.versioned,
    p_preference_id: `pref-v2-${runId}`,
    p_preference_expires_at: '2026-11-01T12:30:00.000Z',
    p_offline_expires_at: '2026-11-04T12:30:00.000Z',
    p_order_purpose: 'commercial',
  });
  assertSuccess(versionedRpc, 'call versioned RPC through refreshed PostgREST cache');
  assert.equal(versionedRpc.payload.length, 1);
  assert.equal(versionedRpc.payload[0].mercadopago_preference_id, `pref-v2-${runId}`);
  assert.equal(versionedRpc.payload[0].order_purpose, 'commercial');

  const anonCases = [
    {
      name: 'attach_preference_to_order',
      body: {
        p_external_reference: references.legacy,
        p_preference_id: 'anon-denied',
      },
    },
    {
      name: 'attach_preference_to_order_v2',
      body: {
        p_external_reference: references.versioned,
        p_preference_id: 'anon-denied',
        p_preference_expires_at: '2026-11-01T12:30:00.000Z',
        p_offline_expires_at: '2026-11-04T12:30:00.000Z',
        p_order_purpose: 'commercial',
      },
    },
    {
      name: 'claim_preference_creation',
      body: { p_external_reference: references.claim },
    },
  ];
  for (const { name, body } of anonCases) {
    const denied = await rpc(name, body, anonKey);
    assert.equal(
      denied.response.ok,
      false,
      `anon unexpectedly executed ${name}`
    );
  }

  const claims = await Promise.all([
    rpc('claim_preference_creation', {
      p_external_reference: references.claim,
    }),
    rpc('claim_preference_creation', {
      p_external_reference: references.claim,
    }),
  ]);
  for (const [index, claim] of claims.entries()) {
    assertSuccess(claim, `concurrent claim ${index + 1}`);
  }
  assert.deepEqual(
    claims.map((claim) => claim.payload.length).sort(),
    [0, 1],
    'exactly one concurrent request must acquire the creation claim'
  );

  process.stdout.write(
    'H7 local PostgREST RPC checks passed: compatibility, v2 cache, permissions and concurrency.\n'
  );
} finally {
  const values = Object.values(references).join(',');
  await request(`/orders?external_reference=in.(${encodeURIComponent(values)})`, {
    key: serviceRoleKey,
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}
