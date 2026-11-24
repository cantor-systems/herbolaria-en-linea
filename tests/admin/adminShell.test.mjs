import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const shell = read('src/components/admin/AdminShell.tsx');
const navigation = read('src/components/admin/AdminNavigation.tsx');
const config = read('src/lib/admin/navigation.ts');
const page = read('src/app/operaciones/admin-demo/page.tsx');
const combined = [shell, navigation, config, page].join('\n');

test('AdminShell stays isolated from providers and repositories', () => {
  assert.doesNotMatch(
    combined,
    /@\/lib\/(supabase|mercadopago|orders|dispatch\/orders)|resend|MERCADOPAGO_|SUPABASE_|MANUAL_ORDERS_RPC_SIGNING_KEY/
  );
});

test('demo route is production closed and keeps the existing admin guard', () => {
  assert.match(page, /process\.env\.NODE_ENV === 'production'/);
  assert.match(page, /notFound\(\)/);
  assert.match(page, /await requireDispatchAdminSession\(\)/);
  assert.ok(page.indexOf("NODE_ENV === 'production'") < page.indexOf('requireDispatchAdminSession()'));
});

test('only implemented destinations receive links', () => {
  assert.match(config, /href: '\/operaciones\/admin-demo'/);
  assert.match(config, /href: '\/operaciones\/despacho'/);
  assert.doesNotMatch(config, /href: '\/operaciones\/(pedidos|pagos|vendedores|actividad)'/);
  assert.match(navigation, /aria-disabled="true"/);
  assert.match(navigation, /aria-current=/);
});

test('the initial screen declares DEMO and empty data without business metrics', () => {
  assert.match(page, /AdminShell · DEMO local/);
  assert.match(page, /No hay datos de demostración cargados/);
  assert.match(page, /no consulta pedidos, pagos, envíos ni métricas reales/i);
});
