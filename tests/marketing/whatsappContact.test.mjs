import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(relativePath, env = {}, dependencies = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, process: { env },
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected WhatsApp configuration dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}
const syntheticNumber = '525500000000'; // No request or message is ever sent.
const store = (value) => load('../../src/config/store.ts', value === undefined ? {} : { NEXT_PUBLIC_WHATSAPP_NUMBER: value });

test('absent, empty or non-digit WhatsApp configuration disables the public channel', () => {
  for (const value of [undefined, '', '   ', '+ ()']) {
    const config = store(value);
    assert.equal(config.STORE_CONFIG.contact.whatsapp.enabled, false);
    assert.equal(config.STORE_CONFIG.contact.whatsapp.value, null);
    assert.equal(config.getWhatsAppHref(), null);
    assert.equal(config.getWhatsAppHref('Consulta sintética'), null);
  }
});

test('the real helper preserves the international number without inserting a historical prefix and encodes messages', () => {
  const config = store(syntheticNumber);
  assert.equal(config.STORE_CONFIG.contact.whatsapp.value, syntheticNumber);
  assert.equal(config.getWhatsAppHref(), `https://wa.me/${syntheticNumber}`);
  const message = 'Hola, consulta sintética #AB23CD.\n¿Puedes ayudarme?';
  const url = new URL(config.getWhatsAppHref(message));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, `/${syntheticNumber}`);
  assert.equal(url.searchParams.get('text'), message);
  assert.equal(store('+52 55 0000 0000').getWhatsAppHref(), `https://wa.me/${syntheticNumber}`);
});

test('the real store configuration activates the approved FAQ answer and leaves other channels unchanged', () => {
  const disabled = store();
  const enabled = store(syntheticNumber);
  const homeFaq = (config) => load('../../src/content/home-faq.ts', {}, {
    '@/config/store': config,
    '@/config/shipping': { SHIPPING_CONFIG: { standardEstimatedDays: 'plazo sintético', expressEstimatedDays: 'plazo sintético' } },
  }).HOME_FAQ_ITEMS;
  assert.equal(homeFaq(enabled)[4].answer, 'Sí. También puedes realizar tu compra por WhatsApp, donde un agente puede ayudarte con la atención, resolver tus dudas y dar seguimiento a tu pedido.');
  assert.match(homeFaq(disabled)[4].answer, /^El canal de WhatsApp no está disponible actualmente\./);
  assert.equal(homeFaq(enabled).length, 5);
  for (const channel of ['email', 'businessHours', 'location']) {
    assert.equal(JSON.stringify(enabled.STORE_CONFIG.contact[channel]), JSON.stringify(disabled.STORE_CONFIG.contact[channel]));
    assert.equal(enabled.STORE_CONFIG.contact[channel].enabled, false);
  }
  assert.equal(JSON.stringify(enabled.STORE_CONFIG.payments), JSON.stringify(disabled.STORE_CONFIG.payments));
});
