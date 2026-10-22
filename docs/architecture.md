# Architecture and planned workflows

## Request path

Browser -> Firebase Hosting frontend -> Cloud Run REST API -> Firestore.

The browser obtains a Firebase Authentication token. The backend verifies it and enforces role and record ownership on every operation. Browser visibility is not authorization. Business data is accessed through the API; direct browser access to Firestore is denied by default. Admin SDK access is controlled with IAM and backend checks.

Public landing content should be statically prerendered for discoverability. The authenticated portal is a React application.

## Consistency

Use Firestore transactions and operation identifiers to save service usage and deduct balances atomically. Retries must not deduct twice. Preserve administrator adjustment history and the employee responsible for each handoff. Store timestamps consistently and display them in the configured business timezone, including daylight saving transitions.

## Email delivery

Persist reminder eligibility/outbox state with the balance transaction, enqueue a Cloud Tasks request, and send through a verified email provider. Use stable reminder identifiers and provider idempotency where supported. Recover from the gap between database commit and task creation through an outbox reconciliation process; its scheduling is to be selected before implementation. Do not send email as untracked background work after returning a Cloud Run HTTP response.

## Deployment

Use the target project `niu-niu-family-paws`. Firebase Hosting, Firebase Authentication, the default Firestore database, and Cloud Run customer API are deployed. The owner approved `us-west1` (Oregon) for the database and backend. Firebase Hosting is a global CDN, so US backend/database regions alone do not guarantee US-only processing.

Frontend and backend share one repository under `apps/web`, `apps/api`, and `packages/contracts`. API types are generated from OpenAPI. Current deployments use the owner's existing authorized CLI session, with separate runtime and build identities and no service-account keys. Future deployment CI should use Workload Identity Federation. Cloud Run uses request-based billing, zero minimum instances, and two maximum instances.

The API checks the token and current Firebase account status on every business request. Directory operations require the current administrator claim; profile operations require an active verified Google identity and derive ownership from its UID. `people/{uid}` references one canonical customer document. Self and administrator edits share that document/version/history, and protected ownership/verified-email metadata cannot be set by clients. Its dedicated identity has database access and only `firebaseauth.users.get` for current account checks. Automatic Cloud Run request URL logs are excluded because search terms can contain customer information; safe application/system logs remain available.

Registered profiles require the metadata-preserving API introduced with customer registration. Do not roll Hosting back to a pre-registration API that replaces entire customer documents and drops ownership fields. Older frontend payloads can use the new API. See `docs/customer-profile.md` for the deployment/rollback boundary.

Keep secrets in Secret Manager. Production customer data, tokens, and credentials must never be committed. The database has deletion protection. Customer records and audit history have no automatic deletion; scheduled backups/exports and a business recovery/retention policy remain undecided.

## Verification before launch

Test authorization boundaries, duplicate submission handling, concurrent balance updates, correction behavior, reminder retry/deduplication, timezone handling, bilingual forms, and mobile handoff workflows. Configure logs to avoid customer data and credentials. Separate development/test data from production.
