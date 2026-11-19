// Fictional workflow data only. Never connects to production or replaces saved edits.
import { createHash } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { houseStore } from '../apps/api/src/houses.ts';
import { roomStore } from '../apps/api/src/rooms.ts';
import { balanceStore } from '../apps/api/src/balances.ts';
import { bookingStore } from '../apps/api/src/bookings.ts';
import { validityTemplateStore } from '../apps/api/src/validity-templates.ts';
import { wallNow, wallDateKey, shiftDay, resolveWallTime } from '../apps/web/src/wall-time.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Demo emulators required');
await import('./prepare-local-booking.mjs');
const app = initializeApp({ projectId: 'demo-niu-niu' }),
  db = getFirestore(app, process.env.FAMILY_PAWS_FIXTURE_DATABASE ?? '(default)');
const id = (label) => {
  const h = createHash('sha256').update(label).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const actor = { uid: 'local-workflow-fixtures', admin: true },
  zone = 'America/Los_Angeles',
  today = wallDateKey(wallNow(zone));
const at = (offset, hour = 10) => {
  const value = resolveWallTime(
    shiftDay(today, offset) + `T${String(hour).padStart(2, '0')}:00`,
    zone,
  );
  if (value.choices.length !== 1) throw Error('Ambiguous fixture time');
  return value.choices[0];
};
const houses = houseStore(db),
  rooms = roomStore(db),
  balances = balanceStore(db),
  bookings = bookingStore(db),
  templates = validityTemplateStore(db);
const report = {
  createdHouses: 0,
  createdRooms: 0,
  createdBalances: 0,
  createdSyntheticWeights: 0,
  createdBookings: 0,
  createdTemplates: 0,
  skippedConflicts: [],
  preservedExisting: true,
};
try {
  const catalogs = [];
  for (let h = 0; h < 2; h++) {
    const hid = id('workflow-house-' + h);
    if (!(await db.doc('houses/' + hid).get()).exists) {
      await houses.save(
        hid,
        {
          name: `[TEST / 测试] ${h === 0 ? 'Garden' : 'Meadow'} house`,
          address: `[TEST ONLY] ${h === 0 ? 'Garden' : 'Meadow'} sample location — not a business address`,
          timezone: zone,
          version: 0,
        },
        actor.uid,
      );
      report.createdHouses++;
    }
    const row = { hid, rooms: {} };
    for (const species of ['dog', 'cat', 'rabbit']) {
      const rid = id(`workflow-room-${h}-${species}`);
      row.rooms[species] = rid;
      if (!(await db.doc(`houses/${hid}/rooms/${rid}`).get()).exists) {
        await rooms.save(
          hid,
          rid,
          {
            name: `[TEST / 测试] ${species} room`,
            capacity: 2,
            costs: { dog: 1, cat: 1, rabbit: 1 },
            version: 0,
          },
          actor.uid,
        );
        report.createdRooms++;
      }
    }
    catalogs.push(row);
  }
  for (let i = 0; i < 100; i++) {
    const cid = id('local-photo-customer-' + i),
      customer = await db.doc('customers/' + cid).get();
    if (!customer.exists || customer.data().testFixture !== true) continue;
    for (const species of ['dog', 'cat', 'rabbit']) {
      const pid = id(`local-photo-${species}-${i}`),
        petRef = db.doc(`customers/${cid}/pets/${pid}`),
        pet = await petRef.get();
      if (!pet.exists || pet.data().testFixture !== true || pet.data().species !== species)
        continue;
      if (pet.data().testFixture === true && pet.data().weightKg === undefined)
        await db.runTransaction(async (tx) => {
          const current = await tx.get(petRef),
            before = current.data();
          if (!before || before.testFixture !== true || before.weightKg !== undefined) return;
          const weightKg =
            species === 'dog'
              ? [8, 12.5, 24][i % 3]
              : species === 'cat'
                ? [3.5, 4.5, 6][i % 3]
                : [1.2, 1.8, 2.4][i % 3];
          const next = {
            ...before,
            weightKg,
            version: before.version + 1,
            updatedAt: new Date().toISOString(),
          };
          tx.update(petRef, { weightKg, version: next.version, updatedAt: next.updatedAt });
          tx.create(petRef.collection('history').doc(String(next.version)), {
            actor: actor.uid,
            source: 'test-fixture',
            at: next.updatedAt,
            before,
            after: next,
          });
          report.createdSyntheticWeights++;
        });

      if (!(await petRef.collection('balances').doc('boarding').get()).exists) {
        await balances.adjust(actor, cid, pid, {
          operationId: id(`workflow-balance-${cid}-${pid}`),
          version: 0,
          delta: [30, 14, 60][i % 3],
          validFrom: shiftDay(today, -60),
          validThrough: shiftDay(today, i % 10 === 9 ? -1 : 365),
          reason: '[TEST ONLY] Fictional manual credit; no payment collected',
        });
        report.createdBalances++;
      }
    }
  }
  for (const [index, range] of [
    [0, [-30, 365]],
    [1, [-90, -1]],
  ]) {
    const tid = id('workflow-validity-template-' + index);
    if (!(await db.doc('validityTemplates/' + tid).get()).exists) {
      await templates.save(
        tid,
        {
          operationId: id('workflow-template-operation-' + index),
          version: 0,
          name: index === 0 ? '[TEST / 测试] Sample coverage' : '[TEST / 测试] Expired coverage',
          validFrom: shiftDay(today, range[0]),
          validThrough: shiftDay(today, range[1]),
          active: true,
        },
        actor.uid,
      );
      report.createdTemplates++;
    }
  }
  const scenarios = [
    { family: 0, from: -5, to: -2, state: 'completed', house: 0 },
    { family: 1, from: -1, to: 2, state: 'in_care', house: 0 },
    { family: 2, from: 3, to: 6, state: 'planned', house: 0 },
    { family: 3, from: 7, to: 9, state: 'planned', house: 0 },
    { family: 4, from: -3, to: -1, state: 'in_care', house: 1 },
    { family: 5, from: 3, to: 5, state: 'cancelled', house: 0 },
  ];
  for (const scenario of scenarios)
    for (const species of ['dog', 'cat', 'rabbit']) {
      const cid = id('local-photo-customer-' + scenario.family),
        pid = id(`local-photo-${species}-${scenario.family}`),
        bid = id(`workflow-booking-${scenario.family}-${species}`);
      if ((await db.doc('bookings/' + bid).get()).exists) continue;
      const [customer, pet] = await Promise.all([
        db.doc('customers/' + cid).get(),
        db.doc(`customers/${cid}/pets/${pid}`).get(),
      ]);
      if (customer.data()?.testFixture !== true || pet.data()?.testFixture !== true) continue;
      try {
        let booking = await bookings.save(actor, bid, {
          operationId: id(bid + '-save'),
          version: 0,
          customerId: cid,
          petId: pid,
          houseId: catalogs[scenario.house].hid,
          roomId: catalogs[scenario.house].rooms[species],
          arrival: at(scenario.from),
          pickup: at(scenario.to),
        });
        if (['in_care', 'completed'].includes(scenario.state))
          booking = await bookings.action(actor, bid, {
            operationId: id(bid + '-arrival'),
            version: booking.version,
            action: 'check_in',
            at: booking.arrival,
          });
        if (scenario.state === 'completed')
          await bookings.action(actor, bid, {
            operationId: id(bid + '-pickup'),
            version: booking.version,
            action: 'check_out',
            at: booking.pickup,
          });
        if (scenario.state === 'cancelled')
          await bookings.action(actor, bid, {
            operationId: id(bid + '-cancel'),
            version: booking.version,
            action: 'cancel',
            at: new Date().toISOString(),
          });
        report.createdBookings++;
      } catch (error) {
        if (
          error.name === 'BookingConflict' ||
          error.constructor.name === 'BookingConflict' ||
          error.constructor.name === 'Conflict'
        )
          report.skippedConflicts.push(bid);
        else throw error;
      }
    }
  console.log(JSON.stringify(report));
} finally {
  await deleteApp(app);
}
