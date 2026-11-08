import 'server-only';
export function isManualOrdersEnabled() {
  return process.env.MANUAL_ORDERS_ENABLED === 'true';
}
