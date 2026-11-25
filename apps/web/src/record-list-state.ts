/** Canonical identities include owner/pet scope and event kind where IDs can overlap. */
export function recordIdentity(item: unknown): string {
  const value = item as {
    id?: string;
    uid?: string;
    customer?: { id: string };
    pet?: { id: string };
    event?: { id: string; kind?: string };
  };
  if (value.event)
    return JSON.stringify([
      value.customer?.id,
      value.pet?.id,
      value.event.kind ?? 'balance',
      value.event.id,
    ]);
  if (value.pet) return JSON.stringify([value.customer?.id, value.pet.id]);
  if (value.uid) return value.uid;
  if (value.id) return value.id;
  throw Error('Missing canonical record identity');
}
export function appendRecords<T>(previous: T[], incoming: T[]): T[] {
  const records = new Map(previous.map((item) => [recordIdentity(item), item]));
  for (const item of incoming) records.set(recordIdentity(item), item);
  return [...records.values()];
}
