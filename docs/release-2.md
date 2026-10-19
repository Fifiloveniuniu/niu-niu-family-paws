# Administrator sign-in

The administrator portal is at `/#/admin`, linked from the public website footer. It supports English and Simplified Chinese, Google sign-in, access refresh, and sign-out. Sessions use Firebase browser session persistence.

Only a verified Google account with the boolean custom claim `admin: true` sees the dashboard. Signing in does not grant a role. No customer data or business API is included in this release. Future APIs must independently verify Firebase tokens, revocation, roles, and ownership; the browser check is only the dashboard display boundary.

## Project setup

Enable Google in Firebase Authentication for `niu-niu-family-paws`, using an owner-approved consent support email. Authorized domains must include `localhost`, `niu-niu-family-paws.web.app`, and `niu-niu-family-paws.firebaseapp.com`.

After the owner-selected account signs in once, a trusted project administrator runs:

```sh
npm run admin:access -- owner-approved-email@example.com
```

The script requires the existing Firebase CLI login and checks the target account is active, Google-linked, and verified. It preserves unrelated custom claims. To revoke access:

```sh
npm run admin:access -- owner-approved-email@example.com --revoke
```

Refresh access in the portal after changes. Existing ID tokens can remain valid until expiry; future APIs must check revocation. No service account key is generated.

## Validation

Use Node 24 (`.nvmrc`). Run `npm ci`, `npm test`, and `npm run build`. The PR validation workflow runs tests and the production build. Browser verification must cover signed-out, denied, administrator, sign-out, language persistence, and mobile states before release is marked complete.

## Verification on 2026-10-19

Production Google provider is enabled. Real Google sign-in from the local preview succeeded and correctly showed the denied-access screen for an account without the administrator claim. Unit tests, both isolated browser tests, production build, and GitHub CI passed. The owner confirmed niuniupetsitting@gmail.com as administrator. Its role was granted through trusted tooling and the production administrator dashboard was verified in the local Chrome preview. Cloud billing remains disabled, blocking hosted customer-management work.
