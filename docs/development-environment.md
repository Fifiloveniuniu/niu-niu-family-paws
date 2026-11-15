# Separate development environment (in progress)

Requested project: `niu-niu-family-paws-dev`. Production remains `niu-niu-family-paws`.

Not delivered yet. Cloud project creation succeeded, but Firebase activation returned HTTP 403 twice for the initial `-test` project and once for `-dev`. Firebase console under the same CLI Google account shows an unchecked Firebase terms acceptance requirement. Terms acceptance and billing account choice are pending owner responses. Do not assume this proves the entire 403 cause; retry after acceptance and inspect remaining permissions if needed.

The earlier `niu-niu-family-paws-test` cloud project is unused and was not deleted. No billing was attached to either new project. No production samples have been removed.

## Prepared configuration

- `npm run build:staging` builds to `dist-dev` and requires the dev web application's public API key/app ID in ignored `.env.staging.local`. Production `npm run build` still builds to `dist`.
- `npm run deploy:dev` explicitly targets `niu-niu-family-paws-dev` and `firebase.dev.json`. Never deploy validation-placeholder builds. Dev Hosting sends noindex headers and uses dev Auth domains in CSP.
- Dev pages have a persistent English/Chinese test banner. The frontend uses the dev Firebase project; no production Auth fallback.
- Set Cloud Run `FAMILY_PAWS_ENV=staging` and `GCLOUD_PROJECT=niu-niu-family-paws-dev`; runtime rejects mismatched project configuration and uses only the dev private photo bucket. Production defaults remain compatible.
- `npm run seed:dev` targets ONLY dev, creates deterministic synthetic customer/pet IDs through existing stores/audits, preserves existing records and never deletes anything. No real contacts, photos or test Google identities are invented.
- No reminder/email sending implementation exists yet. Do not connect a real outbound sender to dev when reminders are added; require tester-only recipients or a sink.

## Remaining delivery

1. Obtain Firebase terms confirmation and billing choice; finish Firebase activation.
2. Provision dev Auth Google provider (approved support email/consent setup), dev web app, Hosting, Oregon Firestore/indexes/deny rules and private photo bucket.
3. Create dedicated dev runtime/build identities with minimal roles; keep production service identities and resources unchanged. Provision Cloud Run/Artifact Registry/build config in dev, zero minimum instances, bounded maximum instances. No service-account keys.
4. Set real dev web identifiers, deploy API and Hosting, seed fixtures, sign in as approved tester and grant the requested account admin in DEV only. Existing admin-access script currently targets production; do not accidentally rerun it for dev.
5. Validate real sign-in, customer/pet edits and private photos in both languages/phone and desktop. Verify production remains isolated. Record screenshots without account details.
6. Finish PR validation/merge/deployment, then remove only the original live synthetic samples and their exact audited documents after inspecting current versions and obtaining mandatory permanent-deletion confirmation if needed. Preserve Nature and any other real customer/pet records. The UI has no deletion feature.

Local checks so far: production build, API TypeScript and 11 unit tests passed. Staging build passed using placeholder public identifiers only to validate compilation/prerender/banner; this is not a working Auth configuration and must not be deployed. Full emulator/browser and actual hosted checks remain pending.
