import type { components } from '../contracts/generated.ts';
export type PriceRate = components['schemas']['PriceRate'];
export type PricingConfig = components['schemas']['PricingConfig'];

// Inputs have at most six decimal places; keep interpolation rational until cent flooring.
function weightUnits(value: number): bigint {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 10000 ||
    !/^\d+(\.\d{1,6})?$/.test(String(value))
  )
    throw new Error('invalid_weight');
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
}
export function boardingRate(rates: PriceRate[], species: string, weightLb: number) {
  const weight = weightUnits(weightLb);
  const candidates = rates.filter(
    (rate) =>
      rate.active &&
      rate.kind === 'boarding' &&
      rate.species === species &&
      rate.minWeightLb !== null &&
      rate.maxWeightLb !== null &&
      weight >= weightUnits(rate.minWeightLb) &&
      weight <= weightUnits(rate.maxWeightLb),
  );
  candidates.sort((a, b) => b.minWeightLb! - a.minWeightLb!);
  const rate = candidates[0];
  if (!rate) return null;
  const low = weightUnits(rate.minWeightLb!),
    width = weightUnits(rate.maxWeightLb!) - low;
  if (width <= 0n) return null;
  const numerator =
    BigInt(rate.minCents) * width + (weight - low) * BigInt(rate.maxCents - rate.minCents);
  return { rate, numerator, denominator: width, cents: Number(numerator / width) };
}
export function packageSavings(rate: PriceRate, rates: PriceRate[]) {
  if (
    rate.kind !== 'package' ||
    !rate.days ||
    !rate.comparisonRateId ||
    rate.comparisonWeightLb === null
  )
    return null;
  const regular = boardingRate(rates, rate.species, rate.comparisonWeightLb);
  if (!regular || regular.rate.id !== rate.comparisonRateId) return null;
  const equivalent = Number((regular.numerator * BigInt(rate.days)) / regular.denominator);
  if (equivalent <= 0) return null;
  const saved = equivalent - rate.minCents;
  return {
    regularCents: equivalent,
    savingsCents: saved,
    percent: Number((BigInt(saved) * 10000n) / BigInt(equivalent)) / 100,
  };
}
export function moneyCents(input: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(input)) return null;
  const [whole, fraction = ''] = input.split('.');
  const value = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return value <= 100000000n ? Number(value) : null;
}
