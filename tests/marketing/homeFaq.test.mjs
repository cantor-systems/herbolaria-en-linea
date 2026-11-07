import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(relativePath, dependencies = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (['react', 'react/jsx-runtime', 'lucide-react', 'clsx', 'tailwind-merge'].includes(name)) return require(name);
      throw new Error(`Unexpected FAQ dependency: ${name}`);
    },
  }, { filename: filename.pathname });
  return module.exports;
}
function harness({ enabled = false, standard = '4–5 días hábiles', express = '1–2 días hábiles', variant = 'home' } = {}) {
  const config = {
    '@/config/shipping': { SHIPPING_CONFIG: { standardEstimatedDays: standard, expressEstimatedDays: express } },
    '@/config/store': { STORE_CONFIG: { contact: { whatsapp: { enabled } } } },
  };
  const homepage = load('../../src/content/homepage.ts', config);
  const home = load('../../src/content/home-faq.ts', config);
  const utils = load('../../src/lib/utils.ts');
  const { AccordionItem } = load('../../src/components/ui/Accordion.tsx', { '@/lib/utils': utils });
  const analytics = [];
  let open = 0;
  const { FAQSection } = load('../../src/components/marketing/FAQSection.tsx', {
    react: { ...React, useState: () => [open, (next) => { open = typeof next === 'function' ? next(open) : next; }] },
    '@/content/homepage': homepage,
    '@/content/home-faq': home,
    '@/components/ui/Accordion': { AccordionItem },
    '@/config/store': { getWhatsAppHref: () => enabled ? 'https://wa.me/000000000000' : null },
    '@/lib/analytics': { trackWhatsAppClick: (...args) => analytics.push(args) },
  });
  const nodes = (node) => React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : [];
  const tree = () => FAQSection({ variant });
  return {
    homepage, home, FAQSection, analytics,
    render: () => renderToStaticMarkup(tree()),
    toggle: (index) => nodes(tree()).filter((node) => node.type === AccordionItem)[index].props.onToggle(),
    contactClick: () => nodes(tree()).find((node) => node.type === 'a').props.onClick(),
  };
}

test('Home FAQ contains the approved copy, including owner-confirmed payment methods', () => {
  const { HOME_FAQ_SECTION: section, HOME_FAQ_ITEMS: items } = harness({ enabled: true }).home;
  assert.equal(section.eyebrow, 'INFORMACIÓN DE COMPRA');
  assert.equal(section.title, 'Preguntas frecuentes sobre compras en línea');
  assert.equal(section.subtitle, 'Consulta información sobre pagos, envíos, rastreo y canales de atención.');
  assert.deepEqual(Array.from(items, (item) => item.question), [
    '¿Cómo realizo el pago de mi pedido?', '¿Es segura la compra?', '¿En cuánto tiempo llega mi pedido?',
    '¿Cómo recibo mi número de guía de rastreo?', '¿Puedo realizar mi compra directamente por WhatsApp?',
  ]);
  assert.deepEqual(Array.from(items, (item) => item.answer), [
    'El pago se procesa de forma segura mediante Mercado Pago. Al continuar con tu compra podrás elegir entre pago en efectivo, transferencia bancaria y tarjeta de crédito o débito, según las opciones disponibles al momento del pago.',
    'Sí. Tu compra se procesa a través de una plataforma de pago segura y confiable. Además, recibirás confirmación de tu pedido y, una vez enviado, podrás dar seguimiento a la información de rastreo correspondiente.',
    'El envío estándar tiene un tiempo estimado de 4 a 5 días hábiles y el envío exprés de 1 a 2 días hábiles. Los tiempos pueden variar según la cobertura de la paquetería y el destino de entrega.',
    'Cuando tu pedido sea enviado, recibirás la información de rastreo por correo electrónico y, si corresponde, también por WhatsApp, para que puedas dar seguimiento a tu envío.',
    'Sí. También puedes realizar tu compra por WhatsApp, donde un agente puede ayudarte con la atención, resolver tus dudas y dar seguimiento a tu pedido.',
  ]);
});

test('shipping estimates change with configuration instead of fixed FAQ durations', () => {
  const ui = harness({ standard: '7–9 días hábiles', express: '3–4 días hábiles' });
  const answer = ui.home.HOME_FAQ_ITEMS[2].answer;
  assert.match(answer, /7 a 9 días hábiles/);
  assert.match(answer, /3 a 4 días hábiles/);
  assert.doesNotMatch(answer, /4 a 5|1 a 2/);
});

test('WhatsApp stays unavailable when disabled; enabled synthetic contact retains analytics', () => {
  const disabled = harness();
  assert.match(disabled.home.HOME_FAQ_ITEMS[4].answer, /^El canal de WhatsApp no está disponible actualmente\./);
  assert.doesNotMatch(disabled.render(), /wa\.me|Preguntar directamente por WhatsApp/);
  const enabled = harness({ enabled: true });
  assert.match(enabled.render(), /href="https:\/\/wa\.me\/000000000000"/);
  enabled.contactClick(); // Execute the real callback; no navigation or message.
  assert.equal(enabled.analytics.length, 1);
  assert.equal(enabled.analytics[0][0], 'faq');
  assert.equal(enabled.analytics[0][1].placement, 'faq_section');
});

test('Home accordion has unique control/panel relationships and retains single-open/collapse behavior', () => {
  const ui = harness();
  const html = ui.render();
  const buttons = [...html.matchAll(/<button\b([^>]+)>/g)].map((match) => match[1]);
  assert.equal(buttons.length, 5);
  const ids = buttons.map((attrs) => attrs.match(/id="([^"]+)"/)[1]);
  assert.equal(new Set(ids).size, 5);
  for (const attrs of buttons) {
    const trigger = attrs.match(/id="([^"]+)"/)[1];
    const panel = attrs.match(/aria-controls="([^"]+)"/)[1];
    assert.ok(html.includes(`id="${panel}" role="region" aria-labelledby="${trigger}"`));
  }
  assert.equal((html.match(/aria-expanded="true"/g) ?? []).length, 1);
  assert.equal((html.match(/hidden=""/g) ?? []).length, 4);
  ui.toggle(1);
  assert.equal((ui.render().match(/aria-expanded="true"/g) ?? []).length, 1);
  ui.toggle(1);
  assert.equal((ui.render().match(/aria-expanded="true"/g) ?? []).length, 0);
  assert.equal((ui.render().match(/hidden=""/g) ?? []).length, 5);
  assert.doesNotMatch(html, /<h1/);
});

test('the internal FAQ and its structured data retain the original four entries', () => {
  const ui = harness({ variant: 'default' });
  const Page = load('../../src/app/preguntas-frecuentes/page.tsx', {
    '@/components/marketing/FAQSection': { FAQSection: ui.FAQSection },
    '@/content/homepage': ui.homepage,
    '@/lib/site': { canonicalAlternates: () => ({}), socialMetadata: () => ({}) },
  }).default;
  const html = renderToStaticMarkup(React.createElement(Page));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema.mainEntity.length, 4);
  assert.deepEqual(schema.mainEntity.map((entry) => entry.name), Array.from(ui.homepage.HOMEPAGE_CONTENT.faq, (item) => item.question));
  assert.deepEqual(schema.mainEntity.map((entry) => entry.acceptedAnswer.text), Array.from(ui.homepage.HOMEPAGE_CONTENT.faq, (item) => item.answer));
  assert.equal((html.match(/<button /g) ?? []).length, 4);
  assert.doesNotMatch(html, /¿Es segura la compra\?|home-faq-title|transferencia bancaria/);
});
