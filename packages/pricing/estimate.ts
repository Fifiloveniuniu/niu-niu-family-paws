import { boardingRate, type PricingConfig } from './calculations.ts';
/** Display estimate only. It never allocates balances, creates a charge, or persists a quote. */
export function estimateBoarding(
  config: PricingConfig,
  species: string,
  weightKg: number | null | undefined,
  firstDay: string,
  lastDay: string,
) {
  const parse = (day: string) => {
    const at = Date.parse(day + 'T00:00:00Z');
    return /^\d{4}-\d{2}-\d{2}$/.test(day) &&
      Number.isFinite(at) &&
      new Date(at).toISOString().slice(0, 10) === day
      ? at
      : NaN;
  };
  const start = parse(firstDay),
    end = parse(lastDay);
  const count = (end - start) / 86400000 + 1;
  if (!Number.isInteger(count) || count <= 0 || count > 367) return null;
  const dates = Array.from({ length: count }, (_, i) =>
    new Date(start + i * 86400000).toISOString().slice(0, 10),
  );
  const holidayDays = dates.filter((day) => config.holidays.includes(day)).length;
  const rate =
    weightKg != null && Number.isFinite(weightKg) && weightKg > 0
      ? boardingRate(config.rates, species, Math.round(weightKg * 2.2046226218 * 1e6) / 1e6)
      : null;
  const base = (n: number) =>
    rate ? Number((rate.numerator * BigInt(n)) / rate.denominator) : null;
  const normalCents = base(count - holidayDays),
    holidayCents = base(holidayDays);
  const surchargeCents = rate
    ? Number(
        (rate.numerator * BigInt(holidayDays) * BigInt(config.holidayPercent)) /
          (rate.denominator * 100n),
      )
    : null;
  return {
    normalDays: count - holidayDays,
    holidayDays,
    days: count,
    dailyCents: rate?.cents ?? null,
    normalCents,
    holidayCents,
    surchargeCents,
    totalCents:
      normalCents !== null && holidayCents !== null && surchargeCents !== null
        ? normalCents + holidayCents + surchargeCents
        : null,
  };
}
