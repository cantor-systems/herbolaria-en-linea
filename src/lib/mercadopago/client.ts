import 'server-only';

import { MercadoPagoConfig } from 'mercadopago';

export class MercadoPagoConfigurationError extends Error {}

function requiredPrivateEnvironmentVariable(name: 'MERCADOPAGO_ACCESS_TOKEN' | 'MERCADOPAGO_WEBHOOK_SECRET') {
  const value = process.env[name]?.trim();
  if (!value) throw new MercadoPagoConfigurationError(`Falta configurar ${name}.`);
  return value;
}

export function createMercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: requiredPrivateEnvironmentVariable('MERCADOPAGO_ACCESS_TOKEN'),
    options: { timeout: 5_000 },
  });
}

export function getMercadoPagoWebhookSecret() {
  return requiredPrivateEnvironmentVariable('MERCADOPAGO_WEBHOOK_SECRET');
}
