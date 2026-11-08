import { ManualPricingError } from './types';

export const MANUAL_PRICING_POLICY_VERSION = 'manual-pricing-v1';
export const FUTURE_SELLER_WHOLESALE_MAX_BPS = 3500;

function money(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ManualPricingError('invalid_money');
  }
}

// Arithmetic only; this function does not authenticate or authorize a caller.
export function calculateSpecialDiscount(
  baseCents: number,
  percentageBps: number,
  maximumBps: number
) {
  money(baseCents);
  if (
    !Number.isSafeInteger(maximumBps) || maximumBps < 0 || maximumBps > 10000 ||
    !Number.isSafeInteger(percentageBps) || percentageBps < 0 || percentageBps > maximumBps
  ) {
    throw new ManualPricingError('invalid_discount');
  }
  return Number(BigInt(baseCents) * BigInt(percentageBps) / 10000n);
}

export function distributeDiscount(
  lines: readonly { key: string; baseCents: number }[],
  amountCents: number
): Map<string, number> {
  money(amountCents);
  const keys = new Set<string>();
  let base = 0n;
  for (const line of lines) {
    if (typeof line.key !== 'string' || !line.key || keys.has(line.key)) {
      throw new ManualPricingError('invalid_items');
    }
    keys.add(line.key);
    money(line.baseCents);
    base += BigInt(line.baseCents);
  }
  if (base > BigInt(Number.MAX_SAFE_INTEGER) || BigInt(amountCents) > base) {
    throw new ManualPricingError('invalid_money');
  }
  if (amountCents === 0) return new Map(lines.map(line => [line.key, 0]));
  const shares = lines.map(line => {
    const numerator = BigInt(amountCents) * BigInt(line.baseCents);
    return { key: line.key, amount: Number(numerator / base), remainder: numerator % base };
  });
  const assigned = shares.reduce((sum, line) => sum + line.amount, 0);
  shares.sort((a, b) => a.remainder === b.remainder
    ? (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
    : a.remainder > b.remainder ? -1 : 1);
  for (let index = 0; index < amountCents - assigned; index++) shares[index].amount++;
  return new Map(shares.map(line => [line.key, line.amount]));
}
