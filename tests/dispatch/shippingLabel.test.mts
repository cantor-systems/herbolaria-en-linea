import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildShippingLabelRows,
  shippingLabelText,
} from '../../src/app/operaciones/despacho/_components/shipping-label.ts';

const synthetic = {
  customerName: 'Cliente de prueba',
  customerPhone: '5500000000',
  shippingAddress: {
    streetAddress: 'Calle de Prueba 123, interior B; referencia incluida en texto',
    colonia: 'Colonia de prueba',
    city: 'Ciudad de prueba',
    state: 'Estado de prueba',
    postalCode: '01000',
    country: 'México' as const,
  },
};

test('visible and copied fields keep the approved order and the complete street address', () => {
  const rows = buildShippingLabelRows(synthetic);
  assert.deepEqual(rows.map(({ label }) => label), [
    'Nombre completo', 'Teléfono', 'Calle y número', 'Colonia', 'Ciudad', 'Estado', 'Código postal',
  ]);
  assert.equal(rows[2].value, synthetic.shippingAddress.streetAddress);
  assert.equal(shippingLabelText(rows), [
    'Nombre completo: Cliente de prueba',
    'Teléfono: 5500000000',
    'Calle y número: Calle de Prueba 123, interior B; referencia incluida en texto',
    'Colonia: Colonia de prueba',
    'Ciudad: Ciudad de prueba',
    'Estado: Estado de prueba',
    'Código postal: 01000',
  ].join('\n'));
  assert.deepEqual(synthetic.shippingAddress.streetAddress, 'Calle de Prueba 123, interior B; referencia incluida en texto');
});

test('missing data is omitted without placeholders, blank lines or added separators', () => {
  const rows = buildShippingLabelRows({ customerName: null, customerPhone: ' 5500000000 ', shippingAddress: null });
  assert.equal(shippingLabelText(rows), 'Teléfono: 5500000000');
  assert.equal(shippingLabelText(buildShippingLabelRows({ customerName: null, customerPhone: null, shippingAddress: null })), '');
});

test('presentation whitespace is cleaned without changing stored data or interpreting addresses', () => {
  const input = { ...synthetic, customerName: '  Cliente\n\n de prueba  ', shippingAddress: { ...synthetic.shippingAddress } };
  const snapshot = structuredClone(input);
  const rows = buildShippingLabelRows(input);
  assert.equal(rows[0].value, 'Cliente de prueba');
  assert.equal(rows[2].value, synthetic.shippingAddress.streetAddress);
  assert.deepEqual(input, snapshot);
  assert.doesNotMatch(shippingLabelText(rows), /null|undefined|\n\n|,,/);
});
