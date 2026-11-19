import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { pricingStore } from '../apps/api/src/pricing.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085'
)
  throw Error('Isolated demo Firestore required');
test('pricing saves are versioned, audited and retry-safe without rewriting history', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'pricing-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, 'integration-pricing-' + randomUUID()),
    store = pricingStore(db);
  const initial = await store.get();
  const { updatedAt, ...base } = initial;
  const input = { ...base, operationId: randomUUID(), holidays: ['2026-12-25'] };
  const saved = await store.save(input, 'admin-one');
  assert.equal(saved.version, 1);
  assert.deepEqual(await store.save(input, 'admin-one'), saved);
  await assert.rejects(() => store.save({ ...input, holidayPercent: 25 }, 'admin-one'));
  await assert.rejects(() => store.save(input, 'admin-two'));
  const history = await db.doc('configuration/pricing/history/1').get();
  assert.equal(history.data().actor, 'admin-one');
  assert.equal(history.data().before.version, 0);
  const replacement = { ...input, operationId: randomUUID(), version: 1, holidayPercent: 25 };
  const competing = await Promise.allSettled([
    store.save(replacement, 'admin-one'),
    store.save({ ...replacement, operationId: randomUUID(), holidayPercent: 30 }, 'admin-two'),
  ]);
  assert.equal(competing.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await store.get()).version, 2);
  assert.deepEqual((await db.doc('configuration/pricing/history/1').get()).data(), history.data());
  assert.equal((await db.collection('configuration/pricing/history').get()).size, 2);
  const current = await store.get();
  const { updatedAt: ignored, ...fields } = current;
  await assert.rejects(() =>
    store.save({ ...fields, rates: fields.rates.slice(1), operationId: randomUUID() }, 'admin-one'),
  );
});
