import type { Firestore } from 'firebase-admin/firestore';
import { accessKey } from './access-management.ts';
import type { Auth } from 'firebase-admin/auth';
import type { Identity } from './request-context.ts';
/** Tokens establish identity; current account state establishes access on every request. */
export function firebaseIdentity(auth: Auth, db: Firestore): (token: string) => Promise<Identity> {
  return async (token) => {
    const decoded = await auth.verifyIdToken(token, true);
    const user = await auth.getUser(decoded.uid);
    if (
      user.disabled ||
      decoded.firebase.sign_in_provider !== 'google.com' ||
      !user.providerData.some((provider) => provider.providerId === 'google.com')
    )
      throw new Error('Active Google account required');
    const policy = (await db.doc('accountAccess/' + accessKey(user.uid)).get()).data();
    if (policy && policy.status !== 'active') throw new Error('Suspended account');
    return {
      uid: user.uid,
      admin: policy ? policy.admin === true : user.customClaims?.admin,
      employee: policy ? policy.employee === true : user.customClaims?.employee,
      email_verified: user.emailVerified && decoded.email_verified === true,
      google:
        decoded.firebase.sign_in_provider === 'google.com' &&
        user.providerData.some((provider) => provider.providerId === 'google.com'),
      email: user.email,
    };
  };
}
