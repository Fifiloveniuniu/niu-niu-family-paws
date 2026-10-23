import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { petStore } from './pets.ts';
import { buildApp } from './app.ts';
import { firestoreStore } from './store.ts';
import { linkStore } from './linking.ts';
const emulated = process.env.FAMILY_PAWS_EMULATORS === 'true';
if (emulated) {
  if (process.env.GCLOUD_PROJECT !== 'demo-niu-niu' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085') throw new Error('Local testing requires isolated demo emulators.');
} else if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Emulators require explicit isolated test mode.');
}
initializeApp(emulated ? { projectId: 'demo-niu-niu' } : { credential: applicationDefault(), projectId: 'niu-niu-family-paws' });
const auth = getAuth();
const app = buildApp({
  async verify(token) {
    const decoded = await auth.verifyIdToken(token, true);
    // Read the current role too: removing a claim must immediately block existing tokens.
    const user = await auth.getUser(decoded.uid);
    if (user.disabled) throw new Error('Disabled account');
    return {
      uid: user.uid, admin: user.customClaims?.admin,
      email_verified: user.emailVerified && decoded.email_verified === true,
      google: decoded.firebase.sign_in_provider === 'google.com' && user.providerData.some(provider => provider.providerId === 'google.com'),
      email: user.email,
    };
  },
  store: firestoreStore(getFirestore()),
  links: linkStore(getFirestore(),async uid=>{
    const user = await auth.getUser(uid);
    if (user.disabled || !user.emailVerified || !user.email || !user.providerData.some(provider=>provider.providerId==='google.com')) throw new Error('Verified Google identity required');
    return {uid:user.uid,email:user.email};
  }),
  pets: petStore(getFirestore(), {
    async put(key, bytes) {
      const file = getStorage().bucket('niu-niu-family-paws-pet-photos').file(key);
      try { await file.save(bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: 'image/webp', cacheControl: 'private, no-store' } }); }
      catch (error) { if ((error as { code?: number }).code !== 412) throw error; }
    },
    async get(key) { return (await getStorage().bucket('niu-niu-family-paws-pet-photos').file(key).download())[0]; },
  }),
});
await app.listen({ port: Number(process.env.PORT || 8080), host: emulated ? '127.0.0.1' : '0.0.0.0' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { void app.close().then(() => process.exit(0)); });
