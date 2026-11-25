import { initializeApp } from 'firebase-admin/app';
import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { bookingActivity } from '../apps/api/src/booking-activity.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Demo emulators required for local activity backfill');
const apply = process.argv.includes('--apply');
initializeApp({ projectId: 'demo-niu-niu' });
const db = getFirestore();
const report = {
  mode: apply ? 'apply' : 'dry-run',
  bookingReceipts: 0,
  missingActivity: 0,
  balanceChargeLabels: 0,
  updated: 0,
};
async function scan(collection, visit) {
  let last;
  for (;;) {
    let query = db.collection(collection).orderBy(FieldPath.documentId()).limit(250);
    if (last) query = query.startAfter(last);
    const page = await query.get();
    for (const doc of page.docs) await visit(doc);
    if (page.size < 250) break;
    last = page.docs.at(-1);
  }
}
try {
  await scan('bookingOperations', async (doc) => {
    report.bookingReceipts++;
    if (doc.data().activity) return;
    const result = doc.data().result;
    if (!result?.arrival || !result?.pickup || !result?.timezone)
      throw Error('Incomplete booking receipt; no data inferred');
    report.missingActivity++;
    if (!apply) return;
    await db.runTransaction(async (tx) => {
      const current = await tx.get(doc.ref);
      if (current.data().activity) return;
      const activity = bookingActivity(current.data().result),
        at = new Date().toISOString();
      tx.update(doc.ref, { activity });
      tx.create(db.doc('localBackfills/activity-v1/records/' + doc.id), {
        source: doc.ref.path,
        before: null,
        after: activity,
        at,
      });
    });
    report.updated++;
  });
  await scan('balanceOperations', async (doc) => {
    const op = doc.data();
    if (op.kind !== 'booking_charge' || !op.bookingId) return;
    const event = db.doc(
      `customers/${op.customerId}/pets/${op.petId}/balances/boarding/events/${doc.id}`,
    );
    const saved = await event.get();
    if (!saved.exists) throw Error('Recorded booking charge is missing its balance event');
    if (saved.data().kind === 'booking_charge') return;
    report.balanceChargeLabels++;
    if (!apply) return;
    await db.runTransaction(async (tx) => {
      const current = await tx.get(event);
      if (current.data().kind === 'booking_charge') return;
      tx.update(event, { kind: 'booking_charge' });
      tx.create(db.doc('localBackfills/activity-charge-label-v1/records/' + doc.id), {
        source: event.path,
        before: current.data().kind ?? null,
        after: 'booking_charge',
        at: new Date().toISOString(),
      });
    });
    report.updated++;
  });
  console.log(JSON.stringify(report));
} finally {
  await db.terminate();
}
