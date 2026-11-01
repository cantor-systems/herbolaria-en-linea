import type { PreferenceAction } from './preferencePolicy';

export interface CheckoutPreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

export interface CheckoutPreferenceSnapshot {
  externalReference: string;
  currency: 'MXN';
  totalCents: number;
  items: CheckoutPreferenceItem[];
  shippingCents: number;
  validFrom: string;
  expiresAt: string;
  offlineExpiresAt: string;
}

export interface ProviderPreference {
  id?: string;
  external_reference?: string;
  items?: CheckoutPreferenceItem[];
  shipments?: { cost?: number };
  metadata?: unknown;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
  date_of_expiration?: string;
  init_point?: string;
  sandbox_init_point?: string;
}

export interface PreferenceSearchResult {
  elements?: Array<{ id?: string }>;
  total?: number;
}

export interface PreferenceProvider {
  create(): Promise<ProviderPreference>;
  get(preferenceId: string): Promise<ProviderPreference>;
  searchByExternalReference(externalReference: string): Promise<PreferenceSearchResult>;
}

export interface PreferencePersistence {
  claimCreation(externalReference: string): Promise<boolean>;
  attach(preferenceId: string): Promise<boolean>;
  recordFailure(errorCode: PreferenceFailureCode): Promise<void>;
}

export type PreferenceFailureCode =
  | 'preference_creation_in_progress'
  | 'preference_provider_failed'
  | 'preference_outcome_unknown'
  | 'preference_persistence_failed'
  | 'preference_recovery_failed'
  | 'preference_recovery_conflict';

export class CheckoutPreferenceExpiredError extends Error {}
export class CheckoutPreferenceRecoveryPendingError extends Error {}
export class CheckoutPreferenceRecoveryConflictError extends Error {}
export class CheckoutPreferenceProviderError extends Error {
  readonly providerCode: string;

  constructor(
    providerCode: string,
    options?: ErrorOptions
  ) {
    super('Mercado Pago rechazó la operación de preferencia.', options);
    this.providerCode = providerCode;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cents(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const amount = Math.round(value * 100);
  return Math.abs(value * 100 - amount) < 1e-6 && Number.isSafeInteger(amount)
    ? amount
    : null;
}

function timestamp(value: unknown) {
  if (typeof value !== 'string') return null;
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function sameTimestamp(actual: unknown, expected: string) {
  return timestamp(actual) === timestamp(expected);
}

function canonicalItems(items: CheckoutPreferenceItem[]) {
  return items
    .map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unitPriceCents: cents(item.unit_price),
      currency: item.currency_id,
    }))
    .sort((left, right) =>
      `${left.id}\u0000${left.title}`.localeCompare(`${right.id}\u0000${right.title}`)
    );
}

export function validatePreference(
  preference: ProviderPreference,
  expected: CheckoutPreferenceSnapshot
) {
  const issues: string[] = [];
  if (typeof preference.id !== 'string' || !preference.id) issues.push('id');
  if (preference.external_reference !== expected.externalReference) {
    issues.push('external_reference');
  }

  const metadata = isRecord(preference.metadata) ? preference.metadata : null;
  if (metadata?.order_id !== expected.externalReference) issues.push('metadata.order_id');
  if (Number(metadata?.expected_total_cents) !== expected.totalCents) {
    issues.push('metadata.expected_total_cents');
  }

  if (preference.expires !== true) issues.push('expires');
  if (!sameTimestamp(preference.expiration_date_from, expected.validFrom)) {
    issues.push('expiration_date_from');
  }
  if (!sameTimestamp(preference.expiration_date_to, expected.expiresAt)) {
    issues.push('expiration_date_to');
  }
  if (!sameTimestamp(preference.date_of_expiration, expected.offlineExpiresAt)) {
    issues.push('date_of_expiration');
  }

  const actualItems = Array.isArray(preference.items) ? preference.items : [];
  const normalizedActual = canonicalItems(actualItems);
  const normalizedExpected = canonicalItems(expected.items);
  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    issues.push('items');
  }
  if (normalizedActual.some((item) => item.currency !== expected.currency)) {
    issues.push('currency');
  }

  const itemTotalCents = normalizedActual.reduce((total, item) => {
    if (item.unitPriceCents === null || !Number.isInteger(item.quantity)) return NaN;
    return total + item.unitPriceCents * item.quantity;
  }, 0);
  const shippingCents = cents(preference.shipments?.cost ?? 0);
  if (
    shippingCents === null ||
    shippingCents !== expected.shippingCents ||
    itemTotalCents + shippingCents !== expected.totalCents
  ) {
    issues.push('total');
  }

  return { valid: issues.length === 0, issues };
}

function validateLegacyPreference(
  preference: ProviderPreference,
  preferenceId: string,
  externalReference: string
) {
  return (
    preference.id === preferenceId &&
    (!preference.external_reference ||
      preference.external_reference === externalReference)
  );
}

function checkoutUrl(preference: ProviderPreference) {
  const value = preference.init_point ?? preference.sandbox_init_point;
  if (!value) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:' &&
      (hostname === 'mercadopago.com' ||
        hostname.endsWith('.mercadopago.com') ||
        hostname === 'mercadopago.com.mx' ||
        hostname.endsWith('.mercadopago.com.mx'))
      ? value
      : null;
  } catch {
    return null;
  }
}

function providerErrorDetails(error: unknown) {
  if (!isRecord(error)) return { status: 0, code: 'unknown_provider_error' };
  return {
    status: typeof error.status === 'number' ? error.status : 0,
    code: typeof error.error === 'string' && error.error
      ? error.error
      : 'unknown_provider_error',
  };
}

export function isAmbiguousProviderError(error: unknown) {
  const { status } = providerErrorDetails(error);
  return (
    status === 0 ||
    status === 409 ||
    status === 423 ||
    status === 424 ||
    status === 429 ||
    status >= 500
  );
}

function requiresRecovery(errorCode: string | null) {
  return errorCode !== null && errorCode !== 'preference_provider_failed';
}

async function safelyRecordFailure(
  persistence: PreferencePersistence,
  errorCode: PreferenceFailureCode
) {
  try {
    await persistence.recordFailure(errorCode);
  } catch {
    // Recording diagnostics must not replace the original safe failure.
  }
}

function ensureActive(expiresAt: string | null, now: () => Date) {
  if (expiresAt && timestamp(expiresAt)! <= now().getTime()) {
    throw new CheckoutPreferenceExpiredError('checkout_preference_expired');
  }
}

async function recoverPreference(
  provider: PreferenceProvider,
  persistence: PreferencePersistence,
  expected: CheckoutPreferenceSnapshot
) {
  let search: PreferenceSearchResult;
  try {
    search = await provider.searchByExternalReference(expected.externalReference);
  } catch (error) {
    await safelyRecordFailure(persistence, 'preference_recovery_failed');
    const { code } = providerErrorDetails(error);
    if (!isAmbiguousProviderError(error)) {
      throw new CheckoutPreferenceProviderError(code, { cause: error });
    }
    throw new CheckoutPreferenceRecoveryPendingError(
      'checkout_preference_recovery_pending',
      { cause: error }
    );
  }

  const elements = Array.isArray(search.elements) ? search.elements : [];
  // Search pagination metadata is advisory. A zero total is never treated as
  // proof that a previous create did not reach Mercado Pago.
  if (
    search.total !== 1 ||
    elements.length !== 1 ||
    typeof elements[0]?.id !== 'string' ||
    !elements[0].id
  ) {
    if ((search.total ?? 0) > 1 || elements.length > 1) {
      await safelyRecordFailure(persistence, 'preference_recovery_conflict');
      throw new CheckoutPreferenceRecoveryConflictError(
        'checkout_preference_recovery_conflict'
      );
    }
    await safelyRecordFailure(persistence, 'preference_recovery_failed');
    throw new CheckoutPreferenceRecoveryPendingError(
      'checkout_preference_recovery_pending'
    );
  }

  let preference: ProviderPreference;
  try {
    preference = await provider.get(elements[0].id);
  } catch (error) {
    await safelyRecordFailure(persistence, 'preference_recovery_failed');
    throw new CheckoutPreferenceRecoveryPendingError(
      'checkout_preference_recovery_pending',
      { cause: error }
    );
  }

  if (!validatePreference(preference, expected).valid) {
    await safelyRecordFailure(persistence, 'preference_recovery_conflict');
    throw new CheckoutPreferenceRecoveryConflictError(
      'checkout_preference_recovery_conflict'
    );
  }
  return preference;
}

export async function resolveCheckoutPreference({
  action,
  preferenceId,
  preferenceErrorCode,
  expected,
  provider,
  persistence,
  now = () => new Date(),
}: {
  action: PreferenceAction;
  preferenceId: string | null;
  preferenceErrorCode: string | null;
  expected: CheckoutPreferenceSnapshot;
  provider: PreferenceProvider;
  persistence: PreferencePersistence;
  now?: () => Date;
}) {
  if (action === 'expired') {
    throw new CheckoutPreferenceExpiredError('checkout_preference_expired');
  }

  let preference: ProviderPreference;
  let recovered = false;

  if (action === 'reuse_active' || action === 'reuse_legacy') {
    if (!preferenceId) {
      throw new CheckoutPreferenceRecoveryConflictError('missing_preference_id');
    }
    preference = await provider.get(preferenceId);
    const valid = action === 'reuse_legacy'
      ? validateLegacyPreference(preference, preferenceId, expected.externalReference)
      : validatePreference(preference, expected).valid;
    if (!valid) {
      throw new CheckoutPreferenceRecoveryConflictError(
        'checkout_preference_recovery_conflict'
      );
    }
  } else if (requiresRecovery(preferenceErrorCode)) {
    preference = await recoverPreference(provider, persistence, expected);
    recovered = true;
  } else {
    const claimed = await persistence.claimCreation(expected.externalReference);
    if (!claimed) {
      throw new CheckoutPreferenceRecoveryPendingError(
        'checkout_preference_recovery_pending'
      );
    }

    try {
      preference = await provider.create();
    } catch (error) {
      const { code } = providerErrorDetails(error);
      if (isAmbiguousProviderError(error)) {
        await safelyRecordFailure(persistence, 'preference_outcome_unknown');
        throw new CheckoutPreferenceRecoveryPendingError(
          'checkout_preference_recovery_pending',
          { cause: error }
        );
      }
      await safelyRecordFailure(persistence, 'preference_provider_failed');
      throw new CheckoutPreferenceProviderError(code, { cause: error });
    }

    if (!validatePreference(preference, expected).valid) {
      await safelyRecordFailure(persistence, 'preference_recovery_conflict');
      throw new CheckoutPreferenceRecoveryConflictError(
        'checkout_preference_recovery_conflict'
      );
    }
  }

  const preferenceIdentifier = preference.id;
  if (!preferenceIdentifier) {
    throw new CheckoutPreferenceRecoveryConflictError('missing_preference_id');
  }

  if (action === 'create') {
    try {
      const attached = await persistence.attach(preferenceIdentifier);
      if (!attached) throw new Error('order_not_found');
    } catch (error) {
      await safelyRecordFailure(persistence, 'preference_persistence_failed');
      throw new CheckoutPreferenceRecoveryPendingError(
        'checkout_preference_recovery_pending',
        { cause: error }
      );
    }
  }

  const redirectUrl = checkoutUrl(preference);
  if (!redirectUrl) {
    throw new CheckoutPreferenceRecoveryConflictError(
      'invalid_mercadopago_checkout_url'
    );
  }

  // Re-check immediately before handing the remote URL to the caller. The
  // association intentionally remains durable if the request crossed 30 min.
  ensureActive(action === 'reuse_legacy' ? null : expected.expiresAt, now);

  return {
    preferenceId: preferenceIdentifier,
    checkoutUrl: redirectUrl,
    recovered,
  };
}
