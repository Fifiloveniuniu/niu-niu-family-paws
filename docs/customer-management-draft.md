# Customer management — delivered

Delivered through [PR #5](https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/5), merged as `065b09d`, and deployed to Firebase Hosting. [Live administrator portal](https://niu-niu-family-paws.web.app/#/login). See [release notes](release-3.md).

Current scope: administrators add/edit customer name, optional contact email/phone, and preferred English/Simplified Chinese language. Search matches the start of a name or contact email, ignoring case, before pagination. Contact email is profile information, not a verified login or an account-linking mechanism. Pet search, photos, customer self-registration, and pet management follow in separate deliveries.

The frontend sends Firebase ID tokens to the same-origin `/api/customers` endpoint. The Fastify API verifies the token, checks the current user is enabled and still has an administrator claim, and requires verified email. Firestore transactions use record versions, prevent stale writes, handle successful save retries without duplicate history, and record the administrator and before/after values. Browser Firestore access is denied. Search prefixes are stored as internal indexed data, excluded from API records and audit snapshots.

## Validation

- Production frontend build and API TypeScript checks pass.
- Five unit tests cover administrator authorization, input validation, safe errors, and bounded normalized search.
- Firestore emulator integration passes for duplicate retries, concurrent updates, audit records, search, Chinese names, and pagination without omissions/duplicates.
- Four Chrome/Auth emulator browser tests pass, including customer creation/edit/search, both languages, shared sign-in regression checks, and 400px mobile overflow checks. Customer API responses in the customer browser test are mocked; the Firestore store is tested separately against the database emulator.
- Mobile screenshot uses synthetic demo identities only: `screenshots/customers-mobile-zh-draft.png`.

## Cloud preparation and remaining delivery

1. Billing is linked and the owner explicitly approved `us-west1` (Oregon). The required APIs are enabled. The default Firestore database is in Oregon with deletion protection and deny-by-default browser rules deployed.
2. Cloud Run service `family-paws-api` is running in Oregon at `https://family-paws-api-2la63akoma-uw.a.run.app`, using a dedicated runtime identity. It scales from zero to two instances, with request-based CPU billing, 256 MiB memory, and a 30-second request timeout. The runtime has database access and a custom role containing only `firebaseauth.users.get` for current user checks. No service-account keys were created.
3. A dedicated builder can read the private build-source bucket, write API images to the `family-paws` Artifact Registry repository, and write build logs. Source objects expire after one day. `cloudbuild.api.yaml` records the container build configuration. Build `517d4220-bf0b-49fa-902d-63d9ce58367b` produced digest `sha256:27abef25ab612a93c3baf22195b9f2c72a974531cc5ce23594a87cdf49da6014` from API source at `2b8bbdc`.
4. Production API checks: health returns 200, unauthenticated customer reads return 401, and anonymous Firestore reads return 403. A local production preview using real Google administrator sign-in and the real Cloud Run backend successfully created, edited, searched, and reloaded a synthetic customer. Firestore confirmed version 2 and two edit-history records with the actual administrator UID. The Chinese layout has no horizontal overflow at 400px. No real customer details were used.
5. Automatic Cloud Run request URL logs are excluded by `family-paws-api-request-privacy` because search URLs can contain customer information. Safe application and system logs remain available.
6. The Hosting API rewrite is deployed from `firebase.json`, with the backend revision pinned to the Hosting release. Real live administrator create/edit/search, reload persistence, Chinese language persistence, 400px layouts, public navigation, and FAQs passed after deployment. The live HTML matches the production build. Missing/invalid API tokens return 401 with `private, no-store`. Both synthetic customer records and their four synthetic audit entries were removed after verification; no real customer data was used or deleted.

Customer records and audit history have no automatic deletion. Scheduled backups, exports, and a business recovery/retention policy remain undecided; do not claim these have been configured.

Local prerequisites: Node 24; Java 21 for Firestore emulator. On this Mac, Java is installed at `/opt/homebrew/opt/openjdk@21/bin/java` but is not on the default PATH. Use that directory in PATH for `npm run test:store`.
