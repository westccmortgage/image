// ---------------------------------------------------------------------------
// Formatting helpers. Pure, deterministic, locale-stable (en-US).
// ---------------------------------------------------------------------------

const currency0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const currency2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $196,381 (no cents) — used in the dominant headline. */
export function formatMoney(value: number): string {
  return currency0.format(Math.round(value));
}

/** $196,381.22 (with cents) — used in itemized tables. */
export function formatMoneyExact(value: number): string {
  return currency2.format(value);
}

/** 89.35% */
export function formatPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

/** Round to cents to avoid floating point noise in displayed totals. */
export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
