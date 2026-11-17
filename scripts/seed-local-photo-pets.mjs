// Reads private development GCS assets; writes only isolated demo emulators.
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { tmpdir } from 'node:os';
import path from 'node:path';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw new Error('Only isolated demo Auth/Firestore emulators are allowed');
const manifest = JSON.parse(
  await readFile(new URL('../docs/test-assets/pet-photos.json', import.meta.url), 'utf8'),
);
const bucket = 'niu-niu-family-paws-dev-pet-photos';
if (manifest.bucket !== bucket || manifest.entries.length !== 300 || manifest.testOnly !== true)
  throw new Error('Expected complete private development library');
const sha256Hex = (data) => createHash('sha256').update(data).digest('hex');
const fixtureId = (label) => {
  const digest = sha256Hex(label);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
};
const require = createRequire(import.meta.url);
const firebaseCliAuth = require('firebase-tools/lib/auth');
const account = firebaseCliAuth.getGlobalDefaultAccount();
if (!account) throw new Error('Existing Firebase CLI login required to read private source photos');
const { access_token: token } = await firebaseCliAuth.getAccessToken(account.tokens.refresh_token, [
  'https://www.googleapis.com/auth/cloud-platform',
]);
const cache = path.join(tmpdir(), 'family-paws-local-photo-cache');
await mkdir(cache, { recursive: true });
let next = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < manifest.entries.length) {
      const entry = manifest.entries[next++];
      if (
        !/^[a-f0-9]{64}$/.test(entry.sha256) ||
        !['cat', 'dog', 'rabbit'].includes(entry.species) ||
        entry.object !== `test-library/v1/${entry.species}/${entry.sha256}.webp` ||
        entry.testOnly !== true
      )
        throw new Error('Invalid cloud asset');
      const file = path.join(cache, entry.sha256 + '.webp');
      let bytes;
      try {
        bytes = await readFile(file);
      } catch {}
      if (!bytes || sha256Hex(bytes) !== entry.sha256) {
        const response = await fetch(
          `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(entry.object)}?alt=media&generation=${entry.generation}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) throw new Error(`Private source download failed (${response.status})`);
        bytes = Buffer.from(await response.arrayBuffer());
        if (sha256Hex(bytes) !== entry.sha256) throw new Error('Cloud image checksum mismatch');
        await writeFile(file, bytes);
      }
      if (bytes.length !== entry.bytes) throw new Error('Cloud image size mismatch');
    }
  }),
);
const app = initializeApp({ projectId: 'demo-niu-niu' });
const db = getFirestore(app);
const auth = getAuth(app);
try {
  const users = [
    { uid: 'local-demo-admin', email: 'local-admin@example.test', customClaims: { admin: true } },
    { uid: 'local-demo-customer', email: 'local-customer@example.test', customClaims: {} },
  ];
  for (const user of users) {
    try {
      await auth.getUser(user.uid);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      const result = await auth.importUsers([
        {
          ...user,
          emailVerified: true,
          providerData: [{ providerId: 'google.com', uid: user.email, email: user.email }],
        },
      ]);
      if (result.failureCount) throw new Error('Local demo user import failed');
    }
  }
  const groups = Object.fromEntries(
    ['cat', 'dog', 'rabbit'].map((species) => [
      species,
      manifest.entries.filter((e) => e.species === species),
    ]),
  );
  const now = new Date().toISOString();
  for (let i = 0; i < 100; i++) {
    const customerId = fixtureId('local-photo-customer-' + i);
    const ref = db.doc('customers/' + customerId);
    const name = `[TEST / 测试] Family ${String(i + 1).padStart(3, '0')}`;
    await db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (current.exists) return;
      const owner = i < 2 ? users[i] : null;
      const customer = {
        id: customerId,
        name,
        email: '',
        phone: '',
        language: i % 2 ? 'zh' : 'en',
        loginEmail: owner?.email ?? null,
        version: 1,
        createdAt: now,
        updatedAt: now,
        searchKeys: [
          ...new Set(
            [name, owner?.email ?? ''].flatMap((value) =>
              Array.from({ length: value.length }, (_, n) => value.toLowerCase().slice(0, n + 1)),
            ),
          ),
        ],
        ...(owner ? { ownerUid: owner.uid } : {}),
        testFixture: true,
      };
      tx.create(ref, customer);
      tx.create(ref.collection('history').doc('1'), {
        actor: 'local-fixture-seed',
        at: now,
        source: 'local-test',
        before: null,
        after: customer,
      });
      if (owner) tx.create(db.doc('people/' + owner.uid), { customerId, createdAt: now });
    });
    for (const species of ['cat', 'dog', 'rabbit']) {
      const entry = groups[species][i];
      const id = fixtureId(`local-photo-${species}-${i}`);
      const petRef = ref.collection('pets').doc(id);
      const petName = `[TEST / 测试] ${species} ${String(i + 1).padStart(3, '0')}`;
      await db.runTransaction(async (tx) => {
        const current = await tx.get(petRef);
        if (current.exists) return;
        const pet = {
          id,
          customerId,
          name: petName,
          photo: entry.sha256,
          version: 1,
          createdAt: now,
          updatedAt: now,
          nameKeys: Array.from({ length: petName.length }, (_, n) =>
            petName.toLowerCase().slice(0, n + 1),
          ),
          testFixture: true,
          testSpecies: species,
          photoCredit: {
            creator: entry.creator,
            sourcePage: entry.sourcePage,
            license: entry.license,
            licenseUrl: entry.licenseUrl,
          },
          sourceStorageUri: entry.storageUri,
        };
        tx.create(petRef, pet);
        tx.create(petRef.collection('history').doc('1'), {
          actor: 'local-fixture-seed',
          at: now,
          source: 'local-cloud-photo-fixture',
          before: null,
          after: pet,
        });
      });
    }
  }
  const refs = [];
  for (let i = 0; i < 100; i++)
    for (const species of ['cat', 'dog', 'rabbit'])
      refs.push(
        db.doc(
          `customers/${fixtureId('local-photo-customer-' + i)}/pets/${fixtureId(`local-photo-${species}-${i}`)}`,
        ),
      );
  const pets = await db.getAll(...refs);
  const libraryHashes = new Set(manifest.entries.map((e) => e.sha256));
  if (pets.length !== 300) throw new Error('Expected 300 local photo pets');
  for (const doc of pets) {
    const p = doc.data();
    if (!p?.photo || (libraryHashes.has(p.photo) && !p.photoCredit))
      throw new Error('Fixture without photo or required attribution');
    const bytes = await readFile(path.join(cache, p.photo + '.webp'));
    if (sha256Hex(bytes) !== p.photo) throw new Error('Fixture photo missing or corrupt');
  }
  console.log(
    'Verified 100 local families and 300 pets, each with a cloud-sourced photo. No remote data written.',
  );
  console.log(
    'Local Google emulator accounts: local-admin@example.test and local-customer@example.test',
  );
} finally {
  await deleteApp(app);
}
