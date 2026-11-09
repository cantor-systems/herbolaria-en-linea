import 'server-only';
import { quoteManualOrder } from './pricing';
import { ManualPricingError } from './types';
import type { DemoQuoteState } from './demo-types';

const FIELDS = new Set(['revision', 'channel', 'otherChannelDetail', 'customerName', 'customerEmail', 'customerPhone', 'relationship', 'frequency', 'segment',
  'streetAddress', 'colonia', 'city', 'state', 'postalCode', 'items', 'shippingMethod', 'discountMode', 'discountPercent', 'discountReason', 'courtesy', 'courtesyReason']);
const MESSAGES: Record<string, string> = { invalid_items: 'Añade al menos una presentación del catálogo.', unavailable_variant: 'La presentación ya no está disponible. Revisa el catálogo.',
  invalid_quantity: 'Utiliza entre 1 y 99 paquetes por presentación.', invalid_reason: 'El motivo debe tener entre 10 y 500 caracteres.', no_eligible_base: 'No hay productos individuales elegibles para el descuento especial.',
  courtesy_requires_standard: 'La cortesía sólo está disponible con envío estándar.', invalid_discount: 'Revisa el descuento solicitado.', normal_pricing_failed: 'No fue posible cotizar esas presentaciones.' };

// Pure server validation/calculation. Its only public caller is the authorized quote action.
export function calculateDemoQuote(form: FormData): DemoQuoteState {
  const errors: Record<string, string> = {};
  const text = (key: string) => { const v = form.get(key); return typeof v === 'string' ? v.trim() : ''; };
  const revision = text('revision');
  const fail = () : DemoQuoteState => ({ status: 'error', revision, errors, quote: null, normal: null });
  if (!/^\d{1,9}$/.test(revision)) errors.form = 'Formulario inválido. Vuelve a intentar.';
  for (const key of form.keys()) if ((!FIELDS.has(key) && !key.startsWith('$ACTION_')) || form.getAll(key).length !== 1) errors.form = 'El formulario contiene campos no admitidos.';
  const bounded = (key: string, min: number, max: number) => {
    const value = text(key);
    if (value.length < min || value.length > max || /[\u0000-\u001f\u007f<>]/.test(value)) errors[key] = `Usa entre ${min} y ${max} caracteres, sin caracteres de control.`;
    return value;
  };
  const channel = text('channel');
  if (!['whatsapp', 'phone', 'other'].includes(channel)) errors.channel = 'Selecciona un canal manual válido.';
  if (channel === 'other') bounded('otherChannelDetail', 2, 100);
  const name = bounded('customerName', 2, 120);
  if (!/\bDEMO\b/i.test(name)) errors.customerName = 'En esta demostración utiliza un nombre que incluya DEMO.';
  if (text('customerEmail') && (!/^[^\s@]+@[^\s@]+\.invalid$/i.test(text('customerEmail')) || text('customerEmail').length > 150)) errors.customerEmail = 'Utiliza únicamente un correo ficticio terminado en .invalid.';
  if (!/^550000\d{4}$/.test(text('customerPhone'))) errors.customerPhone = 'Utiliza un teléfono sintético del rango 5500000000–5500009999.';
  if (!['prospect', 'customer'].includes(text('relationship'))) errors.relationship = 'Selecciona prospecto o cliente.';
  if (text('relationship') === 'customer' && !['new', 'frequent'].includes(text('frequency'))) errors.frequency = 'Selecciona nuevo o frecuente.';
  if (!['retail', 'wholesale'].includes(text('segment'))) errors.segment = 'Selecciona minorista o mayorista.';
  bounded('streetAddress', 3, 160); bounded('colonia', 2, 100); bounded('city', 2, 100); bounded('state', 2, 100);
  if (!/^\d{5}$/.test(text('postalCode'))) errors.postalCode = 'El código postal debe tener cinco dígitos.';
  if (!['standard', 'express'].includes(text('shippingMethod'))) errors.shippingMethod = 'Selecciona un método de envío.';
  const mode = text('discountMode');
  if (!['normal', 'special_percentage'].includes(mode)) errors.discountMode = 'Sólo se admite descuento normal o porcentual.';
  let percentageBps = 0;
  if (mode === 'special_percentage') {
    const percent = text('discountPercent');
    if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(percent) || Number(percent) > 100) errors.discountPercent = 'Usa de 0 a 100%, con hasta dos decimales.';
    else percentageBps = Math.round(Number(percent) * 100);
    bounded('discountReason', 10, 500);
  }
  const courtesy = form.has('courtesy');
  if (courtesy) { if (text('courtesy') !== 'on' || text('shippingMethod') !== 'standard') errors.courtesy = 'La cortesía sólo se admite en envío estándar.'; bounded('courtesyReason', 10, 500); }
  let items: unknown;
  if (text('items').length > 24000) errors.items = 'La selección excede el límite permitido.';
  else { try { items = JSON.parse(text('items')); } catch { errors.items = 'Revisa los productos seleccionados.'; } }
  if (Object.keys(errors).length) return fail();
  try {
    const request = { items, shippingMethod: text('shippingMethod'), discount: mode === 'normal' ? { mode: 'normal', promotionCode: null }
      : { mode: 'special_percentage', percentageBps, reason: text('discountReason') }, standardShippingCourtesy: { requested: courtesy, reason: courtesy ? text('courtesyReason') : null } };
    const authorization = { role: 'principal_admin', actor: 'shared_admin', customerSegment: text('segment') };
    const quote = quoteManualOrder(request, authorization);
    const normal = mode === 'normal' ? quote : quoteManualOrder({ ...request, discount: { mode: 'normal', promotionCode: null } }, authorization);
    return { status: 'success', revision, errors: {}, quote, normal };
  } catch (error) {
    if (!(error instanceof ManualPricingError)) { errors.form = 'No fue posible calcular el resumen. Intenta de nuevo.'; return fail(); }
    const field = ['invalid_items', 'invalid_quantity', 'unavailable_variant'].includes(error.code) ? 'items' : error.code === 'no_eligible_base' ? 'discountMode' : 'form';
    errors[field] = MESSAGES[error.code] ?? 'Revisa los datos del pedido de demostración.';
    return fail();
  }
}
