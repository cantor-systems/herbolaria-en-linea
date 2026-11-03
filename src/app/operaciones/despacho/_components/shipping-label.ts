import type { OrderShippingAddress } from '@/lib/orders/types';

export interface ShippingLabelInput {
  customerName: string | null;
  customerPhone: string | null;
  shippingAddress: OrderShippingAddress | null;
}

export interface ShippingLabelRow {
  label: string;
  value: string;
}

export function buildShippingLabelRows(input: ShippingLabelInput): ShippingLabelRow[] {
  const address = input.shippingAddress;
  const fields = [
    ['Nombre completo', input.customerName],
    ['Teléfono', input.customerPhone],
    ['Calle y número', address?.streetAddress],
    ['Colonia', address?.colonia],
    ['Ciudad', address?.city],
    ['Estado', address?.state],
    ['Código postal', address?.postalCode],
  ] as const;

  return fields.flatMap(([label, value]) => {
    // Only presentation whitespace is cleaned; addresses are never parsed.
    const cleanValue = value?.replace(/\s+/g, ' ').trim();
    return cleanValue ? [{ label, value: cleanValue }] : [];
  });
}

export function shippingLabelText(rows: ShippingLabelRow[]): string {
  return rows.map(({ label, value }) => `${label}: ${value}`).join('\n');
}
