// Adds fictional persisted records only to the explicitly guarded local demo emulator.
// Existing documents, including prior fixtures edited by the owner, are never replaced.
import { createHash } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { houseStore } from '../apps/api/src/houses.ts';
import { roomStore } from '../apps/api/src/rooms.ts';
import { bookingStore } from '../apps/api/src/bookings.ts';
import { balanceStore } from '../apps/api/src/balances.ts';
import { customerSearchKeys } from '../apps/api/src/store.ts';
import { shiftDay } from '../packages/time/wall-time.ts';

if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Demo emulators required (local Auth/Firestore only)');
const app = initializeApp({ projectId: 'demo-niu-niu' });
const db = getFirestore(app, process.env.FAMILY_PAWS_FIXTURE_DATABASE ?? '(default)');
const id = (label) => {
  const h = createHash('sha256')
    .update('metrics-v1-' + label)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const actor = { uid: 'local-metrics-fixtures', admin: true };
const today = new Date().toISOString().slice(0, 10);
const houseId = id('house');
const species = ['dog', 'cat', 'rabbit'];
const report = { customers: 0, pets: 0, bookings: 0, adjustments: 0, preservedExisting: true };
async function create(ref, data) {
  return db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return false;
    tx.create(ref, data);
    return true;
  });
}
try {
  if (!(await db.doc('houses/' + houseId).get()).exists)
    await houseStore(db).save(
      houseId,
      {
        name: '[TEST / 测试] Metrics demo house',
        address: '[TEST ONLY] Fictional metrics location — not a business address',
        timezone: 'UTC',
        version: 0,
      },
      actor.uid,
    );
  for (const type of species) {
    const roomId = id('room-' + type);
    if (!(await db.doc(`houses/${houseId}/rooms/${roomId}`).get()).exists)
      await roomStore(db).save(
        houseId,
        roomId,
        {
          name: `[TEST / 测试] Metrics ${type} room`,
          capacity: 12,
          costs: { [type]: 1 },
          version: 0,
        },
        actor.uid,
      );
  }
  // Dedicated guests avoid collisions with the owner's saved demo workflows.
  for (let i = 0; i < 60; i++) {
    const customerId = id('customer-' + i),
      petId = id('pet-' + i);
    const name = `[TEST / 测试] Metrics family ${i + 1}`;
    const createdAt = shiftDay(today, -90 + Math.floor(i * 1.5)) + 'T00:00:00.000Z';
    if (
      await create(db.doc('customers/' + customerId), {
        id: customerId,
        name,
        email: '',
        phone: '',
        loginEmail: null,
        language: 'en',
        version: 1,
        createdAt,
        updatedAt: createdAt,
        searchKeys: customerSearchKeys(name, ''),
        testFixture: true,
      })
    )
      report.customers++;
    if (
      await create(db.doc(`customers/${customerId}/pets/${petId}`), {
        id: petId,
        customerId,
        name: `[TEST / 测试] Metrics ${species[i % 3]} ${i + 1}`,
        species: species[i % 3],
        weightKg: [12, 4, 2][i % 3],
        version: 1,
        createdAt,
        updatedAt: createdAt,
        testFixture: true,
      })
    )
      report.pets++;
    if (!(await db.doc(`customers/${customerId}/pets/${petId}/balances/boarding`).get()).exists) {
      const operationId = id('initial-' + i);
      await balanceStore(db).adjust(actor, customerId, petId, {
        operationId,
        version: 0,
        delta: 120,
        validFrom: shiftDay(today, -365),
        validThrough: shiftDay(today, 365),
        reason: '[TEST ONLY] Fictional manual starting credit; no payment collected',
      });
      const batch = db.batch();
      batch.update(db.doc('balanceOperations/' + operationId), { at: createdAt });
      batch.update(
        db.doc(`customers/${customerId}/pets/${petId}/balances/boarding/events/${operationId}`),
        { at: createdAt },
      );
      await batch.commit();
    }
  }
  let sequence = 0;
  for (let offset = -90; offset <= 30; offset++) {
    const day = shiftDay(today, offset),
      at = day + 'T00:00:00.000Z';
    const seed = [...day].reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 17);
    const count = seed % 5;
    const actual = offset <= 0 ? Math.max(0, count - (seed % 11 === 0 ? 1 : 0)) : 0;
    for (let j = 0; j < count; j++) {
      const index = sequence++ % 60,
        customerId = id('customer-' + index),
        petId = id('pet-' + index),
        bid = id('booking-' + day + '-' + j);
      if ((await db.doc('bookings/' + bid).get()).exists) continue;
      // All historical handoffs run through the same audited stores as normal staff plans.
      const store = bookingStore(db);
      const pickup = shiftDay(day, 2) + 'T12:00:00.000Z';
      const roomId = id('room-' + species[index % 3]);
      let row = await store.save(actor, bid, {
        operationId: id(bid + '-save'),
        version: 0,
        customerId,
        petId,
        houseId,
        roomId,
        arrival: at,
        pickup,
      });
      if (j < actual) {
        row = await store.action(actor, bid, {
          operationId: id(bid + '-arrival'),
          version: row.version,
          action: 'check_in',
          at,
        });
        if (pickup <= new Date().toISOString())
          await store.action(actor, bid, {
            operationId: id(bid + '-pickup'),
            version: row.version,
            action: 'check_out',
            at: pickup,
          });
      }
      report.bookings++;
    }
    if (offset <= 0) {
      const index = (offset + 90) % 60,
        customerId = id('customer-' + index),
        petId = id('pet-' + index),
        operationId = id('adjust-' + day);
      // Manual whole-day corrections, never fabricated automatic booking deductions/refunds.
      const delta = (seed % 7 === 0 ? 30 : 0) - actual * 2 + (seed % 19 === 0 ? 1 : 0);
      if (delta && !(await db.doc('balanceOperations/' + operationId).get()).exists) {
        const ref = db.doc(`customers/${customerId}/pets/${petId}/balances/boarding`);
        const current = (await ref.get()).data();
        await balanceStore(db).adjust(actor, customerId, petId, {
          operationId,
          version: current.version,
          delta,
          validFrom: current.validFrom,
          validThrough: current.validThrough,
          reason:
            '[TEST ONLY] Fictional manual correction for metrics; no booking charge or refund',
        });
        const batch = db.batch();
        batch.update(db.doc('balanceOperations/' + operationId), { at });
        batch.update(ref.collection('events').doc(operationId), { at });
        await batch.commit();
        report.adjustments++;
      }
    }
  }
  console.log(JSON.stringify(report));
} finally {
  await deleteApp(app);
}
