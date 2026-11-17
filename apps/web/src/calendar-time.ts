/** Fixed-duration offsets for the labelled planning prototype, not production booking rules. */
export const MILLISECONDS_PER_DAY = 86_400_000;
const SAMPLE_START_HOUR_OFFSET = 9 * 3_600_000;

export function sampleDateAtOffset(anchor: Date, dayOffset: number): Date {
  return new Date(anchor.getTime() + SAMPLE_START_HOUR_OFFSET + dayOffset * MILLISECONDS_PER_DAY);
}

export function sampleDayOffset(anchor: Date, date: Date): number {
  return (date.getTime() - anchor.getTime() - SAMPLE_START_HOUR_OFFSET) / MILLISECONDS_PER_DAY;
}
