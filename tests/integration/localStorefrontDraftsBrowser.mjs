import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mode = process.argv[2];
assert.ok(mode === 'public' || mode === 'admin', 'Run this check with public or admin');
assert.deepEqual(readdirSync(root).filter(name => /^\.env(?:\.|$)/.test(name) && name !== '.env.example'), [],
  'Run the browser check in an isolated copy without environment files');
const { chromium } = createRequire(import.meta.url)(process.env.HERB_STOREFRONT_PLAYWRIGHT_MODULE || 'playwright-core');
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC|PATHEXT)$/i.test(name)));

const portProbe = createServer();
await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
const port = portProbe.address().port;
await new Promise(resolve => portProbe.close(resolve));
const origin = 'http://127.0.0.1:' + port;
const testPassword = randomUUID();
const serverArgs = mode === 'admin' ? ['dev', '--webpack'] : ['start'];
const server = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), ...serverArgs,
  '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root,
  env: { ...safeEnv, NEXT_TELEMETRY_DISABLED: '1', ...(mode === 'admin' ? { DISPATCH_ADMIN_PASSWORD: testPassword } : {}) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const report = { mode, errors: [] };
const paymentUrl = 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=storefront-drafts-test';
let browser;

try {
  const deadline = Date.now() + 45000;
  while (!/Ready in/.test(serverOutput)) {
    assert.ok(server.exitCode === null && Date.now() < deadline, serverOutput);
    await delay(200);
  }

  browser = await chromium.launch({
    executablePath: process.env.HERB_STOREFRONT_CHROMIUM,
    env: safeEnv,
    headless: true,
    args: ['--disable-background-networking', '--disable-component-update', '--disable-sync',
      '--no-first-run', '--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  context.setDefaultTimeout(20000);
  context.setDefaultNavigationTimeout(150000);
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (mode === 'public' && url.href === paymentUrl) {
      return route.fulfill({ status: 302, headers: {
        location: origin + '/pedido/confirmacion?payment_id=123456&external_reference=storefront-drafts-test',
      } });
    }
    if (url.origin !== origin) return route.abort();
    if (mode === 'public' && url.pathname === '/api/mercadopago/create-preference' && request.method() === 'POST') {
      const data = request.postDataJSON();
      report.checkoutRequest = { quantity: data.items[0].quantity, promotionCode: data.promotionCode,
        notifications: data.whatsappNotificationsOptIn, idempotency: Boolean(request.headers()['idempotency-key']) };
      return route.fulfill({ json: { checkoutUrl: paymentUrl } });
    }
    if (mode === 'public' && url.pathname === '/api/mercadopago/payment-status') {
      report.paymentStatusSimulated = true;
      return route.fulfill({ json: { status: 'approved', verifiedByProvider: true } });
    }
    if (url.pathname.startsWith('/api/')) return route.abort();
    if (request.method() === 'GET' || (mode === 'admin' && url.pathname === '/operaciones/login')) {
      return route.continue();
    }
    return route.abort();
  });

  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  const go = async path => {
    const response = await page.goto(origin + path, { waitUntil: 'load' });
    assert.ok(response);
    await page.waitForLoadState('networkidle');
    return response.status();
  };
  const waitForPath = path => page.waitForURL(url => url.pathname === path);
  const button = name => page.getByRole('button', { name });
  const commercialHeader = page.locator('header a[aria-label="Herbolaria en Línea — Inicio"]');
  const footer = page.locator('footer');

  if (mode === 'admin') {
    const response = await fetch(origin + '/operaciones/admin-demo', { redirect: 'manual', signal: AbortSignal.timeout(150000) });
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get('location'), origin).pathname, '/operaciones/login');
    assert.equal(await go('/operaciones/login'), 200);
    await page.locator('#dispatch-password').fill(testPassword);
    await button(/Entrar al módulo/).click();
    await waitForPath('/operaciones/despacho');
    assert.equal(await go('/operaciones/admin-demo'), 200);
    await page.getByRole('heading', { name: 'Centro de operaciones' }).waitFor();
    report.admin = {
      header: await page.locator('header').count(), commercialHeader: await commercialHeader.count(),
      footer: await footer.count(), main: await page.locator('main').count(),
      search: await page.locator('header input').count(), cart: await button('Abrir carrito de compras').count(),
      promotion: await page.getByText(/^Envío estándar gratis en compras desde/).count(),
    };
    assert.deepEqual(report.admin, { header: 1, commercialHeader: 0, footer: 0, main: 1, search: 0, cart: 0, promotion: 0 });
  } else {
    await page.clock.setFixedTime(new Date('2026-11-14T18:00:00Z'));
    const search = page.getByPlaceholder('Buscar gotas, cápsulas, hierba...');
    const drawer = page.getByRole('dialog', { name: 'Tu carrito' });
    const coupon = drawer.getByRole('textbox', { name: 'Código de cupón' });
    const product = '/producto/paquete-moronel-integral-herbazen';
    const productLink = page.locator('main a[href="' + product + '"]').first();
    const addProduct = page.getByRole('button', { name: 'Agregar al carrito', exact: true });
    const currentCart = () => page.evaluate(() => ({
      quantity: JSON.parse(localStorage.getItem('herbolaria_cart_items_v1') || '[]')[0]?.quantity ?? 0,
      promotionCode: localStorage.getItem('herbolaria_applied_promo_v1'),
    }));
    const overflow = () => page.evaluate(() => [document.documentElement.style.overflow, document.body.style.overflow]);
    const openDrawer = async () => {
      await button('Abrir carrito de compras').click();
      await drawer.waitFor();
      assert.deepEqual(await overflow(), ['hidden', 'hidden']);
    };
    const closeDrawer = async () => {
      await button('Cerrar carrito').click();
      await drawer.waitFor({ state: 'hidden' });
      assert.deepEqual(await overflow(), ['', '']);
    };
    const assertChrome = async () => {
      assert.equal(await commercialHeader.count(), 1);
      assert.equal(await footer.count(), 1);
    };

    const response = await fetch(origin + '/operaciones/admin-demo', { redirect: 'manual' });
    report.adminProductionStatus = response.status;
    assert.equal(response.status, 404);
    assert.equal(await go('/tienda'), 200);
    await assertChrome();
    await search.fill('Moronel');
    await search.press('Enter');
    await page.waitForURL(url => url.pathname === '/tienda' && url.searchParams.get('q') === 'Moronel');
    await search.fill('Borrador comercial');
    await productLink.click();
    await waitForPath(product);
    await addProduct.waitFor();
    await assertChrome();
    report.searchAtProduct = await search.inputValue();
    assert.equal(report.searchAtProduct, 'Borrador comercial');
    await page.goBack();
    await waitForPath('/tienda');
    report.searchAfterBack = await search.inputValue();
    assert.equal(report.searchAfterBack, 'Borrador comercial');
    await page.setViewportSize({ width: 390, height: 900 });
    await button('Men\u00fa principal').click();
    const mobileSearch = page.getByPlaceholder('Buscar en Herbolaria en L\u00ednea...');
    report.searchOnMobile = await mobileSearch.inputValue();
    assert.equal(report.searchOnMobile, 'Borrador comercial');
    await button('Men\u00fa principal').click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goForward();
    await waitForPath(product);
    assert.equal(await search.inputValue(), 'Borrador comercial');

    await addProduct.click();
    await drawer.waitFor();
    await coupon.fill('BORRADOR-INVALIDO');
    await drawer.getByRole('button', { name: 'Aplicar', exact: true }).click();
    assert.equal(await coupon.inputValue(), 'BORRADOR-INVALIDO');
    assert.deepEqual(await currentCart(), { quantity: 1, promotionCode: null });
    await coupon.fill('BF20');
    await drawer.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await page.waitForFunction(() => localStorage.getItem('herbolaria_applied_promo_v1') === 'BF20');
    report.couponClearedAfterApply = (await coupon.inputValue()) === '';
    assert.equal(report.couponClearedAfterApply, true);
    await closeDrawer();

    await page.locator('header a[href="/tienda"]').first().click();
    await waitForPath('/tienda');
    await openDrawer();
    await drawer.getByRole('link', { name: 'Ver carrito' }).click();
    await waitForPath('/carrito');
    await drawer.waitFor({ state: 'hidden' });
    await button(/^Aumentar cantidad/).first().click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('herbolaria_cart_items_v1') || '[]')[0]?.quantity === 2);
    await assertChrome();
    await page.locator('main a[href="/checkout"]').click();
    await waitForPath('/checkout');
    await page.getByPlaceholder('ejemplo@correo.com').waitFor();
    await assertChrome();

    await openDrawer();
    await coupon.fill('BORRADOR');
    const initialScroll = await page.evaluate(() => window.scrollY);
    await page.mouse.move(100, 400);
    await page.mouse.wheel(0, 420);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => window.scrollY), initialScroll);
    await page.goBack();
    await waitForPath('/carrito');
    await drawer.waitFor();
    report.couponDraftAfterBack = await coupon.inputValue();
    assert.equal(report.couponDraftAfterBack, 'BORRADOR');
    assert.deepEqual(await overflow(), ['hidden', 'hidden']);
    await page.goForward();
    await waitForPath('/checkout');
    await drawer.waitFor();
    report.couponDraftAfterForward = await coupon.inputValue();
    assert.equal(report.couponDraftAfterForward, 'BORRADOR');
    assert.deepEqual(await currentCart(), { quantity: 2, promotionCode: 'BF20' });
    await closeDrawer();
    await page.reload({ waitUntil: 'load' });
    await page.getByPlaceholder('ejemplo@correo.com').waitFor();
    report.cartAfterReload = await currentCart();
    assert.deepEqual(report.cartAfterReload, { quantity: 2, promotionCode: 'BF20' });
    assert.equal(await search.inputValue(), '');
    await openDrawer();
    assert.equal(await coupon.inputValue(), '');
    await closeDrawer();
    report.draftsClearedAfterReload = true;

    for (const [placeholder, value] of [['ejemplo@correo.com', 'prueba@example.invalid'], ['55 0000 0000', '5500000042']]) {
      await page.getByPlaceholder(placeholder).fill(value);
    }
    await button(/Continuar a Dirección de Envío/).click();
    for (const [placeholder, value] of [['Nombre y Apellidos', 'Persona de Prueba'], ['Av. Hidalgo #123 Int 4B', 'Calle Ficticia 123'],
      ['Colonia Centro', 'Colonia Demo'], ['06000', '06000'], ['Cuauhtémoc', 'Cuauhtémoc'], ['Ciudad de México', 'Ciudad de México']]) {
      await page.getByPlaceholder(placeholder).fill(value);
    }
    await button(/Continuar a Método de Envío/).click();
    await button(/Continuar a Forma de Pago/).click();
    await button(/Pagar con Mercado Pago/).click();
    await waitForPath('/pedido/confirmacion');
    await page.getByRole('heading', { name: 'Pago aprobado', exact: true }).waitFor();
    await page.waitForFunction(() => localStorage.getItem('herbolaria_cart_items_v1') === '[]' &&
      localStorage.getItem('herbolaria_applied_promo_v1') === null);
    assert.deepEqual(report.checkoutRequest, { quantity: 2, promotionCode: 'BF20', notifications: false, idempotency: true });
    assert.equal(report.paymentStatusSimulated, true);
    report.cartAfterApproval = await currentCart();
    assert.deepEqual(report.cartAfterApproval, { quantity: 0, promotionCode: null });
    await assertChrome();
  }

  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  if (server.exitCode === null) server.kill();
}
