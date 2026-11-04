// Preload ONLY for local validation. Next's env loader reads .env files even
// when __NEXT_PROCESSED_ENV is set. Hide those paths before it can read them.
const fs = require('node:fs');
const path = require('node:path');
const { urlToHttpOptions } = require('node:url');
function isEnvFile(filename) {
  return (typeof filename === 'string' || Buffer.isBuffer(filename)) && /^\.env(?:\.|$)/.test(path.basename(String(filename)));
}
for (const method of ['statSync', 'readFileSync']) {
  const original = fs[method];
  fs[method] = function (filename, ...args) {
    if (isEnvFile(filename)) {
      const error = new Error('Environment files are unavailable during isolated build.');
      error.code = 'ENOENT';
      throw error;
    }
    return original.call(this, filename, ...args);
  };
}
// Never inherit service credentials into this validation or its child workers.
for (const key of Object.keys(process.env)) {
  if (/SUPABASE|MERCADO|RESEND|DISPATCH_ADMIN|DELIVERY_CONFIRMATION|ORDER_NOTIFICATION|VERCEL|TOKEN|SECRET|PASSWORD|API_KEY|^(?:HTTPS?|ALL|NO)_PROXY$|^NODE_USE_ENV_PROXY$/i.test(key)) delete process.env[key];
}
process.env.NEXT_TELEMETRY_DISABLED = '1';

function rejectRequest() {
  throw new Error('Unsupported or external request blocked during isolated build.');
}

function loopback(value) {
  if (typeof value !== 'string') return rejectRequest();
  if (value.toLowerCase() === 'localhost') return '127.0.0.1';
  if (value === '127.0.0.1') return value;
  if (value === '::1' || value === '[::1]') return '::1';
  return rejectRequest();
}

// Only this conservative subset of Node request options is supported. Custom
// agents, DNS lookup, socket paths, connectors and future options fail closed.
const allowedOptions = new Set([
  'protocol', 'hostname', 'host', 'port', 'path', 'method', 'headers', 'auth',
  'timeout', 'signal', 'agent',
]);

function requestOptions(protocol, args, agent) {
  const remaining = [...args];
  const input = remaining.shift();
  let base = {};
  let overrides;
  if (typeof input === 'string' || input instanceof URL) {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return rejectRequest();
    // Reject an external base URL even if subsequent options would mask it.
    loopback(url.hostname);
    const parsed = urlToHttpOptions(url);
    base = { protocol: parsed.protocol, hostname: parsed.hostname, port: parsed.port,
      path: parsed.path, auth: parsed.auth };
    if (remaining[0] === undefined || remaining[0] === null || typeof remaining[0] === 'object') {
      overrides = remaining.shift();
    }
  } else {
    overrides = input;
  }
  if (overrides != null && (typeof overrides !== 'object' || Array.isArray(overrides))) return rejectRequest();
  // Read properties once, then pass only this snapshot to Node. Never forward
  // the original URL and options separately after validating just one of them.
  const options = { ...base, ...overrides };
  if (Reflect.ownKeys(options).some((key) => !allowedOptions.has(key))) return rejectRequest();
  const callback = remaining.shift();
  if ((callback !== undefined && typeof callback !== 'function') || remaining.length) return rejectRequest();
  if (options.protocol != null && options.protocol !== protocol) return rejectRequest();
  if (options.agent !== undefined && options.agent !== false) return rejectRequest();
  if (options.host != null) loopback(options.host);
  const hostname = loopback(options.hostname || options.host || 'localhost');
  const port = options.port == null || options.port === ''
    ? (protocol === 'https:' ? 443 : 80) : options.port;
  if (!['string', 'number'].includes(typeof port) || !/^\d+$/.test(String(port)) ||
    !Number.isInteger(Number(port)) || Number(port) < 1 || Number(port) > 65535) return rejectRequest();
  const requestPath = options.path ?? '/';
  if (typeof requestPath !== 'string' || !requestPath.startsWith('/') || requestPath.startsWith('//') || /[\u0000-\u0020\u007f]/.test(requestPath)) return rejectRequest();
  return {
    options: { ...options, protocol, hostname, host: hostname, port: Number(port), path: requestPath, agent },
    callback,
  };
}

// Fetch can follow redirects or accept a custom undici dispatcher. This helper
// intentionally refuses ALL fetch calls, including loopback, instead of claiming
// to constrain those transports. HTTP(S) below never follows redirects itself.
globalThis.fetch = rejectRequest;
for (const protocol of ['http:', 'https:']) {
  const client = require(protocol === 'http:' ? 'node:http' : 'node:https');
  // Pin the transport instead of trusting a caller/global agent or proxy env.
  const agent = new client.Agent({ keepAlive: false, proxyEnv: {} });
  for (const method of ['request', 'get']) {
    const original = client[method];
    client[method] = function (...args) {
      const validated = requestOptions(protocol, args, agent);
      return original.call(client, validated.options, validated.callback);
    };
  }
}
