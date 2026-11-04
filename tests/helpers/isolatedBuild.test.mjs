import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { urlToHttpOptions } from 'node:url';
import vm from 'node:vm';

const source = readFileSync(new URL('./isolated-build.cjs', import.meta.url), 'utf8');

// No sockets, native HTTP clients, environment files or credentials are used.
// Capture exactly what the guarded APIs would hand to Node's request methods.
function harness() {
  const calls = [];
  const clients = Object.fromEntries(['http:', 'https:'].map((protocol) => [protocol, {
    Agent: class { constructor(options) { this.options = options; } },
    request(options, callback) { calls.push({ protocol, method: 'request', options, callback }); return 'request'; },
    get(options, callback) { calls.push({ protocol, method: 'get', options, callback }); return 'get'; },
  }]));
  const fakeFs = { statSync: () => 'stat', readFileSync: () => 'read' };
  const context = {
    URL, Buffer,
    process: { env: {
      SUPABASE_URL: 'synthetic', RESEND_API_KEY: 'synthetic', DISPATCH_ADMIN_PASSWORD: 'synthetic',
      DELIVERY_CONFIRMATION_ENABLED: 'true', HTTP_PROXY: 'synthetic', NODE_USE_ENV_PROXY: '1',
    } },
    fetch() { throw new Error('Original fetch must never run'); },
    require(name) {
      if (name === 'node:fs') return fakeFs;
      if (name === 'node:path') return path;
      if (name === 'node:url') return { urlToHttpOptions };
      if (name === 'node:http') return clients['http:'];
      if (name === 'node:https') return clients['https:'];
      throw new Error(`Unexpected helper dependency: ${name}`);
    },
  };
  vm.runInNewContext(source, context);
  return { clients, calls, context, fakeFs };
}

test('isolated build normalizes supported HTTP/HTTPS argument formats into one effective loopback destination', () => {
  for (const protocol of ['http:', 'https:']) {
    for (const method of ['request', 'get']) {
      const h = harness();
      const client = h.clients[protocol];
      const callback = () => {};
      for (const args of [
        [`${protocol}//127.0.0.1:4100/qa?synthetic=1`, callback],
        [new URL(`${protocol}//[::1]:4100/qa`), { method: 'POST', port: 4200 }, callback],
        [`${protocol}//localhost/qa`, null, callback],
        [`${protocol}//localhost/qa`, undefined, callback],
        [{ hostname: 'localhost', port: '4300', path: '/qa', agent: false }, callback],
        [{ host: '::1', port: 4400, protocol }, callback],
        [{}, callback],
      ]) {
        assert.equal(client[method](...args), method);
        const call = h.calls.at(-1);
        assert.equal(call.callback, callback);
        assert.equal(call.options.protocol, protocol);
        assert.ok(['127.0.0.1', '::1'].includes(call.options.hostname));
        assert.equal(call.options.host, call.options.hostname);
        assert.equal(typeof call.options.port, 'number');
        assert.ok(call.options.agent instanceof client.Agent);
        assert.equal(Object.keys(call.options.agent.options.proxyEnv).length, 0);
      }
      assert.equal(h.calls[1].options.port, 4200);
      assert.equal(h.calls[2].options.hostname, '127.0.0.1');
      assert.equal(h.calls[2].options.port, protocol === 'https:' ? 443 : 80);
    }
  }
});

test('regression: URL plus options cannot overwrite an accepted destination with external hostname or host', () => {
  for (const protocol of ['http:', 'https:']) {
    for (const method of ['request', 'get']) {
      for (const overrides of [
        { hostname: 'outside.invalid' }, { host: 'outside.invalid' },
        { hostname: undefined, host: 'outside.invalid' },
        { hostname: '127.0.0.1', host: 'outside.invalid' },
      ]) {
        const h = harness();
        for (const base of [`${protocol}//127.0.0.1/`, new URL(`${protocol}//localhost/`)]) {
          assert.throws(() => h.clients[protocol][method](base, overrides), /blocked/);
          assert.equal(h.calls.length, 0);
        }
      }
    }
  }
});

test('helper rejects external URLs, object destinations, malformed ports/protocols and proxy paths before dispatch', () => {
  for (const protocol of ['http:', 'https:']) {
    for (const method of ['request', 'get']) {
      const h = harness();
      for (const args of [
        [`${protocol}//outside.invalid/`],
        [new URL(`${protocol}//outside.invalid/`), { hostname: '127.0.0.1' }],
        [{ hostname: 'outside.invalid' }], [{ host: 'outside.invalid' }],
        [`${protocol}//localhost/`, { protocol: protocol === 'http:' ? 'https:' : 'http:' }],
        [`${protocol}//localhost/`, { protocol: 'file:' }],
        [`${protocol}//localhost/`, { port: '80@outside.invalid' }],
        [`${protocol}//localhost/`, { port: 65536 }],
        [`${protocol}//localhost/`, { port: -1 }],
        [`${protocol}//localhost/`, { port: 0 }],
        [`${protocol}//localhost/`, { port: '1e3' }],
        [`${protocol}//localhost/`, { path: `${protocol}//outside.invalid/` }],
        [`${protocol}//localhost/`, { path: '//outside.invalid/' }],
        [`${protocol}//localhost/`, { path: '/qa\r\nHost: outside.invalid' }],
        ['file:///synthetic'],
      ]) {
        assert.throws(() => h.clients[protocol][method](...args), /blocked/);
        assert.equal(h.calls.length, 0);
      }
    }
  }
});

test('unsupported/custom transports and ambiguous argument formats fail closed', () => {
  for (const protocol of ['http:', 'https:']) {
    for (const method of ['request', 'get']) {
      const h = harness();
      for (const overrides of [
        { agent: {} }, { agent: null }, { createConnection() {} }, { lookup() {} },
        { socketPath: '/synthetic.sock' }, { _defaultAgent: {} },
        { defaultPort: 80 }, { proxy: 'synthetic' }, { url: `${protocol}//outside.invalid/` },
      ]) {
        assert.throws(() => h.clients[protocol][method](`${protocol}//localhost/`, overrides), /blocked/);
      }
      assert.throws(() => h.clients[protocol][method](`${protocol}//localhost/`, {}, 'not-callback'), /blocked/);
      assert.throws(() => h.clients[protocol][method]([]), /blocked/);
      assert.equal(h.calls.length, 0);
    }
  }
});

test('validated request snapshot cannot be replaced through original argument objects or custom globals', () => {
  const h = harness();
  const input = new URL('http://127.0.0.1:4100/qa');
  let reads = 0;
  const options = { get hostname() { reads++; return reads === 1 ? '127.0.0.1' : 'outside.invalid'; }, port: 4200 };
  h.clients['http:'].request(input, options);
  input.hostname = 'outside.invalid';
  assert.equal(reads, 1);
  assert.equal(h.calls[0].options.hostname, '127.0.0.1');
  assert.equal(h.calls[0].options.port, 4200);
  assert.notEqual(h.calls[0].options, options);
});

test('all fetch requests are refused, including redirect and dispatcher options', () => {
  const h = harness();
  for (const url of ['http://localhost/qa', 'https://outside.invalid/']) {
    assert.throws(() => h.context.fetch(url), /blocked/);
    assert.throws(() => h.context.fetch(url, { redirect: 'follow', dispatcher: {} }), /blocked/);
  }
  assert.equal(h.calls.length, 0);
});

test('preload blocks synchronous dotenv reads and removes synthetic service, activation and proxy variables', () => {
  const h = harness();
  assert.throws(() => h.fakeFs.readFileSync('.env.local'), (error) => error.code === 'ENOENT');
  assert.throws(() => h.fakeFs.statSync('.env.production'), (error) => error.code === 'ENOENT');
  assert.equal(h.fakeFs.readFileSync('synthetic.txt'), 'read');
  assert.deepEqual(Object.keys(h.context.process.env), ['NEXT_TELEMETRY_DISABLED']);
});
