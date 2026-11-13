// Loopback-only review runner. No credentials, external requests or mutations.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

assert.equal(process.argv.length, 2);
const root = fileURLToPath(new URL('../../', import.meta.url));
assert.deepEqual(readdirSync(root).filter(n => /^\.env(?:\.|$)/.test(n) && n !== '.env.example'), []);
assert.ok(existsSync(join(root, '.next/BUILD_ID')));
const modulePath = process.env.HERB_BF20_PLAYWRIGHT_MODULE;
if (modulePath) assert.ok(isAbsolute(modulePath) && existsSync(modulePath));
const { chromium } = createRequire(import.meta.url)(modulePath || 'playwright');
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC|PATHEXT)$/i.test(k)));
const output = mkdtempSync(join(tmpdir(), 'herb-bf20-review-'));
const report = { captures: [], pageErrors: [], blocked: [] };
let server, browser;
try {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env: { ...safeEnv, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let ready = false;
  server.stdout.on('data', b => { if (String(b).includes('Ready in')) ready = true; });
  server.stderr.on('data', () => {});
  for (let i = 0; !ready && i < 120; i++) {
    assert.equal(server.exitCode, null);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready);
  browser = await chromium.launch({ headless: true, env: safeEnv, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'] });
  const context = await browser.newContext({ locale: 'es-MX', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const r = route.request();
    if (new URL(r.url()).origin === origin && r.method() === 'GET') return route.continue();
    report.blocked.push({ method: r.method(), origin: new URL(r.url()).origin });
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin, { waitUntil: 'networkidle' });
    const slider = page.locator('[data-promotional-slider]');
    const bf = slider.locator('[data-slide-id="buen-fin-2026"]');
    await bf.waitFor({ state: 'visible' });
    assert.equal(await bf.getAttribute('aria-label'), '1 de 4');
    assert.equal(await bf.locator('a').getAttribute('href'), '/tienda');
    for (const copy of ['20% de descuento', 'Usa el cupón BF20', 'Del 12 al 17 de noviembre', 'Compra mínima de $799 MXN', '3 MSI con tarjeta de crédito', 'El descuento no aplica al envío.']) assert.ok((await bf.innerText()).includes(copy));
    const dimensions = await bf.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, image: { width: el.querySelector('img').naturalWidth, source: el.querySelector('img').currentSrc }, copy: el.querySelector('h2').getBoundingClientRect().toJSON() }));
    assert.ok(dimensions.image.width > 0);
    assert.ok(dimensions.image.source.endsWith(width < 640 ? 'bf20-mobile.webp' : 'bf20-desktop.webp'));
    assert.ok(dimensions.scroll <= dimensions.width + 1);
    const file = join(output, `bf20-${width}.png`);
    await page.screenshot({ path: file });
    report.captures.push({ width, file, dimensions });
    for (const id of ['moronel-featured', 'moronel-packages', 'herbal-world']) assert.equal(await slider.locator(`[data-slide-id="${id}"]`).count(), 1);
    await bf.locator('a').focus();
    await page.keyboard.press('ArrowRight');
    await slider.locator('[data-slide-id="moronel-featured"]').waitFor({ state: 'visible' });
    await slider.locator('[data-slide-id="moronel-featured"] a').focus();
    await page.keyboard.press('Home');
    await bf.waitFor({ state: 'visible' });
  }
  assert.deepEqual(report.pageErrors, []);
  console.log(JSON.stringify({ output, captures: report.captures, pageErrors: report.pageErrors }, null, 2));
} finally {
  if (browser) await browser.close();
  if (server) server.kill();
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2));
}
