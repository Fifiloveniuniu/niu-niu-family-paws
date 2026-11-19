import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { employeeAssignmentStore } from '../apps/api/src/employee-assignments.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085'
)
  throw Error('Isolated demo Firestore required');
test('house assignments audit the administrator, reject stale writes and recheck target employee status', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'assignments-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, 'integration-assignments-' + randomUUID()),
    hid = randomUUID();
  await db.doc('houses/' + hid).set({ name: '[TEST] House' });
  let approved = true;
  const user = () => ({
    uid: 'employee',
    email: 'employee@example.test',
    emailVerified: true,
    disabled: false,
    customClaims: { employee: approved },
    providerData: [{ providerId: 'google.com' }],
  });
  const store = employeeAssignmentStore(db, {
    getUser: async () => user(),
    getUserByEmail: async () => user(),
  });
  assert.equal((await store.lookup('employee@example.test')).version, 0);
  const input = { houseIds: [hid], version: 0, operationId: randomUUID() };
  const result = await store.save('employee', input, 'admin-one');
  assert.deepEqual(await store.save('employee', input, 'admin-one'), result);
  await assert.rejects(() => store.save('employee', input, 'admin-two'));
  await assert.rejects(() =>
    store.save('employee', { ...input, operationId: randomUUID(), houseIds: [] }, 'admin-one'),
  );
  const history = (await db.doc('employeeAssignments/employee/history/1').get()).data();
  assert.equal(history.actor, 'admin-one');
  assert.deepEqual(history.after.houseIds, [hid]);
  const competing = await Promise.allSettled([
    store.save('employee', { houseIds: [], version: 1, operationId: randomUUID() }, 'admin-one'),
    store.save('employee', { houseIds: [hid], version: 1, operationId: randomUUID() }, 'admin-two'),
  ]);
  assert.equal(competing.filter((result) => result.status === 'fulfilled').length, 1);
  approved = false;
  await assert.rejects(() => store.save('employee', input, 'admin-one'));
  await assert.rejects(() => store.lookup('employee@example.test'));
  assert.deepEqual((await db.doc('employeeAssignments/employee/history/1').get()).data(), history);
});
