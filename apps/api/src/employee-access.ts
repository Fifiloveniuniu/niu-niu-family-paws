import type { Identity } from './request-context.ts';
/** Assignments are trusted server records, never customer-supplied IDs or token display routing. */
export async function assignedHouses(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  identity: Identity,
): Promise<string[]> {
  if (identity.employee !== true) return [];
  const doc = await tx.get(db.doc('employeeAssignments/' + identity.uid));
  const ids = doc.data()?.houseIds;
  return Array.isArray(ids)
    ? [
        ...new Set(
          ids.filter((id): id is string => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)),
        ),
      ].slice(0, 30)
    : [];
}
export async function employeeHouse(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  identity: Identity,
  houseId?: string,
) {
  return !!houseId && (await assignedHouses(tx, db, identity)).includes(houseId);
}
