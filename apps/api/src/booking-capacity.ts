export type Occupancy = {
  id: string;
  petId: string;
  houseId: string;
  roomId: string;
  species: string;
  units: number;
  arrival: string;
  pickup: string;
  status: string;
  actualArrival?: string | null;
  actualPickup?: string | null;
};
export type CapacityIssue =
  | 'pet_overlap'
  | 'species'
  | 'overdue'
  | 'turnover_unconfigured'
  | 'capacity'
  | 'room_setup'
  | null;
/** Compare decimal JSON numbers exactly, without binary floating point overbooking or false conflicts. */
export function fitsCapacity(units: number[], capacity: number) {
  const values = [...units, capacity];
  if (values.some((n) => !Number.isFinite(n) || n < 0)) return false;
  const parts = values.map((n) => {
    const [mantissa, exponent = '0'] = String(n).split('e');
    const [whole, fraction = ''] = mantissa.split('.');
    return { digits: BigInt(whole + fraction), scale: fraction.length - Number(exponent) };
  });
  const scale = Math.max(0, ...parts.map((p) => p.scale));
  const integers = parts.map((p) => p.digits * 10n ** BigInt(scale - p.scale));
  const maximum = integers.pop()!;
  return integers.reduce((sum, n) => sum + n, 0n) <= maximum;
}
export const occupancyStart = (stay: Occupancy) => Date.parse(stay.actualArrival ?? stay.arrival);
export const occupancyEnd = (stay: Occupancy, now: number) =>
  stay.status === 'in_care' && !stay.actualPickup && Date.parse(stay.pickup) < now
    ? Infinity
    : Date.parse(stay.actualPickup ?? stay.pickup);
export function capacityIssue(
  stays: Occupancy[],
  candidate: Occupancy,
  capacity: number,
  now: number,
  turnover = true,
): CapacityIssue {
  const start = occupancyStart(candidate),
    end = occupancyEnd(candidate, now);
  if (
    !Number.isFinite(capacity) ||
    capacity <= 0 ||
    !Number.isFinite(candidate.units) ||
    candidate.units <= 0
  )
    return 'room_setup';
  const active = stays.filter(
    (s) => s.id !== candidate.id && (s.status === 'planned' || s.status === 'in_care'),
  );
  if (
    active.some(
      (s) => s.petId === candidate.petId && occupancyStart(s) < end && occupancyEnd(s, now) > start,
    )
  )
    return 'pet_overlap';
  const room = active.filter(
    (s) => s.houseId === candidate.houseId && s.roomId === candidate.roomId,
  );
  if (room.some((s) => occupancyEnd(s, now) === Infinity && occupancyStart(s) < end))
    return 'overdue';
  if (turnover && room.some((s) => occupancyEnd(s, now) === start || occupancyStart(s) === end))
    return 'turnover_unconfigured';
  const overlap = room.filter((s) => occupancyStart(s) < end && occupancyEnd(s, now) > start);
  if (overlap.some((s) => s.species !== candidate.species)) return 'species';
  const points = [
    start,
    ...overlap
      .flatMap((s) => [occupancyStart(s), occupancyEnd(s, now)])
      .filter((t) => t > start && t < end),
  ];
  if (
    points.some(
      (point) =>
        !fitsCapacity(
          [
            candidate.units,
            ...overlap
              .filter((s) => occupancyStart(s) <= point && occupancyEnd(s, now) > point)
              .map((s) => s.units),
          ],
          capacity,
        ),
    )
  )
    return 'capacity';
  return null;
}
export function blockedSpans(
  stays: Occupancy[],
  candidate: Occupancy,
  capacity: number,
  from: number,
  to: number,
  now: number,
) {
  const points = [
    ...new Set([
      from,
      to,
      ...stays
        .filter((s) => s.status === 'planned' || s.status === 'in_care')
        .flatMap((s) => [occupancyStart(s), occupancyEnd(s, now)])
        .filter((t) => t > from && t < to),
    ]),
  ].sort((a, b) => a - b);
  const result: { from: string; through: string; issue: Exclude<CapacityIssue, null> }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    const issue = capacityIssue(
      stays,
      {
        ...candidate,
        status: 'planned',
        actualArrival: null,
        actualPickup: null,
        arrival: new Date(a).toISOString(),
        pickup: new Date(b).toISOString(),
      },
      capacity,
      now,
      false,
    );
    if (!issue) continue;
    const previous = result.at(-1);
    if (previous?.issue === issue && previous.through === new Date(a).toISOString())
      previous.through = new Date(b).toISOString();
    else
      result.push({ from: new Date(a).toISOString(), through: new Date(b).toISOString(), issue });
  }
  return result;
}
