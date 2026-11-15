export const petTypes = ['cat', 'dog', 'rabbit'] as const;
export type PetType = typeof petTypes[number];
export type PetCosts = Partial<Record<PetType, number>>;
/** Three decimal places keep capacity arithmetic exact in thousandths. */
export function validCapacity(value: number): boolean {
  return Number.isFinite(value) && value >= 0.001 && value <= 1_000_000 && Number(value.toFixed(3)) === value;
}
export function maximumPets(capacity: number, cost: number): number {
  if (!validCapacity(capacity) || !validCapacity(cost)) return 0;
  return Math.floor(Math.round(capacity * 1000) / Math.round(cost * 1000));
}
