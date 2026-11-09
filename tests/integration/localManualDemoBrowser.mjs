// Real DOM regression, using an already installed Playwright/Chromium only.
// Own disposable loopback server/profile; never accepts a server URL or credentials.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

assert.equal(process.argv.length, 2, 'No destination arguments accepted');
const require = createRequire(import.meta.url);
const modulePath = process.env.HERB_DEMO_PLAYWRIGHT_MODULE;
const executablePath = process.env.HERB_DEMO_CHROMIUM_EXECUTABLE;
if (modulePath) assert.ok(isAbsolute(modulePath) && existsSync(modulePath), 'Use an existing local Playwright package');
if (executablePath) assert.ok(isAbsolute(executablePath) && existsSync(executablePath), 'Use an existing local Chromium executable');
const { chromium } = require(modulePath || 'playwright'); // No npx, install or browser download.
const root = fileURLToPath(new URL('../../', import.meta.url));
assert.deepEqual(readdirSync(root).filter(n => /^\.env(?:\.|$)/.test(n) && n !== '.env.example'), [], 'Refuse env files without opening them');
assert.ok(existsSync(join(root, '.next/BUILD_ID')), 'Run a fresh build first');
const output = mkdtempSync(join(tmpdir(), 'herb-manual-demo-browser-'));
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC|PATHEXT|VOLTA_HOME|PROGRAMFILES|PROGRAMFILES\(X86\))$/i.test(k)));
const report = { checks: [], captures: [], mutations: [], blocked: [], expectedBlockedResourceErrors: [], unexpectedResourceFailures: [], pageErrors: [], consoleErrors: [] };
let server, browser;
const pass = (name, evidence) => { report.checks.push({ name, evidence }); console.log(`PASS ${name}`); };
const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
try {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  report.origin = origin;
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root, env: { ...safeEnv, NEXT_TELEMETRY_DISABLED: '1', MANUAL_ORDERS_DEMO_ENABLED: 'true', DISPATCH_ADMIN_PASSWORD: 'HERB-SYS-001F-SYNTHETIC-LOCAL-ONLY' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let ready = false;
  server.stdout.on('data', b => { if (String(b).includes('Ready in')) ready = true; });
  server.stderr.on('data', () => {}); // Never echo application payloads or credentials.
  for (let i = 0; !ready && i < 180; i++) {
    assert.equal(server.exitCode, null, 'Own local server must remain running');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Own local server ready');
  const login = await fetch(`${origin}/operaciones/login`, { redirect: 'manual' });
  assert.equal(login.status, 200);
  const html = await login.text(), data = new FormData();
  for (const input of html.matchAll(/<input\b[^>]*>/g)) {
    const attrs = Object.fromEntries([...input[0].matchAll(/([\w$:-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
    if (attrs.type === 'hidden' && attrs.name) data.append(attrs.name, attrs.value ?? '');
  }
  data.set('password', 'HERB-SYS-001F-SYNTHETIC-LOCAL-ONLY');
  const signed = await fetch(`${origin}/operaciones/login`, { method: 'POST', headers: { Origin: origin }, body: data, redirect: 'manual' });
  assert.equal(signed.status, 303);
  const cookie = signed.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie?.startsWith('herbolaria_dispatch_session='));
  browser = await chromium.launch({ headless: true, executablePath, env: safeEnv, args: [
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',
  ] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1, locale: 'es-MX', serviceWorkers: 'block' });
  context.setDefaultTimeout(15_000);
  context.setDefaultNavigationTimeout(30_000);
  const blockedUrls = new Set();
  await context.addCookies([{ name: cookie.split('=')[0], value: cookie.slice(cookie.indexOf('=') + 1), url: origin, httpOnly: true, sameSite: 'Strict' }]);
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    const permitted = url.origin === origin && (
      (request.method() === 'GET' && (url.pathname.startsWith('/operaciones/pedidos') || url.pathname.startsWith('/_next/') || url.pathname.startsWith('/images/') || url.pathname === '/favicon.ico')) ||
      (request.method() === 'POST' && url.pathname === '/operaciones/pedidos/nuevo')
    );
    if (!permitted) {
      blockedUrls.add(request.url());
      report.blocked.push({ method: request.method(), path: url.pathname, external: url.origin !== origin });
      return route.abort();
    }
    if (request.method() !== 'GET') report.mutations.push({ method: request.method(), path: url.pathname });
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.pageErrors.push(e.message));
  page.on('requestfailed', request => {
    if (!blockedUrls.has(request.url()) && request.failure()?.errorText !== 'net::ERR_ABORTED') {
      report.unexpectedResourceFailures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText });
    }
  });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    // The production router prefetches public links. Keep those requests blocked,
    // but distinguish their exact resource errors from actual application errors.
    if (m.text() === 'Failed to load resource: net::ERR_FAILED' && blockedUrls.has(m.location().url)) {
      report.expectedBlockedResourceErrors.push({ path: new URL(m.location().url).pathname });
    } else report.consoleErrors.push({ message: m.text(), path: m.location().url ? new URL(m.location().url).pathname : null });
  });
  const creation = () => page.getByRole('button', { name: 'Captura disponible después de habilitar el módulo', exact: true });
  const review = () => page.getByRole('checkbox', { name: 'Revisé los datos ficticios, presentaciones, envío y total de este resumen.', exact: true });
  const draftForm = () => page.locator('form').filter({ has: page.locator('#items') });
  async function fresh() {
    await page.goto(`${origin}/operaciones/pedidos/nuevo`);
    await page.getByRole('heading', { name: 'Nuevo pedido manual', exact: true }).waitFor();
    await page.waitForLoadState('networkidle');
    assert.equal(await creation().isDisabled(), true);
    assert.equal(await review().isChecked(), false);
  }
  async function addFirst() { await page.getByRole('button', { name: 'Añadir presentación', exact: true }).first().click(); }
  async function submit() {
    const response = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/operaciones/pedidos/nuevo');
    await page.getByRole('button', { name: 'Calcular resumen demo', exact: true }).click();
    const accepted = await response; assert.equal(accepted.status(), 200);
    // Wait for React's completed action UI, not the lifetime of its RSC stream.
    await page.getByRole('button', { name: 'Calcular resumen demo', exact: true }).waitFor();
    assert.equal(await creation().isDisabled(), true);
  }
  async function quote() { await submit(); await page.getByText('Resumen calculado en servidor. Revisa los importes y posibles bloqueos.', { exact: true }).waitFor(); }
  async function amount(label) { return (await page.locator('aside dl > div').filter({ has: page.locator('dt').filter({ hasText: new RegExp(`^${label}$`) }) }).locator('dd').innerText()).replace(/\s/g, ''); }
  async function controls() {
    return draftForm().evaluate(form => [...form.querySelectorAll('input,select,textarea')].filter(e => e.type !== 'hidden').map(e => ({ id: e.id, value: e.value, checked: e.type === 'checkbox' ? e.checked : undefined, disabled: e.disabled })));
  }
  async function repeat(total) {
    const before = await controls(), summary = await page.locator('aside').innerText();
    await quote();
    assert.deepEqual(await controls(), before, 'DOM controls must survive a second quote unchanged');
    assert.equal(await page.locator('aside').innerText(), summary, 'Total, alternatives and line breakdown must match');
    assert.equal(await amount('Total MXN'), total);
  }
  async function capture(name) {
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 950 });
      await page.evaluate(() => document.fonts.ready);
      const filename = join(output, `${name}-${width}.png`);
      await page.screenshot({ path: filename, fullPage: true, animations: 'disabled' });
      const dimensions = await page.evaluate(() => {
        const shell = document.querySelector('section:has(nav[aria-label="Pedidos de demostración"])');
        return { viewport: innerWidth, body: document.body.scrollWidth, demoRight: shell.getBoundingClientRect().right,
          demoOverflow: [...shell.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1; }).length };
      });
      assert.equal(dimensions.demoOverflow, 0, 'No demo content may overflow its viewport');
      report.captures.push({ name, width, filename, dimensions });
    }
    await page.setViewportSize({ width: 1440, height: 950 });
  }

  await fresh(); await addFirst();
  await page.locator('#channel').selectOption('phone');
  await page.locator('#customerName').fill('Cliente DEMO de regresión');
  await page.locator('#customerPhone').fill('5500000042');
  await page.locator('#customerEmail').fill('demo-sync@example.invalid');
  await page.locator('#streetAddress').fill('Calle DEMO de regresión 42');
  await page.locator('#frequency').selectOption('frequent');
  await page.locator('#segment').selectOption('wholesale');
  await page.locator('#discountMode').selectOption('special_percentage');
  await page.locator('#discountPercent').fill('50');
  await page.locator('#discountReason').fill('Descuento DEMO para comprobar sincronización.');
  await page.evaluate(() => {
    window.demoResets = []; window.demoSelect = document.querySelector('#discountMode');
    document.querySelector('form:has(#items)').addEventListener('reset', event => queueMicrotask(() => window.demoResets.push({ prevented: event.defaultPrevented })));
  });
  const intended = await controls(); await quote();
  // Only the review becomes enabled; every editable field must retain its intent.
  assert.deepEqual((await controls()).filter(e => e.id), intended.filter(e => e.id));
  assert.equal(await amount('Total MXN'), '$264.00');
  assert.deepEqual(await page.evaluate(() => ({ sameNode: window.demoSelect === document.querySelector('#discountMode'), prevented: window.demoResets.every(e => e.prevented), resets: window.demoResets.length })), { sameNode: true, prevented: true, resets: 1 });
  await page.getByText('Desglose calculado por presentación', { exact: true }).click();
  await repeat('$264.00');
  pass('50% special, customer/channel/classification/address persist; second quote stays $264 with identical breakdown');
  await capture('descuento-sincronizado');
  await review().check(); assert.equal(await creation().isDisabled(), true);
  await page.locator('#quantity-1').fill('2');
  await page.getByText('Los datos cambiaron. Vuelve a calcular el resumen.', { exact: true }).waitFor();
  assert.equal(await page.locator('aside dl').count(), 0); assert.equal(await review().isChecked(), false);
  await quote(); assert.equal(await amount('Total MXN'), '$429.00'); await repeat('$429.00');
  pass('quantity edit invalidates summary/review, retains identity and recalculates twice identically');

  await page.locator('#shippingMethod').selectOption('express'); await quote();
  assert.equal(await page.locator('#shippingMethod').inputValue(), 'express');
  assert.equal(await page.locator('#courtesy').isDisabled(), true);
  await repeat('$516.00');
  pass('express remains selected, courtesy disabled and two totals agree');
  await page.locator('#shippingMethod').selectOption('standard');
  await page.locator('#quantity-1').fill('1'); await page.locator('#courtesy').check();
  await page.locator('#courtesyReason').fill('Cortesía DEMO para validar sincronización.');
  await quote(); assert.equal(await page.locator('#courtesy').isChecked(), true);
  assert.equal(await amount('Cortesía aplicada'), '−$99.00'); await repeat('$165.00');
  pass('courtesy and both reasons persist, no second-quote drift'); await capture('cortesia-sincronizada');

  await fresh();
  const picker = page.getByRole('combobox', { name: 'Presentación de Moronel Extracto Concentrado en Gotas (50 ml)', exact: true });
  await picker.selectOption({ index: 1 }); const promotion = await picker.inputValue(); await addFirst();
  await page.locator('#quantity-1').fill('2'); await quote();
  assert.equal(await picker.inputValue(), promotion); assert.equal(await page.locator('#variant-1').inputValue(), promotion);
  assert.equal(await page.locator('#quantity-1').inputValue(), '2');
  assert.equal(await page.getByText('Excluido de descuento especial', { exact: true }).count(), 1);
  assert.ok(await page.getByText(/MXN por paquete/, { exact: false }).count());
  await repeat(await amount('Total MXN')); pass('selected promotional presentation/package quantity and catalog picker persist');
  await capture('presentaciones-sincronizadas');

  await fresh(); await addFirst(); await page.locator('#discountMode').selectOption('special_percentage');
  await page.locator('#discountReason').fill('short'); await draftForm().evaluate(form => { form.noValidate = true; });
  await submit(); await page.locator('#discountReason-error').waitFor();
  assert.equal(await page.locator('#discountMode').inputValue(), 'special_percentage');
  assert.equal(await page.locator('#discountReason').inputValue(), 'short');
  pass('server error retains attempted intent and still validates reason');
  await fresh(); await addFirst(); await page.locator('#quantity-1').fill('20');
  await page.locator('#discountMode').selectOption('special_percentage'); await page.locator('#discountPercent').fill('10');
  await page.locator('#discountReason').fill('Descuento DEMO inferior al normal disponible.'); await quote();
  await page.getByText('Bloqueado: el descuento especial ofrece menos ahorro que el normal. Ambas alternativas se conservan para comparación.', { exact: true }).waitFor();
  assert.equal(await review().isDisabled(), true); await repeat(await amount('Total MXN'));
  pass('less-favorable blocker unchanged across repeated quotes');
  await fresh(); await addFirst(); await page.locator('#discountMode').selectOption('special_percentage');
  await page.locator('#discountPercent').fill('100'); await page.locator('#discountReason').fill('Descuento DEMO total para comprobar bloqueo.');
  await page.locator('#courtesy').check(); await page.locator('#courtesyReason').fill('Cortesía DEMO para comprobar el total cero.');
  await quote(); await page.getByText('Total cero: puede cotizarse, pero no autoriza crear un pedido.', { exact: true }).waitFor();
  assert.equal(await review().isDisabled(), true); await repeat('$0.00'); pass('zero-total blocker unchanged; creation disabled');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 }); await fresh(); await addFirst();
    await page.locator('#discountMode').selectOption('special_percentage'); await page.locator('#discountPercent').fill('50');
    await page.locator('#discountReason').fill('Descuento DEMO responsive de regresión.'); await quote(); await repeat('$264.00');
    pass(`real DOM repeated quote and usable controls at ${width}px`);
  }
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.unexpectedResourceFailures, []);
  assert.equal(report.blocked.filter(r => r.external || r.method !== 'GET').length, 0);
  assert.ok(report.mutations.length > 0);
  assert.ok(report.mutations.every(r => r.method === 'POST' && r.path === '/operaciones/pedidos/nuevo'));
  pass('no RPC/provider/write endpoints; only local quote action and disabled creation');
  report.passed = true;
} catch (error) {
  report.failure = { message: error.message, stack: error.stack };
  throw error;
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) { const closed = new Promise(resolve => server.once('exit', resolve)); server.kill(); await closed; }
  report.cleanup = { browserClosed: true, ownServerStopped: true };
  writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2));
  console.log(`Local synthetic browser evidence: ${output}`);
}
