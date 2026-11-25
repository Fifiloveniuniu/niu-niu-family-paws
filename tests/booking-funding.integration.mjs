import { workspaceStore } from '../apps/api/src/workspace.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { bookingStore, BookingConflict } from '../apps/api/src/bookings.ts';
import { testPaymentStore } from '../apps/api/src/test-payments.ts';
import { balanceStore } from '../apps/api/src/balances.ts';
import { initialPricing } from '../apps/api/src/pricing.ts';
import { buildApp } from '../apps/api/src/app.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085'
)
  throw Error('Demo emulator required');
const admin = { uid: 'funding-admin', admin: true, google: true, email_verified: true };
async function fixture(
  t,
  { days = 5, card = 'none', expired = false, holiday = false, missingPrice = false } = {},
) {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, randomUUID());
  const db = getFirestore(app, 'integration-' + randomUUID());
  t.after(async () => {
    await db.terminate();
    await deleteApp(app);
  });
  const cid = randomUUID(),
    pid = randomUUID(),
    hid = randomUUID(),
    rid = randomUUID();
  const accountRef = db.doc(`customers/${cid}/pets/${pid}/balances/boarding`),
    cardRef = db.doc(`customers/${cid}/testPayments/card`);
  const input = {
    operationId: randomUUID(),
    version: 0,
    customerId: cid,
    petId: pid,
    houseId: hid,
    roomId: rid,
    arrival: '2030-06-01T17:00:00.000Z',
    pickup: '2030-06-03T17:00:00.000Z',
  };
  const config = initialPricing();
  config.rates = missingPrice
    ? []
    : [
        {
          id: 'test-rate',
          kind: 'boarding',
          species: 'dog',
          name: 'TEST',
          nameZh: '测试',
          nameEs: 'Prueba',
          minWeightLb: 0,
          maxWeightLb: 100,
          minCents: 5000,
          maxCents: 5000,
          days: null,
          comparisonRateId: null,
          comparisonWeightLb: null,
          source: 'TEST',
          active: true,
        },
      ];
  config.holidays = holiday ? ['2030-06-02'] : [];
  await Promise.all([
    db.doc('customers/' + cid).set({ id: cid, name: 'TEST Customer', ownerUid: 'owner' }),
    db
      .doc(`customers/${cid}/pets/${pid}`)
      .set({ id: pid, customerId: cid, name: 'TEST Pet', species: 'dog', weightKg: 5 }),
    db
      .doc('houses/' + hid)
      .set({ id: hid, name: 'TEST House', address: 'TEST ONLY', timezone: 'America/Los_Angeles' }),
    db.doc(`houses/${hid}/rooms/${rid}`).set({
      id: rid,
      houseId: hid,
      name: 'TEST Room',
      capacity: 20,
      costs: { dog: 1, cat: 1, rabbit: 1 },
    }),
    accountRef.set({
      customerId: cid,
      petId: pid,
      service: 'boarding',
      days,
      version: 1,
      validFrom: '2030-01-01',
      validThrough: expired ? '2030-05-31' : '2030-12-31',
      createdAt: '2029-01-01T00:00:00.000Z',
      updatedAt: '2029-01-01T00:00:00.000Z',
    }),
    db.doc('configuration/pricing').set(config),
    cardRef.set({
      scenario: card,
      last4: card === 'none' ? null : card === 'approved' ? '4242' : '0002',
      version: 1,
    }),
  ]);
  const store = bookingStore(db, () => Date.parse('2029-01-01T00:00:00Z'), true),
    payments = testPaymentStore(db);
  async function quote(value = input) {
    return store.quote(admin, value);
  }
  async function save(value = input, id = randomUUID()) {
    const q = await quote(value);
    return store.save(admin, id, { ...value, quoteToken: q.token });
  }
  return { db, cid, pid, hid, rid, input, store, payments, quote, save, accountRef, cardRef };
}
const issue = (key) => (e) => e instanceof BookingConflict && e.issue === key;
test('sufficient balance is charged atomically without a card; replay does not charge twice', async (t) => {
  const f = await fixture(t);
  const q = await f.quote();
  assert.equal(q.days, 3);
  assert.equal(q.balanceDays, 3);
  assert.equal(q.cardCents, 0);
  const id = randomUUID(),
    body = { ...f.input, quoteToken: q.token };
  const saved = await f.store.save(admin, id, body);
  assert.equal(saved.billingStatus, 'balance');
  assert.equal((await f.accountRef.get()).data().days, 2);
  assert.deepEqual(await f.store.save(admin, id, body), saved);
  assert.equal((await f.accountRef.collection('events').get()).size, 1);
  assert.equal((await f.db.collection('balanceOperations').get()).size, 1);
  assert.equal((await f.cardRef.collection('charges').get()).size, 0);
  const ledger = await balanceStore(f.db).read(admin, f.cid, f.pid);
  assert.equal(ledger.events[0].delta, -3);
  assert.equal(ledger.events[0].daysAfter, 2);
  const activity = await workspaceStore(f.db).events(admin, {
    customerId: f.cid,
    kind: 'booking_charge',
  });
  assert.equal(activity.items.length, 1);
  assert.equal(activity.items[0].event.kind, 'booking_charge');
  assert.equal(activity.items[0].event.delta, -3);
  assert.equal(activity.items[0].event.daysAfter, 2);
});
test('insufficient balance with no card rejects without booking, locks, or deduction', async (t) => {
  const f = await fixture(t, { days: 1 });
  const q = await f.quote();
  assert.equal(q.issue, 'payment_required');
  await assert.rejects(f.save(), issue('payment_required'));
  assert.equal((await f.accountRef.get()).data().days, 1);
  assert.equal((await f.db.collection('bookings').get()).size, 0);
  assert.equal((await f.db.collection('houseSchedules').get()).size, 0);
});
test('mixed balance and test card charge exactly the uncovered days plus separate holiday fee', async (t) => {
  const f = await fixture(t, { days: 1, card: 'approved', holiday: true });
  const q = await f.quote();
  assert.equal(q.balanceDays, 1);
  assert.equal(q.uncoveredDays, 2);
  assert.equal(q.holidayCents, 1000);
  assert.equal(q.cardCents, 11000);
  const saved = await f.save();
  assert.equal(saved.billingStatus, 'test_paid');
  assert.equal((await f.accountRef.get()).data().days, 0);
  const history = await f.payments.read(admin, f.cid);
  assert.equal(history.charges.length, 1);
  assert.equal(history.charges[0].amountCents, 11000);
  assert.equal(history.charges[0].bookingId, saved.id);
  const replay = await f.store.save(admin, saved.id, { ...f.input, quoteToken: q.token });
  assert.equal(replay.id, saved.id);
  assert.equal((await f.payments.read(admin, f.cid)).charges.length, 1);
});
test('declined card leaves balance, booking and charge history untouched', async (t) => {
  const f = await fixture(t, { days: 1, card: 'declined' });
  await assert.rejects(f.save(), issue('payment_declined'));
  assert.equal((await f.accountRef.get()).data().days, 1);
  assert.equal((await f.db.collection('bookings').get()).size, 0);
  assert.equal((await f.cardRef.collection('charges').get()).size, 0);
});
test('expired balance is not spent; valid card pays full stay', async (t) => {
  const f = await fixture(t, { expired: true, card: 'approved' });
  const q = await f.quote();
  assert.equal(q.balanceDays, 0);
  assert.equal(q.cardCents, 15000);
  await f.save();
  assert.equal((await f.accountRef.get()).data().days, 5);
});
test('holiday fee requires a card even with sufficient days; missing prices cannot be fabricated', async (t) => {
  const f = await fixture(t, { holiday: true });
  assert.equal((await f.quote()).issue, 'payment_required');
  await assert.rejects(f.save(), issue('payment_required'));
  const g = await fixture(t, { days: 0, card: 'approved', missingPrice: true });
  assert.equal((await g.quote()).issue, 'price_missing');
  await assert.rejects(g.save(), issue('price_missing'));
});
test('stale quotes and concurrent saves cannot spend the same days twice', async (t) => {
  const f = await fixture(t, { days: 3 });
  const a = f.input,
    b = {
      ...a,
      operationId: randomUUID(),
      arrival: '2030-06-08T17:00:00.000Z',
      pickup: '2030-06-10T17:00:00.000Z',
    };
  const [qa, qb] = await Promise.all([f.quote(a), f.quote(b)]);
  const results = await Promise.allSettled([
    f.store.save(admin, randomUUID(), { ...a, quoteToken: qa.token }),
    f.store.save(admin, randomUUID(), { ...b, quoteToken: qb.token }),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await f.accountRef.get()).data().days, 0);
  assert.equal((await f.db.collection('bookings').get()).size, 1);
  const rejected = results.find((r) => r.status === 'rejected');
  assert.equal(rejected.reason.issue, 'quote_changed');
});
test('capacity conflicts do not write card charges or consume days', async (t) => {
  const f = await fixture(t, { days: 1, card: 'approved' });
  await f.db.doc(`houses/${f.hid}/rooms/${f.rid}`).update({ capacity: 0.5 });
  await assert.rejects(f.save(), (e) => e instanceof BookingConflict);
  assert.equal((await f.accountRef.get()).data().days, 1);
  assert.equal((await f.cardRef.collection('charges').get()).size, 0);
});
test('test payment authorization, validation, stale writes and production isolation', async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.payments.read({ uid: 'stranger', google: true }, f.cid));
  const api = buildApp({
    verify: async (token) =>
      token === 'admin' ? admin : { uid: token, google: true, email_verified: true },
    store: {},
    testPayments: f.payments,
    bookings: f.store,
  });
  t.after(() => api.close());
  const url = `/api/customers/${f.cid}/test-payments`;
  assert.equal((await api.inject({ url })).statusCode, 401);
  assert.equal(
    (await api.inject({ url, headers: { authorization: 'Bearer stranger' } })).statusCode,
    403,
  );
  assert.equal(
    (
      await api.inject({
        method: 'PUT',
        url,
        headers: { authorization: 'Bearer admin' },
        payload: { version: 1, scenario: 'approved', number: '4242424242424242' },
      })
    ).statusCode,
    400,
  );
  const card = await f.payments.save(admin, f.cid, { version: 1, scenario: 'approved' });
  assert.equal(card.last4, '4242');
  await assert.rejects(f.payments.save(admin, f.cid, { version: 1, scenario: 'declined' }));
  const disabled = buildApp({ verify: async () => admin, store: {} });
  t.after(() => disabled.close());
  assert.equal(
    (
      await disabled.inject({
        url: '/api/payment-capabilities',
        headers: { authorization: 'Bearer admin' },
      })
    ).json().testMode,
    false,
  );
  assert.equal(
    (await disabled.inject({ url, headers: { authorization: 'Bearer admin' } })).statusCode,
    404,
  );
  assert.throws(() => testPaymentStore({ projectId: 'niu-niu-family-paws' }));
});
test('same-house-local-date costs one day across UTC midnight; charged handoffs remain usable', async (t) => {
  const f = await fixture(t);
  f.input.arrival = '2028-12-01T02:00:00.000Z';
  f.input.pickup = '2028-12-01T05:00:00.000Z';
  await f.accountRef.update({ validFrom: '2028-01-01', validThrough: '2030-12-31' });
  assert.equal((await f.quote()).days, 1);
  const saved = await f.save();
  const checked = await f.store.action(admin, saved.id, {
    operationId: randomUUID(),
    version: saved.version,
    action: 'check_in',
    at: saved.arrival,
  });
  assert.equal(checked.status, 'in_care');
  const out = await f.store.action(admin, saved.id, {
    operationId: randomUUID(),
    version: checked.version,
    action: 'check_out',
    at: saved.pickup,
  });
  assert.equal(out.status, 'completed');
  assert.equal((await f.accountRef.get()).data().days, 4);
});
test('removed payment method, changed price and forged quote tokens require re-review without side effects', async (t) => {
  const f = await fixture(t, { days: 0, card: 'approved' });
  const q = await f.quote();
  await f.payments.save(admin, f.cid, { version: 1, scenario: 'none' });
  await assert.rejects(
    f.store.save(admin, randomUUID(), { ...f.input, quoteToken: q.token }),
    issue('quote_changed'),
  );
  await f.payments.save(admin, f.cid, { version: 2, scenario: 'approved' });
  const next = await f.quote();
  await f.db.doc('configuration/pricing').update({ version: 1 });
  await assert.rejects(
    f.store.save(admin, randomUUID(), { ...f.input, quoteToken: next.token }),
    issue('quote_changed'),
  );
  await assert.rejects(
    f.store.save(admin, randomUUID(), { ...f.input, quoteToken: '0'.repeat(64) }),
    issue('quote_changed'),
  );
  assert.equal((await f.db.collection('bookings').get()).size, 0);
  assert.equal((await f.cardRef.collection('charges').get()).size, 0);
});
test('all-card funding creates no fabricated balance; card history pages stay scoped and newest first', async (t) => {
  const f = await fixture(t, { days: 0, card: 'approved' });
  await f.accountRef.delete();
  const q = await f.quote();
  assert.equal(q.balanceAfter, 0);
  assert.equal(q.cardCents, 15000);
  await f.save();
  assert.equal((await f.accountRef.get()).exists, false);
  for (let n = 0; n < 27; n++)
    await f.cardRef
      .collection('charges')
      .doc(randomUUID())
      .set({
        id: randomUUID(),
        bookingId: randomUUID(),
        amountCents: 100,
        last4: '4242',
        at: new Date(Date.parse('2029-01-02T00:00:00Z') + n * 1000).toISOString(),
      });
  // Use canonical document IDs in the pagination fixtures, as real transaction writes do.
  for (const doc of (await f.cardRef.collection('charges').get()).docs)
    await doc.ref.update({ id: doc.id });
  const first = await f.payments.read(admin, f.cid);
  assert.equal(first.charges.length, 25);
  assert.ok(first.nextCursor);
  assert.ok(first.charges[0].at > first.charges[24].at);
  const second = await f.payments.read(admin, f.cid, first.nextCursor);
  assert.equal(second.charges.length, 3);
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.charges, ...second.charges].map((c) => c.id)).size, 28);
  await assert.rejects(f.payments.read(admin, f.cid, randomUUID()));
  assert.equal((await f.payments.read({ uid: 'owner', google: true }, f.cid)).card.last4, '4242');
});
test('moving a charged booking preserves its original funding without charging again; date changes require a reviewed adjustment', async (t) => {
  const f = await fixture(t, { days: 1, card: 'approved' });
  const saved = await f.save();
  const rid = randomUUID();
  await f.db.doc(`houses/${f.hid}/rooms/${rid}`).set({
    id: rid,
    houseId: f.hid,
    name: 'TEST alternate room',
    capacity: 20,
    costs: { dog: 1, cat: 1, rabbit: 1 },
  });
  const moved = await f.store.save(admin, saved.id, {
    ...f.input,
    operationId: randomUUID(),
    version: saved.version,
    roomId: rid,
    quoteToken: saved.funding.token,
  });
  assert.equal(moved.roomId, rid);
  assert.deepEqual(moved.funding, saved.funding);
  assert.equal(moved.billingStatus, 'test_paid');
  assert.equal((await f.accountRef.get()).data().days, 0);
  assert.equal((await f.cardRef.collection('charges').get()).size, 1);
  await assert.rejects(
    f.store.save(admin, saved.id, {
      ...f.input,
      operationId: randomUUID(),
      version: moved.version,
      roomId: rid,
      pickup: '2030-06-04T17:00:00.000Z',
    }),
    issue('charged_edit'),
  );
  assert.equal((await f.cardRef.collection('charges').get()).size, 1);
});

test('booking activity values are persisted with the transaction and returned from the saved database snapshot', async (t) => {
  const f = await fixture(t);
  const saved = await f.save();
  const op = f.db.doc('bookingOperations/' + f.input.operationId),
    receipt = (await op.get()).data();
  assert.equal(receipt.activity.delta, 0);
  assert.equal(receipt.activity.daysAfter, null);
  assert.equal(receipt.activity.validFrom, '2030-06-01');
  await op.update({ 'activity.reason': 'Stored activity note' });
  const result = await workspaceStore(f.db).events(admin, { customerId: f.cid, kind: 'booking' });
  assert.equal(result.items[0].event.delta, receipt.activity.delta);
  assert.equal(result.items[0].event.reason, 'Stored activity note');
  assert.equal((await f.accountRef.get()).data().days, 2);
});

test('payment filters scan bounded history, retain card metadata and enforce owner scope', async (t) => {
  const f = await fixture(t, { days: 0, card: 'approved' });
  const batch = f.db.batch();
  for (let n = 0; n < 262; n++) {
    const id = randomUUID();
    batch.set(f.cardRef.collection('charges').doc(id), {
      id,
      bookingId:
        n === 0
          ? 'deadbeef-0000-4000-8000-000000000001'
          : 'abcdefab-1111-4111-8111-' + String(n).padStart(12, '7'),
      amountCents: 1000 + n,
      last4: n === 258 ? '0002' : '4242',
      at: new Date(Date.parse('2029-01-01T00:00:00Z') + n * 1000).toISOString(),
    });
  }
  await batch.commit();
  const first = await f.payments.read(admin, f.cid, undefined, 25, { search: 'DEADBEEF' });
  assert.equal(first.charges.length, 0);
  assert.ok(first.nextCursor);
  assert.equal(first.card.last4, '4242');
  const second = await f.payments.read(admin, f.cid, first.nextCursor, 25, { search: 'DEADBEEF' });
  assert.equal(second.charges.length, 1);
  assert.equal(second.charges[0].bookingId, 'deadbeef-0000-4000-8000-000000000001');
  assert.equal(second.nextCursor, null);
  const byCard = await f.payments.read(admin, f.cid, undefined, 25, { search: '0002' });
  assert.equal(byCard.charges.length, 1);
  assert.equal(byCard.charges[0].last4, '0002');
  const dated = await f.payments.read(admin, f.cid, undefined, 25, {
    from: '2029-01-01T00:00:10Z',
    through: '2029-01-01T00:00:20Z',
    search: '4242',
  });
  assert.equal(dated.charges.length, 10);
  assert.equal(dated.nextCursor, null);
  assert.equal(dated.charges[0].at, '2029-01-01T00:00:19.000Z');
  await assert.rejects(
    f.payments.read({ uid: 'stranger', google: true }, f.cid, undefined, 25, { search: '4242' }),
  );
  await assert.rejects(
    f.payments.read(admin, f.cid, undefined, 25, {
      from: '2029-02-01T00:00:00Z',
      through: '2029-01-01T00:00:00Z',
    }),
  );
  const api = buildApp({ verify: async () => admin, store: {}, testPayments: f.payments });
  t.after(() => api.close());
  for (const query of [
    'from=bad',
    'from=2029-02-01T00:00:00Z&through=2029-01-01T00:00:00Z',
    'search=' + 'x'.repeat(81),
  ]) {
    assert.equal(
      (
        await api.inject({
          url: `/api/customers/${f.cid}/test-payments?${query}`,
          headers: { authorization: 'Bearer admin' },
        })
      ).statusCode,
      400,
    );
  }
});
