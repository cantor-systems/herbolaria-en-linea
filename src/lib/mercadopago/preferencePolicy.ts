export const PREFERENCE_VALIDITY_MINUTES = 30;
export const OFFLINE_PAYMENT_VALIDITY_DAYS = 3;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PreferenceExpirationPolicy {
  validFrom: string;
  expiresAt: string;
  offlinePaymentExpiresAt: string;
}

export type PreferenceAction =
  | 'create'
  | 'reuse_active'
  | 'reuse_legacy'
  | 'expired';

function validDate(value: Date | string) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('invalid_preference_policy_date');
  return date;
}

export function createPreferenceExpirationPolicy(
  orderCreatedAt: Date | string
): PreferenceExpirationPolicy {
  const validFrom = validDate(orderCreatedAt);
  const expiresAt = new Date(
    validFrom.getTime() + PREFERENCE_VALIDITY_MINUTES * MINUTE_MS
  );
  const offlinePaymentExpiresAt = new Date(
    expiresAt.getTime() + OFFLINE_PAYMENT_VALIDITY_DAYS * DAY_MS
  );

  return {
    validFrom: validFrom.toISOString(),
    expiresAt: expiresAt.toISOString(),
    offlinePaymentExpiresAt: offlinePaymentExpiresAt.toISOString(),
  };
}

export function decidePreferenceAction({
  preferenceId,
  storedExpiresAt,
  prospectiveExpiresAt,
  now = new Date(),
}: {
  preferenceId: string | null;
  storedExpiresAt: string | null;
  prospectiveExpiresAt: string;
  now?: Date;
}): PreferenceAction {
  const currentTime = validDate(now).getTime();

  if (preferenceId) {
    // Historical preferences intentionally remain outside the new policy.
    if (storedExpiresAt === null) return 'reuse_legacy';
    return validDate(storedExpiresAt).getTime() <= currentTime
      ? 'expired'
      : 'reuse_active';
  }

  return validDate(prospectiveExpiresAt).getTime() <= currentTime
    ? 'expired'
    : 'create';
}
