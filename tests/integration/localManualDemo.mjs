// Own loopback Next.js processes only. No destination arguments, env files or provider credentials.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { harness } from '../manual-orders/helpers.mjs';

assert.equal(process.argv.length, 2, 'No external destinations accepted');
const root = fileURLToPath(new URL('../../', import.meta.url));
assert.ok(existsSync(new URL('../../.next/BUILD_ID', import.meta.url)), 'Build first using a clean environment');
assert.deepEqual(readdirSync(root).filter(n => /^\.env(?:\.|$)/.test(n) && n !== '.env.example'), [], 'Refuse env files without reading them');
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC|PATHEXT|VOLTA_HOME)$/i.test(k)));
const password = 'HERB-SYS-001F-SYNTHETIC-LOCAL-ONLY'; // Disposable fixture, not a real credential.
const children = [];
const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function hiddenFields(html) {
  const f = new FormData();
  for (const input of html.matchAll(/<input\b[^>]*>/g)) {
    const attrs = Object.fromEntries([...input[0].matchAll(/([\w$:-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
    if (attrs.type === 'hidden' && attrs.name) f.append(attrs.name, attrs.value ?? '');
  }
  return f;
}
async function start(extra = {}) {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [fileURLToPath(new URL('../../node_modules/next/dist/bin/next', import.meta.url)), 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: root, env: { ...safeEnv, NEXT_TELEMETRY_DISABLED: '1', DISPATCH_ADMIN_PASSWORD: password, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  let logs = ''; child.stdout.on('data', b => logs += b); child.stderr.on('data', b => logs += b);
  for (let i = 0; i < 180; i++) {
    if (child.exitCode !== null) throw new Error('Own local server exited before readiness');
    if (logs.includes('Ready in')) return { url, child };
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Own local server did not become ready');
}
async function request(server, path, options = {}) {
  assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.ok(path.startsWith('/') && !path.startsWith('//'));
  return fetch(server.url + path, { ...options, redirect: 'manual' });
}
const pass = message => console.log(`PASS ${message}`);
try {
  const enabled = await start({ MANUAL_ORDERS_DEMO_ENABLED: 'true' });
  for (const route of ['/operaciones/pedidos', '/operaciones/pedidos/nuevo', '/operaciones/pedidos/demo-whatsapp-001']) {
    const r = await request(enabled, route); assert.equal(r.status, 307); assert.equal(r.headers.get('location'), '/operaciones/login');
    assert.doesNotMatch(await r.text(), /cliente-1@example\.invalid|Calle sintética 123/);
  }
  pass('every private route rejects a missing real session cookie');
  const login = await request(enabled, '/operaciones/login'); const loginForm = hiddenFields(await login.text());
  assert.ok([...loginForm.keys()].some(k => k.startsWith('$ACTION_ID_'))); loginForm.set('password', password);
  const signedIn = await request(enabled, '/operaciones/login', { method: 'POST', headers: { Origin: enabled.url }, body: loginForm });
  assert.equal(signedIn.status, 303); const cookie = signedIn.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie?.startsWith('herbolaria_dispatch_session='));
  const headers = { Cookie: cookie };
  const listing = await request(enabled, '/operaciones/pedidos', { headers }); assert.equal(listing.status, 200); const listingHtml = await listing.text();
  assert.match(listingHtml, /DEMO-001/); assert.match(listingHtml, /DEMO-004/); assert.match(listingHtml, /online_checkout/); assert.match(listing.headers.get('cache-control'), /no-store|private/);
  const filtered = await request(enabled, '/operaciones/pedidos?channel=phone', { headers }); const filteredHtml = await filtered.text(); assert.match(filteredHtml, /DEMO-002/); assert.doesNotMatch(filteredHtml, /href="\/operaciones\/pedidos\/demo-online-003"/);
  const detail = await request(enabled, '/operaciones/pedidos/demo-whatsapp-001', { headers }); assert.equal(detail.status, 200); assert.match(await detail.text(), /Historial ilustrativo/);
  assert.equal((await request(enabled, '/operaciones/pedidos/not-a-fixture', { headers })).status, 404);
  pass('authenticated listing, memory filters, synthetic detail and unknown-ID rejection');
  const newPage = await request(enabled, '/operaciones/pedidos/nuevo', { headers }); assert.equal(newPage.status, 200); const html = await newPage.text();
  assert.match(html, /Captura disponible después de habilitar el módulo/); assert.match(html, /name="channel"[^>]*>[\s\S]*value="whatsapp" selected/);
  const engine = harness(); const product = engine.manualCatalog.listManualCatalog().find(p => p.variants.some(v => v.selectable && v.eligibility.eligibility === 'eligible'));
  const variant = product.variants.find(v => v.selectable && v.eligibility.eligibility === 'eligible');
  const input = hiddenFields(html);
  for (const [key, value] of Object.entries({ revision: '0', channel: 'whatsapp', customerName: 'Cliente DEMO HTTP', customerEmail: 'demo@example.invalid', customerPhone: '5500000000', relationship: 'customer', frequency: 'new', segment: 'retail',
    streetAddress: 'Calle sintética 123', colonia: 'Colonia sintética', city: 'Ciudad sintética', state: 'Estado sintético', postalCode: '00000', shippingMethod: 'standard', discountMode: 'normal',
    items: JSON.stringify([{ productId: product.productId, variantId: variant.variantId, packageQuantity: 1 }]) })) input.set(key, value);
  const noSession = await request(enabled, '/operaciones/pedidos/nuevo', { method: 'POST', headers: { Origin: enabled.url }, body: input });
  assert.equal(noSession.status, 303); assert.equal(noSession.headers.get('location'), '/operaciones/login');
  const quoted = await request(enabled, '/operaciones/pedidos/nuevo', { method: 'POST', headers: { ...headers, Origin: enabled.url }, body: input });
  assert.equal(quoted.status, 200); const quoteHtml = await quoted.text(); assert.match(quoteHtml, /Alternativa normal/); assert.match(quoteHtml, /Resumen calculado/);
  assert.match(quoteHtml, /<button[^>]*type="button"[^>]*disabled=""[^>]*>Captura disponible después de habilitar el módulo/);
  pass('actual quote-only Server Action requires session and returns calculated summary with creation disabled');
  input.set('postalCode', 'bad');
  const invalid = await request(enabled, '/operaciones/pedidos/nuevo', { method: 'POST', headers: { ...headers, Origin: enabled.url }, body: input });
  assert.match(await invalid.text(), /El código postal debe tener cinco dígitos/);
  pass('actual action returns associated address validation');
  const disabled = await start();
  assert.equal((await request(disabled, '/operaciones/pedidos', { headers })).status, 404);
  assert.equal((await request(disabled, '/operaciones/pedidos/nuevo', { method: 'POST', headers: { ...headers, Origin: disabled.url }, body: input })).status, 404);
  const production = await start({ MANUAL_ORDERS_DEMO_ENABLED: 'true', VERCEL_ENV: 'production' });
  assert.equal((await request(production, '/operaciones/pedidos/nuevo', { headers })).status, 404);
  assert.equal((await request(production, '/operaciones/pedidos/nuevo', { method: 'POST', headers: { ...headers, Origin: production.url }, body: input })).status, 404);
  pass('default-off and Vercel Production guard reject a valid synthetic admin session');
  const publicPage = await request(enabled, '/'); assert.doesNotMatch(await publicPage.text(), /cliente-1@example\.invalid|Cliente DEMO HTTP|DEMO-001/);
  pass('public Home exposes no private fixtures');
  console.log('ALL LOCAL MANUAL DEMO HTTP CHECKS PASSED; no Supabase/provider configuration or calls.');
} finally {
  for (const child of children) {
    if (child.exitCode === null) { const closed = new Promise(resolve => child.once('exit', resolve)); child.kill(); await closed; }
  }
  console.log('Own loopback QA processes stopped.');
}
