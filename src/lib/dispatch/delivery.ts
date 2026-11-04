import 'server-only';

export function isDeliveryConfirmationEnabled() {
  return process.env.DELIVERY_CONFIRMATION_ENABLED === 'true';
}
