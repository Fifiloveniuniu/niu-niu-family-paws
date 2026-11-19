import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firestoreStore } from '../apps/api/src/store.ts';
import { Conflict } from '../apps/api/src/app.ts';
import { petStore, PetAccess, preparePhoto, PetInvalid } from '../apps/api/src/pets.ts';
import sharp from 'sharp';
import { linkStore, LinkUnavailable } from '../apps/api/src/linking.ts';

if (
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu'
)
  throw new Error('Isolated demo Firestore emulator required');
const integrationDatabaseId = 'integration-' + randomUUID();

test('account linking requires two parties, preserves records and rejects races, stale approvals and reused codes', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'link-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const customers = firestoreStore(db);
  const identity = { uid: randomUUID(), email: 'link-owner@example.test' };
  let now = Date.now();
  let verified = true;
  let verifiedEmail = identity.email;
  const links = linkStore(
    db,
    async (uid) => {
      if (!verified) throw new Error('Disabled');
      return { uid, email: verifiedEmail };
    },
    () => now,
  );
  const c = await customers.save(
    randomUUID(),
    {
      name: 'Original customer',
      email: 'contact@example.test',
      phone: '123',
      language: 'zh',
      version: 0,
    },
    'admin',
  );
  const petRef = db.doc(`customers/${c.id}/pets/${randomUUID()}`);
  await petRef.set({ name: 'Existing pet', photo: 'private-hash' });
  const issued = await links.issue(c.id, 'admin');
  assert.equal(issued.state.status, 'open');
  const data = (await db.doc(`customers/${c.id}/accountLink/current`).get()).data();
  assert.equal(JSON.stringify(data).includes(issued.code), false);
  const result = await links.request(identity, issued.code.toLowerCase());
  assert.equal(result.status, 'requested');
  assert.deepEqual(await links.request(identity, issued.code), result);
  assert.equal(await customers.profile(identity), null);
  await assert.rejects(
    links.request({ ...identity, uid: randomUUID() }, issued.code),
    LinkUnavailable,
  );
  const state = await links.adminState(c.id);
  assert.equal(state.requestedEmail, identity.email);
  verified = false;
  await assert.rejects(
    links.decide(c.id, { action: 'approve', version: state.version, customerVersion: 1 }, 'admin'),
    LinkUnavailable,
  );
  verified = true;
  verifiedEmail = 'changed@example.test';
  await assert.rejects(
    links.decide(c.id, { action: 'approve', version: state.version, customerVersion: 1 }, 'admin'),
    Conflict,
  );
  verifiedEmail = identity.email;
  await customers.save(
    c.id,
    { name: 'Updated customer', email: c.email, phone: c.phone, language: 'zh', version: 1 },
    'admin',
  );
  await assert.rejects(
    links.decide(c.id, { action: 'approve', version: state.version, customerVersion: 1 }, 'admin'),
    Conflict,
  );
  const input = { action: 'approve', version: state.version, customerVersion: 2 };
  assert.equal((await links.decide(c.id, input, 'admin')).status, 'approved');
  assert.equal((await links.decide(c.id, input, 'admin')).status, 'approved');
  const linked = await customers.profile(identity);
  assert.equal(linked.id, c.id);
  assert.equal(linked.name, 'Updated customer');
  assert.equal(linked.phone, c.phone);
  assert.equal(linked.language, 'zh');
  assert.equal(linked.loginEmail, identity.email);
  assert.deepEqual((await petRef.get()).data(), { name: 'Existing pet', photo: 'private-hash' });
  const history = await db.doc(`customers/${c.id}/history/3`).get();
  assert.equal(history.data().actor, 'admin');
  assert.equal(history.data().effectiveUid, identity.uid);
  assert.equal(history.data().source, 'account-link');
  assert.equal((await db.doc(`customers/${c.id}`).collection('history').get()).size, 3);
  await assert.rejects(links.issue(c.id, 'admin'), Conflict);
  await assert.rejects(
    links.request({ ...identity, uid: randomUUID() }, issued.code),
    LinkUnavailable,
  );
  const make = () =>
    customers.save(
      randomUUID(),
      { name: 'Unclaimed', email: '', phone: '', language: 'en', version: 0 },
      'admin',
    );
  const other = await make();
  const old = await links.issue(other.id, 'admin');
  const replacement = await links.issue(other.id, 'admin');
  const second = { uid: randomUUID(), email: 'second@example.test' };
  await assert.rejects(links.request(second, old.code), LinkUnavailable);
  now += 86400001;
  await assert.rejects(links.request(second, replacement.code), LinkUnavailable);
  const fresh = await links.issue(other.id, 'admin');
  await links.request(second, fresh.code);
  // Registration racing approval never overwrites or merges a personal profile.
  const independent = await customers.saveProfile(second, {
    name: 'Separate profile',
    language: 'en',
    version: 0,
  });
  const waiting = await links.adminState(other.id);
  await assert.rejects(
    links.decide(
      other.id,
      { action: 'approve', version: waiting.version, customerVersion: 1 },
      'admin',
    ),
    Conflict,
  );
  assert.equal((await customers.profile(second)).id, independent.id);
  await links.decide(
    other.id,
    { action: 'reject', version: waiting.version, customerVersion: 1 },
    'admin',
  );
  assert.equal((await links.ownState(second.uid)).status, 'rejected');
  const cancel = await links.issue(other.id, 'admin');
  await links.decide(
    other.id,
    { action: 'cancel', version: cancel.state.version, customerVersion: 1 },
    'admin',
  );
  await assert.rejects(
    links.request({ uid: randomUUID(), email: 'new@example.test' }, cancel.code),
    LinkUnavailable,
  );
  // Two concurrent claimants cannot both reserve a single code.
  const race = await links.issue(other.id, 'admin');
  const claims = await Promise.allSettled([
    links.request({ uid: randomUUID(), email: 'one@example.test' }, race.code),
    links.request({ uid: randomUUID(), email: 'two@example.test' }, race.code),
  ]);
  assert.equal(claims.filter((r) => r.status === 'fulfilled').length, 1);
});
test('multiple pets share canonical ownership, private photos, audited retries and administrator search', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'pets-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const customers = firestoreStore(db);
  const files = new Map();
  const store = petStore(db, {
    put: async (key, bytes) => files.set(key, bytes),
    get: async (key) => files.get(key),
  });
  const owner = {
    uid: randomUUID(),
    email: 'pet-owner@example.test',
    google: true,
    email_verified: true,
  };
  const other = { ...owner, uid: randomUUID() };
  const admin = { ...other, admin: true };
  const customer = await customers.saveProfile(owner, {
    name: 'Pet owner sample',
    language: 'en',
    version: 0,
  });
  const id = randomUUID();
  const secondId = randomUUID();
  const input = { name: '妞妞', version: 0 };
  assert.equal((await store.list(owner, customer.id)).items.length, 0);
  const pet = await store.save(owner, customer.id, id, input);
  assert.equal(pet.photo, null);
  assert.deepEqual(await store.save(owner, customer.id, id, input), pet);
  await store.save(owner, customer.id, secondId, { name: 'Second pet', version: 0 });
  for (const operation of [
    () => store.list(other, customer.id),
    () => store.save(other, customer.id, id, { name: 'Takeover', version: 1 }),
    () => store.photo(other, customer.id, id),
    () => store.search(owner, '妞'),
  ])
    await assert.rejects(operation, PetAccess);
  const image = (
    await sharp({ create: { width: 20, height: 20, channels: 3, background: '#31594c' } })
      .png()
      .toBuffer()
  ).toString('base64');
  const photoInput = { name: '妞妞 updated', version: 1, photoData: image };
  const updated = await store.save(owner, customer.id, id, photoInput);
  assert.ok(updated.photo);
  assert.equal((await store.photo(owner, customer.id, id)).length > 0, true);
  assert.deepEqual(await store.save(owner, customer.id, id, photoInput), updated);
  assert.equal((await store.list(admin, customer.id)).items.length, 2);
  const match = await store.search(admin, '妞');
  assert.equal(match.items[0].customer.name, customer.name);
  assert.equal(match.items[0].pet.id, id);
  await customers.save(
    customer.id,
    { name: 'Canonical renamed', email: '', phone: '', language: 'en', version: 1 },
    admin.uid,
  );
  assert.equal((await store.search(admin, '妞')).items[0].customer.name, 'Canonical renamed');
  const competing = await Promise.allSettled([
    store.save(owner, customer.id, id, { name: 'Owner edit', version: 2 }),
    store.save(admin, customer.id, id, { name: 'Admin edit', version: 2 }),
  ]);
  assert.equal(competing.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok(competing.find((r) => r.status === 'rejected').reason instanceof Conflict);
  const final = await store.save(admin, customer.id, id, { name: '管理员宠物', version: 3 });
  assert.equal(final.photo, updated.photo);
  assert.equal((await store.search(admin, '妞')).items.length, 0);
  assert.equal((await store.search(admin, '管理')).items.length, 1);
  const history = await db.doc(`customers/${customer.id}/pets/${id}`).collection('history').get();
  assert.equal(history.size, 4);
  assert.equal(history.docs.at(-1).data().actor, admin.uid);
  assert.equal(history.docs.at(-1).data().source, 'admin');
  await assert.rejects(preparePhoto(Buffer.from('<svg/>').toString('base64')), PetInvalid);
  await assert.rejects(preparePhoto('bad'), PetInvalid);
  const metadata = await sharp(await preparePhoto(image)).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.exif, undefined);
  for (let index = 0; index < 52; index++)
    await store.save(admin, customer.id, randomUUID(), {
      name: 'Paging sample ' + index,
      version: 0,
    });
  const page1 = await store.search(admin, 'paging sample');
  const page2 = await store.search(admin, 'paging sample', page1.nextCursor);
  assert.equal(page1.items.length, 50);
  assert.equal(page2.items.length, 2);
  assert.equal(page2.nextCursor, null);
  assert.equal(new Set([...page1.items, ...page2.items].map((item) => item.pet.id)).size, 52);
  const ownPage1 = await store.list(owner, customer.id);
  const ownPage2 = await store.list(owner, customer.id, ownPage1.nextCursor);
  assert.equal(ownPage1.items.length, 50);
  assert.equal(ownPage2.items.length, 4);
});
test('Firestore saves are audited, retry-safe, concurrency-safe and searchable before pagination', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' });
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const store = firestoreStore(db);
  const id = randomUUID();
  const input = {
    name: 'Alice Chen',
    email: 'alice@example.test',
    phone: '',
    language: 'zh',
    version: 0,
  };
  const first = await store.save(id, input, 'admin-1');
  assert.deepEqual(await store.save(id, input, 'admin-1'), first);
  const competing = await Promise.allSettled([
    store.save(id, { ...input, name: 'Alice One', version: 1 }, 'admin-1'),
    store.save(id, { ...input, name: 'Alice Two', version: 1 }, 'admin-2'),
  ]);
  assert.equal(competing.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok(competing.find((r) => r.status === 'rejected').reason instanceof Conflict);
  const history = await db
    .collection('customers')
    .doc(id)
    .collection('history')
    .orderBy('at')
    .get();
  assert.equal(history.size, 2);
  assert.equal(history.docs[0].data().actor, 'admin-1');
  assert.equal(history.docs[1].data().before.name, 'Alice Chen');
  const latest = (await store.list(undefined, 'alice@')).items;
  assert.equal(latest.length, 1);
  assert.equal(latest[0].version, 2);
  assert.equal('searchKeys' in latest[0], false);
  assert.equal((await store.list(undefined, 'no-match')).items.length, 0);
  const chineseId = randomUUID();
  await store.save(chineseId, { ...input, name: '小王', email: '' }, 'admin-1');
  assert.equal((await store.list(undefined, '小')).items[0].id, chineseId);
  for (let index = 0; index < 52; index++)
    await store.save(randomUUID(), { ...input, name: 'Paged ' + index, email: '' }, 'admin-1');
  const page1 = await store.list(undefined, 'paged');
  assert.equal(page1.items.length, 50);
  assert.ok(page1.nextCursor);
  const page2 = await store.list(page1.nextCursor, 'paged');
  assert.equal(page2.items.length, 2);
  assert.equal(page2.nextCursor, null);
  assert.equal(new Set([...page1.items, ...page2.items].map((c) => c.id)).size, 52);
});

test('self-registration has one canonical profile across retries and roles, without claiming existing records', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'profile-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const store = firestoreStore(db);
  const owner = { uid: 'profile-' + randomUUID(), email: 'verified-owner@example.test' };
  const other = { uid: 'other-' + randomUUID(), email: 'other@example.test' };
  const unlinked = await store.save(
    randomUUID(),
    { name: 'Same Name', email: owner.email, phone: '', language: 'en', version: 0 },
    'admin',
  );
  assert.equal(await store.profile(owner), null);
  const input = { name: 'Same Name', language: 'zh', version: 0 };
  const [first, retry] = await Promise.all([
    store.saveProfile(owner, input),
    store.saveProfile(owner, input),
  ]);
  assert.equal(first.id, retry.id);
  assert.notEqual(first.id, unlinked.id);
  assert.equal((await db.collection('customers').where('ownerUid', '==', owner.uid).get()).size, 1);
  assert.equal(
    (await db.collection('customers').doc(first.id).collection('history').get()).size,
    1,
  );
  assert.equal(await store.profile(other), null);
  const adminEdit = await store.save(
    first.id,
    {
      name: 'Edited by admin',
      email: 'contact@example.test',
      phone: '',
      language: 'en',
      version: 1,
    },
    'admin',
  );
  const own = await store.profile(owner);
  assert.deepEqual(own, adminEdit);
  assert.equal(own.loginEmail, owner.email);
  assert.equal((await db.collection('customers').doc(first.id).get()).data().ownerUid, owner.uid);
  const selfEdit = await store.saveProfile(owner, {
    name: 'Self edit',
    language: 'zh',
    version: 2,
  });
  assert.equal(selfEdit.email, 'contact@example.test');
  assert.equal(selfEdit.id, first.id);
  assert.equal(
    (await store.list(undefined, 'verified-owner@')).items.find((x) => x.id === first.id).name,
    'Self edit',
  );
  await assert.rejects(
    store.saveProfile(owner, { name: 'Stale edit', language: 'en', version: 1 }),
    Conflict,
  );
  const changedIdentity = { ...owner, email: 'new-verified@example.test' };
  const refreshed = await store.profile(changedIdentity);
  assert.equal(refreshed.version, 4);
  assert.equal(refreshed.loginEmail, changedIdentity.email);
  assert.equal(
    (await store.list(undefined, 'verified-owner@')).items.some((x) => x.id === first.id),
    false,
  );
  const history = await db.collection('customers').doc(first.id).collection('history').get();
  assert.equal(history.size, 4);
  assert.equal(history.docs[2].data().actor, owner.uid);
  assert.equal(history.docs[3].data().source, 'identity-sync');
  // Even a corrupt internal reference must not turn another account into the owner.
  await db.collection('people').doc(other.uid).set({ customerId: first.id });
  await assert.rejects(store.profile(other), /ownership mismatch/);
  await assert.rejects(
    store.saveProfile(other, { name: 'Takeover', language: 'en', version: 4 }),
    /ownership mismatch/,
  );
  assert.equal((await store.profile(changedIdentity)).name, 'Self edit');
});

test('licensed fixture photo attribution survives rename and clears when a new photo replaces it', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'credits-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const customers = firestoreStore(db);
  const identity = {
    uid: randomUUID(),
    email: 'credits@example.test',
    google: true,
    email_verified: true,
  };
  const customer = await customers.saveProfile(identity, {
    name: 'Local photo sample',
    language: 'en',
    version: 0,
  });
  const photos = new Map();
  const store = petStore(db, {
    put: async (k, b) => photos.set(k, b),
    get: async (k) => photos.get(k),
  });
  const id = randomUUID();
  await store.save(identity, customer.id, id, { name: 'Test pet', version: 0 });
  const credit = {
    creator: 'Fixture author',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  };
  await db.doc(`customers/${customer.id}/pets/${id}`).update({ photoCredit: credit });
  const renamed = await store.save(identity, customer.id, id, {
    name: 'Renamed test pet',
    version: 1,
  });
  assert.deepEqual(renamed.photoCredit, credit);
  const image = await sharp({
    create: { width: 20, height: 20, channels: 3, background: '#223344' },
  })
    .png()
    .toBuffer();
  const replaced = await store.save(identity, customer.id, id, {
    name: renamed.name,
    version: renamed.version,
    photoData: image.toString('base64'),
  });
  assert.equal(replaced.photoCredit, undefined);
});

test('house edits preserve stable IDs, retry once, audit actors and reject conflicting versions', async (t) => {
  const { houseStore } = await import('../apps/api/src/houses.ts');
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'houses-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const store = houseStore(db);
  const id = randomUUID();
  const body = {
    name: 'Local test house',
    address: '',
    timezone: 'America/Los_Angeles',
    version: 0,
  };
  const first = await store.save(id, body, 'admin-one');
  assert.equal(first.id, id);
  assert.equal(first.version, 1);
  assert.deepEqual(await store.save(id, body, 'admin-one'), first);
  const edits = await Promise.allSettled([
    store.save(id, { ...body, name: 'House A', version: 1 }, 'admin-one'),
    store.save(id, { ...body, name: 'House B', version: 1 }, 'admin-two'),
  ]);
  assert.equal(edits.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    edits.filter((r) => r.status === 'rejected' && r.reason instanceof Conflict).length,
    1,
  );
  assert.equal(
    (
      await db
        .doc('houses/' + id)
        .collection('history')
        .get()
    ).size,
    2,
  );
  const audit = (await db.doc(`houses/${id}/history/2`).get()).data();
  assert.ok(['admin-one', 'admin-two'].includes(audit.actor));
  assert.equal(audit.before.name, body.name);
  assert.ok((await store.list()).items.some((h) => h.id === id && h.version === 2));
});

test('pet type and weight persist with ownership, versions, retries, legacy clients and audit history', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'pet-details-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const customers = firestoreStore(db);
  const customer = await customers.save(
    randomUUID(),
    { name: '[TEST] Details', email: '', phone: '', language: 'en', version: 0 },
    'admin',
  );
  await db.doc('customers/' + customer.id).update({ ownerUid: 'pet-owner' });
  const store = petStore(db, { put: async () => {}, get: async () => Buffer.from('') });
  const id = randomUUID();
  const admin = { uid: 'admin', admin: true };
  const owner = { uid: 'pet-owner', google: true };
  const body = { name: '[TEST] Pet', species: 'dog', weightKg: 12.75, version: 0 };
  const first = await store.save(admin, customer.id, id, body);
  assert.equal(first.species, 'dog');
  assert.equal(first.weightKg, 12.75);
  assert.deepEqual(await store.save(admin, customer.id, id, body), first);
  assert.equal((await store.list(owner, customer.id)).items[0].weightKg, 12.75);
  await assert.rejects(
    store.save({ uid: 'other', google: true }, customer.id, id, { ...body, version: 1 }),
    PetAccess,
  );
  const renamed = await store.save(owner, customer.id, id, { name: '[TEST] Renamed', version: 1 });
  assert.equal(renamed.species, 'dog');
  assert.equal(renamed.weightKg, 12.75);
  const edits = await Promise.allSettled([
    store.save(admin, customer.id, id, { name: renamed.name, weightKg: 13, version: 2 }),
    store.save(owner, customer.id, id, { name: renamed.name, weightKg: 14, version: 2 }),
  ]);
  assert.equal(edits.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok(edits.some((r) => r.status === 'rejected' && r.reason instanceof Conflict));
  const cleared = await store.save(admin, customer.id, id, {
    name: renamed.name,
    species: null,
    weightKg: null,
    version: 3,
  });
  assert.equal(cleared.species, null);
  assert.equal(cleared.weightKg, null);
  const history = await db.doc(`customers/${customer.id}/pets/${id}/history/4`).get();
  assert.equal(history.data().actor, 'admin');
  assert.ok([13, 14].includes(history.data().before.weightKg));
});

test('persisted rooms require a configured house, audit retries and protect occupied capacity', async (t) => {
  const { roomStore } = await import('../apps/api/src/rooms.ts');
  const { houseStore } = await import('../apps/api/src/houses.ts');
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'rooms-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const hid = randomUUID();
  await houseStore(db).save(
    hid,
    {
      name: '[TEST] House',
      address: '[TEST] Address',
      timezone: 'America/Los_Angeles',
      version: 0,
    },
    'admin',
  );
  const store = roomStore(db);
  const rid = randomUUID();
  const input = { name: '[TEST] Room', capacity: 2, costs: { dog: 1, cat: 0.5 }, version: 0 };
  const first = await store.save(hid, rid, input, 'admin');
  assert.deepEqual(await store.save(hid, rid, input, 'admin'), first);
  assert.equal((await store.list(hid)).items[0].id, rid);
  const concurrent = await Promise.allSettled([
    store.save(hid, rid, { ...input, name: '[TEST] A', version: 1 }, 'admin'),
    store.save(hid, rid, { ...input, name: '[TEST] B', version: 1 }, 'other-admin'),
  ]);
  assert.equal(concurrent.filter((r) => r.status === 'fulfilled').length, 1);
  await db.collection('bookings').doc(randomUUID()).set({
    roomId: rid,
    houseId: hid,
    status: 'planned',
    arrival: '2030-01-01T10:00:00Z',
    pickup: '2030-01-03T10:00:00Z',
    units: 2,
    species: 'dog',
  });
  await assert.rejects(
    store.save(hid, rid, { ...input, capacity: 1, version: 2 }, 'admin'),
    Conflict,
  );
  await assert.rejects(
    store.save(hid, rid, { ...input, costs: { dog: 2 }, version: 2 }, 'admin'),
    Conflict,
  );
  const expanded = await store.save(hid, rid, { ...input, capacity: 3, version: 2 }, 'admin');
  assert.equal(expanded.version, 3);
  const audit = (await db.doc(`houses/${hid}/rooms/${rid}/history/3`).get()).data();
  assert.equal(audit.actor, 'admin');
  assert.equal(audit.before.capacity, 2);
  assert.equal(audit.after.capacity, 3);
  const missing = randomUUID();
  await db.doc('houses/' + missing).set({ name: '[TEST] Legacy', address: '' });
  await assert.rejects(store.save(missing, randomUUID(), input, 'admin'), PetInvalid);
  assert.equal((await db.doc('houseSchedules/' + hid).get()).data().revision, 3);
  const independentHouse = randomUUID();
  await houseStore(db).save(
    independentHouse,
    {
      name: '[TEST] Independent',
      address: '[TEST] Independent address',
      timezone: 'UTC',
      version: 0,
    },
    'admin',
  );
  const independent = await store.save(
    independentHouse,
    rid,
    { name: '[TEST] Reused room identifier', capacity: 1, costs: { dog: 1 }, version: 0 },
    'admin',
  );
  assert.equal(independent.houseId, independentHouse);
  assert.equal(independent.capacity, 1);
});

test('boarding credits are atomic, per pet, audited and idempotent without implementing payments', async (t) => {
  const { balanceStore } = await import('../apps/api/src/balances.ts');
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'balances-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const customers = firestoreStore(db);
  const cid = randomUUID();
  await customers.save(
    cid,
    { name: '[TEST] Balance owner', email: '', phone: '', language: 'en', version: 0 },
    'admin',
  );
  await db.doc('customers/' + cid).update({ ownerUid: 'owner' });
  const pets = petStore(db, { put: async () => {}, get: async () => Buffer.from('') });
  const admin = { uid: 'admin', admin: true };
  const owner = { uid: 'owner', google: true };
  const pid = randomUUID(),
    other = randomUUID();
  await pets.save(admin, cid, pid, { name: '[TEST] Pet', version: 0 });
  await pets.save(admin, cid, other, { name: '[TEST] Other', version: 0 });
  const store = balanceStore(db);
  const input = {
    operationId: randomUUID(),
    version: 0,
    delta: 30,
    validFrom: '2028-02-29',
    validThrough: '2028-05-28',
    reason: '',
  };
  const [first, retry] = await Promise.all([
    store.adjust(admin, cid, pid, input),
    store.adjust(admin, cid, pid, input),
  ]);
  assert.deepEqual(first, retry);
  assert.equal(first.days, 30);
  const ownRead = await store.read(owner, cid, pid);
  assert.equal(ownRead.events.length, 1);
  assert.equal(ownRead.events[0].actor, undefined);
  assert.equal((await store.read(admin, cid, pid)).events[0].actor, 'admin');
  await assert.rejects(store.read({ uid: 'other', google: true }, cid, pid), PetAccess);
  await assert.rejects(
    store.adjust(owner, cid, pid, { ...input, operationId: randomUUID() }),
    PetAccess,
  );
  await assert.rejects(store.adjust(admin, cid, other, input), Conflict);
  const edits = await Promise.allSettled([
    store.adjust(admin, cid, pid, { ...input, operationId: randomUUID(), version: 1, delta: 5 }),
    store.adjust(admin, cid, pid, { ...input, operationId: randomUUID(), version: 1, delta: 7 }),
  ]);
  assert.equal(edits.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok(edits.some((r) => r.status === 'rejected' && r.reason instanceof Conflict));
  assert.deepEqual(await store.adjust(admin, cid, pid, input), first); // Replay returns original result; never applies twice.
  await assert.rejects(store.adjust(admin, cid, pid, { ...input, delta: 31 }), Conflict);
  await assert.rejects(
    store.adjust(admin, cid, pid, { ...input, operationId: randomUUID(), version: 2, delta: -100 }),
    PetInvalid,
  );
  await assert.rejects(
    store.adjust(admin, cid, pid, {
      ...input,
      operationId: randomUUID(),
      version: 2,
      delta: 1,
      validFrom: '2027-02-29',
    }),
    PetInvalid,
  );
  const current = (await store.read(admin, cid, pid)).account;
  assert.ok([35, 37].includes(current.days));
  assert.equal(current.version, 2);
  assert.equal((await store.read(admin, cid, other)).account, null);
  const adjusted = await store.adjust(admin, cid, pid, {
    ...input,
    operationId: randomUUID(),
    version: 2,
    delta: -5,
    reason: '[TEST] Correction',
  });
  assert.equal(adjusted.days, current.days - 5);
  assert.equal((await store.read(owner, cid, pid)).events.length, 3);
  const ops = await db.collection('balanceOperations').where('petId', '==', pid).get();
  assert.equal(ops.size, 3);
  assert.equal(ops.docs.filter((doc) => doc.data().before === null).length, 1);
  const batch = db.batch();
  for (let version = 4; version <= 55; version++)
    batch.create(db.doc(`customers/${cid}/pets/${pid}/balances/boarding/events/${randomUUID()}`), {
      id: randomUUID(),
      customerId: cid,
      petId: pid,
      version,
      delta: 0,
      daysAfter: adjusted.days,
      validFrom: input.validFrom,
      validThrough: input.validThrough,
      reason: '[TEST] Pagination',
      actor: 'admin',
      at: '2026-11-18T00:00:00Z',
    });
  await batch.commit();
  const page1 = await store.read(owner, cid, pid);
  assert.equal(page1.events.length, 50);
  assert.equal(page1.nextCursor, 6);
  const page2 = await store.read(owner, cid, pid, page1.nextCursor);
  assert.equal(page2.events.length, 5);
  assert.equal(page2.nextCursor, null);
  assert.equal(new Set([...page1.events, ...page2.events].map((e) => e.version)).size, 55);
});

test('bookings atomically protect whole-stay capacity, cross-house pet isolation, editing and actual handoffs', async (t) => {
  const { bookingStore, BookingConflict, BookingPolicyMissing } =
    await import('../apps/api/src/bookings.ts');
  const { houseStore } = await import('../apps/api/src/houses.ts');
  const { roomStore } = await import('../apps/api/src/rooms.ts');
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'bookings-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, integrationDatabaseId);
  const customers = firestoreStore(db);
  const admin = { uid: 'booking-admin', admin: true };
  const owner = { uid: 'booking-owner', google: true };
  const cid = randomUUID();
  await customers.save(
    cid,
    { name: '[TEST] Private customer', email: '', phone: '', language: 'en', version: 0 },
    admin.uid,
  );
  await db.doc('customers/' + cid).update({ ownerUid: owner.uid });
  await db.doc('people/' + owner.uid).set({ customerId: cid });
  const pets = petStore(db, { put: async () => {}, get: async () => Buffer.from('') });
  const pids = Array.from({ length: 6 }, () => randomUUID());
  for (const [index, id] of pids.entries())
    await pets.save(admin, cid, id, {
      name: '[TEST] Secret pet ' + index,
      species: index === 5 ? 'cat' : 'dog',
      weightKg: 10,
      version: 0,
    });
  const houses = houseStore(db),
    rooms = roomStore(db);
  const hid = randomUUID(),
    otherHouse = randomUUID();
  for (const id of [hid, otherHouse])
    await houses.save(
      id,
      {
        name: '[TEST] Booking house',
        address: '[TEST] Isolated address',
        timezone: 'America/Los_Angeles',
        version: 0,
      },
      admin.uid,
    );
  const rid = randomUUID(),
    otherRoom = randomUUID(),
    careRoom = randomUUID();
  await rooms.save(
    hid,
    rid,
    { name: '[TEST] One place', capacity: 1, costs: { dog: 1, cat: 1 }, version: 0 },
    admin.uid,
  );
  await rooms.save(
    otherHouse,
    otherRoom,
    { name: '[TEST] Other room', capacity: 2, costs: { dog: 1 }, version: 0 },
    admin.uid,
  );
  await rooms.save(
    hid,
    careRoom,
    { name: '[TEST] Care room', capacity: 1, costs: { dog: 1 }, version: 0 },
    admin.uid,
  );
  let now = Date.parse('2026-11-18T10:00:00.000Z');
  const store = bookingStore(db, () => now);
  const body = {
    operationId: randomUUID(),
    version: 0,
    customerId: cid,
    petId: pids[0],
    houseId: hid,
    roomId: rid,
    arrival: '2030-01-01T10:00:00.000Z',
    pickup: '2030-01-03T10:00:00.000Z',
  };
  const ids = [randomUUID(), randomUUID()];
  const inputs = ids.map((_, index) => ({
    ...body,
    petId: pids[index],
    operationId: randomUUID(),
  }));
  const race = await Promise.allSettled(
    ids.map((id, index) => store.save(admin, id, inputs[index])),
  );
  // An exhausted emulator transaction retry may surface before the domain conflict.
  // Replay the identical operation after the winner commits; never accept overbooking.
  for (const [index, result] of race.entries()) {
    if (result.status === 'rejected' && [4, 10, 14].includes(result.reason?.code)) {
      [race[index]] = await Promise.allSettled([store.save(admin, ids[index], inputs[index])]);
    }
  }
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1, JSON.stringify(race));
  assert.ok(
    race.some(
      (r) =>
        r.status === 'rejected' &&
        r.reason instanceof BookingConflict &&
        r.reason.issue === 'capacity',
    ),
    JSON.stringify(
      race,
      Object.getOwnPropertyNames(new Error()).concat([
        'status',
        'reason',
        'value',
        'code',
        'issue',
      ]),
    ),
  );
  const first = race.find((r) => r.status === 'fulfilled').value;
  assert.equal(first.billingStatus, 'unbilled');
  assert.equal(first.status, 'planned');
  const edits = await Promise.allSettled([
    store.save(admin, first.id, {
      ...body,
      petId: first.petId,
      version: 1,
      operationId: randomUUID(),
      pickup: '2030-01-04T10:00:00.000Z',
    }),
    store.save(admin, first.id, {
      ...body,
      petId: first.petId,
      version: 1,
      operationId: randomUUID(),
      pickup: '2030-01-05T10:00:00.000Z',
    }),
  ]);
  assert.equal(edits.filter((r) => r.status === 'fulfilled').length, 1);
  const edited = edits.find((r) => r.status === 'fulfilled').value;
  const own = await store.list(owner);
  assert.ok(own.items.some((b) => b.id === first.id));
  await assert.rejects(store.list({ ...owner, uid: 'other' }, cid), PetAccess);
  const proposal = {
    ...body,
    petId: pids[2],
    operationId: randomUUID(),
    houseId: otherHouse,
    roomId: otherRoom,
  };
  await assert.rejects(store.save(owner, randomUUID(), proposal), BookingPolicyMissing);
  const beforeOps = (await db.collection('bookingOperations').get()).size;
  const globalAttempts = [
    { id: randomUUID(), input: proposal },
    {
      id: randomUUID(),
      input: { ...proposal, houseId: hid, roomId: careRoom, operationId: randomUUID() },
    },
  ];
  const globalRace = await Promise.allSettled(
    globalAttempts.map((attempt) => store.save(admin, attempt.id, attempt.input)),
  );
  assert.equal(globalRace.filter((r) => r.status === 'fulfilled').length, 1);
  const rejectedIndex = globalRace.findIndex((r) => r.status === 'rejected');
  const rejected = globalRace[rejectedIndex];
  assert.ok(rejected.reason instanceof BookingConflict || rejected.reason.code === 10);
  await assert.rejects(
    store.save(admin, globalAttempts[rejectedIndex].id, globalAttempts[rejectedIndex].input),
    (e) => e instanceof BookingConflict && e.issue === 'pet_overlap',
  );
  const av = await store.availability(owner, {
    customerId: cid,
    petId: pids[5],
    arrival: body.arrival,
    pickup: body.pickup,
  });
  const occupied = av.rooms.find((r) => r.roomId === rid);
  assert.equal(occupied.available, false);
  assert.equal(occupied.issue, 'species');
  assert.equal(JSON.stringify(av).includes('Secret pet'), false);
  assert.equal(JSON.stringify(av).includes('Private customer'), false);
  await assert.rejects(
    store.availability(
      { ...owner, uid: 'other' },
      { customerId: cid, petId: pids[5], arrival: body.arrival, pickup: body.pickup },
    ),
    PetAccess,
  );
  const planInput = {
    ...body,
    petId: pids[3],
    roomId: careRoom,
    arrival: '2026-11-18T09:00:00.000Z',
    pickup: '2026-11-18T11:00:00.000Z',
    operationId: randomUUID(),
  };
  const care = await store.save(admin, randomUUID(), planInput);
  assert.deepEqual(await store.save(admin, care.id, planInput), care);
  await assert.rejects(
    store.save(admin, care.id, { ...planInput, pickup: '2026-11-18T12:00:00.000Z' }),
    Conflict,
  );
  const checkIn = {
    operationId: randomUUID(),
    version: 1,
    action: 'check_in',
    at: '2026-11-18T09:30:00.000Z',
  };
  const checked = await store.action(admin, care.id, checkIn);
  assert.equal(checked.actualArrival, checkIn.at);
  assert.deepEqual(await store.action(admin, care.id, checkIn), checked);
  now = Date.parse('2026-11-18T12:00:00.000Z');
  await assert.rejects(
    store.save(admin, randomUUID(), {
      ...body,
      petId: pids[4],
      roomId: careRoom,
      operationId: randomUUID(),
    }),
    (e) => e instanceof BookingConflict && e.issue === 'overdue',
  );
  // Pickup remains possible if a profile's optional care details were cleared afterwards.
  await pets.save(admin, cid, pids[3], { name: '[TEST] Updated', species: null, version: 1 });
  const completed = await store.action(admin, care.id, {
    operationId: randomUUID(),
    version: 2,
    action: 'check_out',
    at: '2026-11-18T11:30:00.000Z',
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.actualPickup, '2026-11-18T11:30:00.000Z');
  const historic = await store.list(owner, undefined, undefined, {
    from: '2026-11-18T00:00:00.000Z',
    through: '2026-11-19T00:00:00.000Z',
  });
  assert.ok(historic.items.some((b) => b.id === care.id));
  assert.equal(
    historic.items.some((b) => b.id === edited.id),
    false,
  );
  const later = await store.list(owner, undefined, undefined, {
    from: '2030-01-01T00:00:00.000Z',
    through: '2030-01-06T00:00:00.000Z',
  });
  assert.ok(later.items.some((b) => b.id === edited.id));
  assert.equal(
    later.items.some((b) => b.id === care.id),
    false,
  );
  const cancellation = {
    operationId: randomUUID(),
    version: edited.version,
    action: 'cancel',
    at: '2026-11-18T11:00:00.000Z',
  };
  const cancelled = await store.action(admin, edited.id, cancellation);
  assert.equal(cancelled.status, 'cancelled');
  assert.deepEqual(await store.action(admin, edited.id, cancellation), cancelled);
  const raceRoom = randomUUID();
  await rooms.save(
    hid,
    raceRoom,
    { name: '[TEST] Configuration race', capacity: 2, costs: { dog: 2 }, version: 0 },
    admin.uid,
  );
  const reconfigure = await Promise.allSettled([
    rooms.save(
      hid,
      raceRoom,
      { name: '[TEST] Configuration race', capacity: 1, costs: { dog: 2 }, version: 1 },
      admin.uid,
    ),
    store.save(admin, randomUUID(), {
      ...body,
      petId: pids[4],
      roomId: raceRoom,
      arrival: '2031-01-01T10:00:00.000Z',
      pickup: '2031-01-03T10:00:00.000Z',
      operationId: randomUUID(),
    }),
  ]);
  assert.equal(reconfigure.filter((r) => r.status === 'fulfilled').length, 1);
  const history = (await db.doc(`bookings/${care.id}/history/3`).get()).data();
  assert.equal(history.actor, admin.uid);
  assert.equal(history.effectiveCustomerId, cid);
  assert.equal(history.kind, 'check_out');
  assert.equal(history.before.status, 'in_care');
  assert.equal((await db.collection('bookingOperations').get()).size > beforeOps, true);
});
