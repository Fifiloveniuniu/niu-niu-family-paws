# Customer management — draft, not deployed

Current scope: administrators add/edit customer name, optional contact email/phone, and preferred English/Simplified Chinese language. Search matches the start of a name or contact email, ignoring case, before pagination. Contact email is profile information, not a verified login or an account-linking mechanism. Pet search, photos, customer self-registration, and pet management follow in separate deliveries.

The frontend sends Firebase ID tokens to the same-origin `/api/customers` endpoint. The Fastify API verifies the token, checks the current user is enabled and still has an administrator claim, and requires verified email. Firestore transactions use record versions, prevent stale writes, handle successful save retries without duplicate history, and record the administrator and before/after values. Browser Firestore access is denied. Search prefixes are stored as internal indexed data, excluded from API records and audit snapshots.

## Validation

- Production frontend build and API TypeScript checks pass.
- Four unit tests cover administrator authorization, input validation, safe errors, and bounded normalized search.
- Firestore emulator integration passes for duplicate retries, concurrent updates, audit records, search, Chinese names, and pagination without omissions/duplicates.
- Three Chrome/Auth emulator browser tests pass, including customer creation/edit/search, both languages, and 400px mobile overflow checks. Customer API responses in the customer browser test are mocked; the Firestore store is tested separately against the database emulator.
- Mobile screenshot uses synthetic demo identities only: `screenshots/customers-mobile-zh-draft.png`.

## Before merging and deployment

1. Owner must associate a billing account and confirm the database/backend region. Rechecked Cloud Billing API on 2026-10-19: `billingEnabled: false`. Firestore API is disabled. Do not interpret “continue” as selecting a region or enabling billing.
2. Provision Firestore, deploy deny-by-default rules, and deploy Cloud Run with a dedicated service identity and minimum necessary database/auth permissions. Ensure Firebase Hosting forwards `/api/**` to this service; no production rewrite exists yet.
3. Verify the real Cloud Run authorization boundaries, Firestore search index availability, and recovery/retention decisions; no real production customer data has been used in these tests.
4. Preview the visible change with the owner, finish the PR, merge after validation, deploy Firebase Hosting, and verify real live administrator create/edit/search and public-page regressions. Do not call this feature delivered until those checks pass.

Local prerequisites: Node 24; Java 21 for Firestore emulator. On this Mac, Java is installed at `/opt/homebrew/opt/openjdk@21/bin/java` but is not on the default PATH. Use that directory in PATH for `npm run test:store`.
