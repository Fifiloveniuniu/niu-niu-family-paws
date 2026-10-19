// Uses the existing Firebase CLI login; never creates or stores a service-account key.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const cliAuth = require('firebase-tools/lib/auth');
const email = process.argv[2];
const revoke = process.argv[3] === '--revoke';
if (!email || !email.includes('@') || (process.argv[3] && !revoke)) {
  console.error('Usage: node scripts/admin-access.mjs <verified-google-email> [--revoke]');
  process.exit(1);
}
const project = 'niu-niu-family-paws';
try {
  const account = cliAuth.getGlobalDefaultAccount();
  if (!account) throw new Error('Run npx firebase login first.');
  const { access_token: token } = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  async function request(operation, body) {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:${operation}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`Firebase ${operation} failed (${response.status}).`);
    return result;
  }
  const { users } = await request('lookup', { email: [email] });
  const user = users?.[0];
  if (!user || user.email?.toLowerCase() !== email.toLowerCase()) throw new Error('Account not found. Sign in to the hosted administrator portal first.');
  if (!revoke && (!user.emailVerified || user.disabled || !user.providerUserInfo?.some(p => p.providerId === 'google.com'))) {
    throw new Error('Administrator grants require an active, verified Google account.');
  }
  const claims = JSON.parse(user.customAttributes || '{}');
  if (revoke) delete claims.admin;
  else claims.admin = true;
  await request('update', { localId: user.localId, customAttributes: JSON.stringify(claims), ...(revoke ? { validSince: String(Math.floor(Date.now() / 1000)) } : {}) });
  console.log(`Administrator access ${revoke ? 'revoked' : 'granted'}. Refresh access in the portal.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
