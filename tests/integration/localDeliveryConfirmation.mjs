// Creates its own disposable PostgreSQL. Never accepts an existing DB URL/container.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const image = 'sha256:c141fd17ac6a76c4323e90b3aee8ff1a23d2e89e547c2b963cfadc309c079cc2';
const nonce = randomUUID();
const name = `herbolaria-delivery-qa-${nonce}`;
const label = 'herbolaria.delivery.qa';
let container;
let dockerHost;
const localArgs = (args) => dockerHost ? ['--host', dockerHost, ...args] : args;

function docker(args, input) {
  const result = spawnSync('docker', localArgs(args), {
    cwd: root, encoding: 'utf8', input, timeout: 120_000, maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message ?? result.stderr ?? 'Docker failed');
  }
  return result.stdout.trim();
}

const psqlArgs = () => ['exec', '-i', container, 'psql', '-X', '-qAt', '-h', '/tmp',
  '-U', 'postgres', '-d', 'delivery_qa', '-v', 'ON_ERROR_STOP=1'];
function sql(input) { return docker(psqlArgs(), input); }
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function verifyContainer() {
  const state = JSON.parse(docker(['inspect', container]))[0];
  assert.equal(state.Id, container);
  assert.equal(state.Name, `/${name}`);
  assert.equal(state.Image, image);
  assert.equal(state.Config.Labels[label], nonce);
  assert.equal(state.HostConfig.NetworkMode, 'none');
  assert.equal(state.HostConfig.ReadonlyRootfs, true);
  assert.equal(state.HostConfig.AutoRemove, true);
  assert.ok(!state.HostConfig.Binds?.length);
  assert.equal(Object.keys(state.HostConfig.PortBindings ?? {}).length, 0);
  assert.ok(state.HostConfig.Tmpfs['/tmp']);
  assert.ok(state.Mounts.every((mount) => mount.Type === 'tmpfs'));
  assert.ok(new Date(state.Created).getTime() >= startedAt - 10_000);
  return state;
}

const startedAt = Date.now();
try {
  // Explicit local Docker engine only. No pulls, host mounts, secrets or ports.
  const endpoint = docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}']);
  assert.match(endpoint, /^npipe:\/\/\/\/\.\/pipe\//);
  dockerHost = endpoint;
  docker(['image', 'inspect', image, '--format', '{{.Id}}']);
  container = docker(['run', '-d', '--rm', '--pull=never', '--name', name,
    '--label', `${label}=${nonce}`, '--network=none', '--read-only',
    '--tmpfs', '/tmp:rw,exec,mode=1777', '--user', 'postgres', '--entrypoint', '/bin/sh', image,
    '-c', 'initdb -D /tmp/delivery-pg --auth=trust >/tmp/init.log 2>&1 && exec postgres -D /tmp/delivery-pg -h "" -k /tmp']);
  verifyContainer();
  console.log(`Verified NEW container ${container}; network=none; no ports/mounts; tmpfs; local engine.`);
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    const result = spawnSync('docker', localArgs(['exec', container, 'pg_isready', '-h', '/tmp', '-U', 'postgres']), { encoding: 'utf8' });
    if (result.status === 0) { ready = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error(`New PostgreSQL failed to start: ${docker(['logs', container])}`);
  // Identity and isolation verified above BEFORE the first SQL statement.
  docker(['exec', '-i', container, 'psql', '-X', '-q', '-h', '/tmp', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    'CREATE DATABASE delivery_qa;');
  assert.equal(sql("SELECT current_database() || ':' || current_setting('listen_addresses');"), 'delivery_qa:');
  sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO service_role;');
  for (const file of readdirSync(new URL('../../supabase/migrations/', import.meta.url)).filter((file) => /^00[1-9]_|^010_/.test(file)).sort()) {
    sql(read(`supabase/migrations/${file}`));
  }
  sql(`CREATE SCHEMA delivery_qa;
    INSERT INTO public.orders(id, checkout_attempt_id, external_reference, status,
      subtotal_cents, shipping_cents, total_cents, fulfillment_status,
      shipping_carrier, tracking_number, tracking_url, shipped_at,
      customer_email, customer_name, customer_phone, whatsapp_notifications_opt_in, whatsapp_opt_in_at,
      mercadopago_payment_id)
    SELECT ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, gen_random_uuid(),
      'delivery-qa-' || n, CASE WHEN n=3 THEN 'rejected' ELSE 'approved' END,
      100, 0, 100, CASE WHEN n IN (1,2,6) THEN 'pending' ELSE 'shipped' END,
      CASE WHEN n NOT IN (1,2,6) THEN 'Synthetic Courier' END,
      CASE WHEN n NOT IN (1,2,6) THEN 'SYNTHETIC-GUIDE' END,
      CASE WHEN n NOT IN (1,2,6) THEN 'https://tracking.invalid/synthetic' END,
      CASE WHEN n NOT IN (1,2,6) THEN '2026-01-01T12:00:00Z'::timestamptz END,
      'synthetic@example.invalid', 'Synthetic Customer', CASE WHEN n<>8 THEN '5500000000' END,
      n<>7, CASE WHEN n<>7 THEN '2026-01-01T11:00:00Z'::timestamptz END,
      'synthetic-payment-' || n
    FROM generate_series(1,8) n;
    INSERT INTO public.order_notifications(order_id,notification_type,status,attempts,last_error)
      VALUES('${id(5)}','customer_order_shipped_email','failed',1,'synthetic_error');
    CREATE TABLE delivery_qa.historical AS SELECT id, to_jsonb(o) AS original FROM public.orders o;
    CREATE TABLE delivery_qa.notifications_before AS SELECT * FROM public.order_notifications;`);
  const migration = read('supabase/migrations/011_order_delivery_confirmation.sql');
  // Deliberate error before COMMIT must roll back the schema, RPCs and trigger.
  assert.throws(() => sql(migration.replace(/commit;\s*$/i, 'select 1/0;\ncommit;')), /division by zero/);
  assert.equal(sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='delivered_at';"), '0');
  assert.equal(sql("SELECT to_regprocedure('public.mark_order_delivered(uuid)') IS NULL;"), 't');
  assert.equal(sql("SELECT position('invalid_fulfillment_transition' in pg_get_functiondef('public.prevent_order_fulfillment_reversal()'::regprocedure))=0;"), 't');
  console.log('PASS: failure before COMMIT rolls back columns, RPC and trigger replacement.');
  sql(migration);
  console.log(sql(read('supabase/tests/database/order_delivery_confirmation_test.sql')).split('\n').filter((line) => line.startsWith('PASS:')).join('\n'));

  // Two real sessions. A holds the row lock after confirming; B must wait for A.
  const sessionA = spawn('docker', localArgs(psqlArgs()), { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
  let outputA = '';
  let errorsA = '';
  sessionA.stdout.on('data', (data) => { outputA += data; });
  sessionA.stderr.on('data', (data) => { errorsA += data; });
  const exitedA = new Promise((resolve) => sessionA.on('close', resolve));
  sessionA.stdin.write(`BEGIN; SET LOCAL ROLE service_role; SELECT delivered_at::text FROM public.mark_order_delivered('${id(4)}');\n\\echo A_LOCK_HELD\n`);
  try {
    for (let attempt = 0; !outputA.includes('A_LOCK_HELD'); attempt++) {
      if (attempt > 100 || sessionA.exitCode !== null) throw new Error(`Session A failed: ${errorsA}`);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const sessionB = spawn('docker', localArgs(psqlArgs()), { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
    let outputB = '';
    let errorsB = '';
    sessionB.stdout.on('data', (data) => { outputB += data; });
    sessionB.stderr.on('data', (data) => { errorsB += data; });
    const exitedB = new Promise((resolve) => sessionB.on('close', resolve));
    sessionB.stdin.end(`SET application_name='delivery_qa_session_b'; SET statement_timeout='10s'; SET ROLE service_role; SELECT delivered_at::text FROM public.mark_order_delivered('${id(4)}');`);
    let blocked = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      blocked = sql("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='delivery_qa_session_b' AND wait_event_type='Lock');") === 't';
      if (blocked) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(blocked, true, 'B must actually wait for the row lock');
    sessionA.stdin.end('COMMIT;\n');
    assert.equal(await exitedA, 0, errorsA);
    assert.equal(await exitedB, 0, errorsB);
    assert.equal(outputA.split('\n').find((line) => /^\d{4}-/.test(line)), outputB.trim());
    sql(`SELECT delivery_qa.assert((SELECT fulfillment_status='delivered' AND shipping_carrier='Synthetic Courier' AND tracking_number='SYNTHETIC-GUIDE' FROM public.orders WHERE id='${id(4)}'), 'concurrent shipment preserved');`);
    console.log('PASS: two real concurrent sessions, verified lock wait, identical delivered_at and preserved shipment.');
  } finally {
    if (sessionA.exitCode === null) sessionA.stdin.end('ROLLBACK;\n');
  }
} finally {
  if (container) {
    verifyContainer();
    docker(['stop', '-t', '2', container]);
    console.log('Disposable container stopped and removed; tmpfs discarded.');
  }
}
