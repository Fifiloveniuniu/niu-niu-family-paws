import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { buildApp } from './app.ts';
import { firestoreStore } from './store.ts';
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
    return { uid: user.uid, admin: user.disabled ? false : user.customClaims?.admin, email_verified: user.emailVerified && decoded.email_verified === true };
  },
  store: firestoreStore(getFirestore()),
});
await app.listen({ port: Number(process.env.PORT || 8080), host: emulated ? '127.0.0.1' : '0.0.0.0' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { void app.close().then(() => process.exit(0)); });
