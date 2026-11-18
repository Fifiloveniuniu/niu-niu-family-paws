import type { Auth } from 'firebase-admin/auth';
import type { Identity } from './request-context.ts';
/** Tokens establish identity; current account state establishes access on every request. */
export function firebaseIdentity(auth: Auth): (token: string) => Promise<Identity> {
  return async (token) => {
    const decoded = await auth.verifyIdToken(token, true);
    const user = await auth.getUser(decoded.uid);
    if (user.disabled) throw new Error('Disabled account');
    return {
      uid: user.uid,
      admin: user.customClaims?.admin,
      email_verified: user.emailVerified && decoded.email_verified === true,
      google:
        decoded.firebase.sign_in_provider === 'google.com' &&
        user.providerData.some((provider) => provider.providerId === 'google.com'),
      email: user.email,
    };
  };
}
