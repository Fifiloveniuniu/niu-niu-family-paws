export type Placement = {
  id: string;
  name: string;
  species: string;
  house: number;
  room: number;
  start: number;
  end: number;
  status: 'in' | 'upcoming' | 'out';
  overdue?: boolean;
  units: number;
  coverage?: { service: 'boarding'; days: number };
};
export type PlacementIssue =
  'dates' | 'duplicate' | 'species' | 'overdue' | 'boundary' | 'capacity' | 'unconfigured' | null;
// Prototype only: offsets are days from the sample anchor. No booking or payment writes.
export function placementIssue(
  stays: Placement[],
  pet: string,
  species: string,
  start: number,
  end: number,
  house: number,
  room: number,
  maximum: number,
  units: number,
): PlacementIssue {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'dates';
  const activeStays = stays.filter((stay) => stay.status !== 'out');
  const occupancyEnd = (stay: Placement) => (stay.overdue ? Infinity : stay.end);
  if (
    activeStays.some((stay) => stay.name === pet && stay.start < end && occupancyEnd(stay) > start)
  )
    return 'duplicate';
  const occupants = activeStays.filter((stay) => stay.house === house && stay.room === room);
  if (occupants.some((stay) => stay.overdue && stay.start < end)) return 'overdue';
  // Turnover policy is undecided. Do not silently allow back-to-back handoffs.
  if (occupants.some((stay) => stay.end === start || stay.start === end)) return 'boundary';
  const overlappingStays = occupants.filter(
    (stay) => stay.start < end && occupancyEnd(stay) > start,
  );
  if (overlappingStays.some((stay) => stay.species !== species)) return 'species';
  if (!Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(units) || units <= 0)
    return 'unconfigured';
  const changePoints = [
    start,
    ...overlappingStays
      .flatMap((stay) => [stay.start, stay.end])
      .filter((timestamp) => timestamp > start && timestamp < end),
  ];
  if (
    changePoints.some(
      (point) =>
        units +
          overlappingStays
            .filter((stay) => stay.start <= point && occupancyEnd(stay) > point)
            .reduce((sum, stay) => sum + stay.units, 0) >
        maximum,
    )
  )
    return 'capacity';
  return null;
}

export type UnavailableRange = {
  start: number;
  end: number;
  reason: Exclude<PlacementIssue, null>;
};
// Sample occupancy changes only at stay endpoints. Evaluate each open interval,
// then join adjacent periods with the same reason; exact handoff boundaries
// still receive the separate placementIssue check when selecting a stay.
export function unavailableRanges(
  stays: Placement[],
  pet: string,
  species: string,
  from: number,
  to: number,
  house: number,
  room: number,
  maximum: number,
  units: number,
): UnavailableRange[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  const changePoints = [
    ...new Set([
      from,
      to,
      ...stays
        .filter((stay) => stay.status !== 'out')
        .flatMap((stay) => (stay.overdue ? [stay.start] : [stay.start, stay.end]))
        .filter((timestamp) => timestamp > from && timestamp < to),
    ]),
  ].sort((a, b) => a - b);
  const ranges: UnavailableRange[] = [];
  for (let intervalIndex = 0; intervalIndex < changePoints.length - 1; intervalIndex++) {
    const start = changePoints[intervalIndex];
    const end = changePoints[intervalIndex + 1];
    const middle = (start + end) / 2;
    const epsilon = Math.min((end - start) / 4, 1 / 86400000);
    const reason = placementIssue(
      stays,
      pet,
      species,
      middle - epsilon,
      middle + epsilon,
      house,
      room,
      maximum,
      units,
    );
    if (!reason) continue;
    const last = ranges.at(-1);
    if (last && last.end === start && last.reason === reason) last.end = end;
    else ranges.push({ start, end, reason });
  }
  return ranges;
}

/** Complement of blocked spans; selection must still validate the whole requested stay. */
export function availableRanges(from: number, to: number, unavailable: UnavailableRange[]) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  const result: { start: number; end: number }[] = [];
  let cursor = from;
  for (const range of [...unavailable].sort((a, b) => a.start - b.start)) {
    const start = Math.max(from, range.start);
    const end = Math.min(to, range.end);
    if (end <= cursor || start >= to) continue;
    if (start > cursor) result.push({ start: cursor, end: start });
    cursor = Math.max(cursor, end);
  }
  if (cursor < to) result.push({ start: cursor, end: to });
  return result;
}
