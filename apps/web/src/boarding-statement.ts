import { isValidDateOnly, localDateKey } from './date-utils.ts';
import type { PetBalance } from './pet-balance';
export type StatementPet = { name: string; customer: string; customerName: string };
export type StatementKind = 'added' | 'correction' | 'terms';
export type StatementEntry = {
  id: string;
  pet: string;
  customer: string;
  customerName: string;
  at: string;
  kind: StatementKind;
  delta: number;
  before: number;
  after: number;
  reason: string;
  sequence: number;
};
export type StatementFilters = {
  customer: string;
  pet: string;
  from: string;
  through: string;
  kind: string;
};
export const emptyStatementFilters: StatementFilters = {
  customer: 'all',
  pet: 'all',
  from: '',
  through: '',
  kind: 'all',
};
export function statementEntries(
  accounts: Record<string, PetBalance>,
  pets: StatementPet[],
): StatementEntry[] {
  return Object.values(accounts)
    .filter((account) => account.service === 'boarding')
    .flatMap((account) => {
      const pet = pets.find((petProfile) => petProfile.name === account.pet);
      if (!pet) return [];
      return account.history.map((entry, index) => ({
        id: entry.id,
        pet: pet.name,
        customer: pet.customer,
        customerName: pet.customerName,
        at: entry.at,
        kind:
          entry.delta > 0
            ? ('added' as const)
            : entry.delta < 0
              ? ('correction' as const)
              : ('terms' as const),
        delta: entry.delta,
        before: entry.after - entry.delta,
        after: entry.after,
        reason: entry.reason,
        sequence: index + 1,
      }));
    })
    .sort(
      (leftEntry, rightEntry) =>
        Date.parse(rightEntry.at) - Date.parse(leftEntry.at) ||
        rightEntry.sequence - leftEntry.sequence ||
        leftEntry.pet.localeCompare(rightEntry.pet),
    );
}
export function validStatementRange(from: string, through: string) {
  return (
    (!from || isValidDateOnly(from)) &&
    (!through || isValidDateOnly(through)) &&
    (!from || !through || from <= through)
  );
}
export function filterStatement(entries: StatementEntry[], filters: StatementFilters) {
  if (!validStatementRange(filters.from, filters.through)) return [];
  return entries.filter((entry) => {
    const day = localDateKey(new Date(entry.at));
    return (
      (filters.customer === 'all' || entry.customer === filters.customer) &&
      (filters.pet === 'all' || entry.pet === filters.pet) &&
      (filters.kind === 'all' || entry.kind === filters.kind) &&
      (!filters.from || day >= filters.from) &&
      (!filters.through || day <= filters.through)
    );
  });
}
export function statementTotals(entries: StatementEntry[]) {
  return entries.reduce(
    (totals, entry) => ({
      added: totals.added + Math.max(0, entry.delta ?? 0),
      removed: totals.removed + Math.max(0, -(entry.delta ?? 0)),
      net: totals.net + (entry.delta ?? 0),
    }),
    { added: 0, removed: 0, net: 0 },
  );
}
// Quote all text, protect spreadsheet formulas, and keep numeric fields numeric.
const csvCell = (value: string | number) =>
  typeof value === 'number'
    ? String(value)
    : '"' + (/^[\s]*[=+\-@]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
type ExportKind = StatementKind | 'booking' | 'cancelled' | 'booking_charge';
export function statementCsv(
  entries: (Omit<StatementEntry, 'delta' | 'before' | 'after' | 'kind'> & {
    delta: number | null;
    before: number | null;
    after: number | null;
    kind: ExportKind;
  })[],
  headers: string[],
  labels: Partial<Record<ExportKind, string>>,
) {
  const rows: (string | number)[][] = [
    headers,
    ...entries.map((event) => [
      event.at,
      event.id,
      event.customerName,
      event.pet,
      labels[event.kind] ?? event.kind,
      event.delta ?? '',
      event.before ?? '',
      event.after ?? '',
      event.reason,
    ]),
  ];
  return '\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
