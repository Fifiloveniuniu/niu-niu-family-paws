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

Pet profiles use canonical `customers/{customerId}/pets/{petId}` documents with immutable customer relationships, transactional versions and actor audit history. Current customer ownership/current administrator authorization is checked for list, save and private photo reads. Administrator pet-name search joins canonical customer information using a collection-group prefix index. Photos use a private Oregon Cloud Storage bucket with enforced public-access prevention; the API validates/reencodes uploads and reads immutable content-addressed WebP objects. Browser Storage access/download tokens/public URLs are not used. Runtime create/get permissions are bucket-scoped. See `docs/pet-profiles.md` for image limits, retention caveats and deployed revision. Retain the pet-capable API when rolling back frontend releases; older APIs have no pet endpoints.

Keep secrets in Secret Manager. Production customer data, tokens, and credentials must never be committed. The database has deletion protection. Customer records and audit history have no automatic deletion; scheduled backups/exports and a business recovery/retention policy remain undecided.

## Verification before launch

Account linking is deployed: a 24-hour hash-only one-time code allows a verified Google identity to request access to an unclaimed customer; a current administrator must verify and approve the request. Approval rechecks the target Auth account and reviewed record versions, then atomically adds canonical ownership/mapping and actor/effective-UID audit records without moving pets or photos. Existing personal profiles are not merged. Runtime IAM remains unchanged. See `docs/account-linking.md`.

Test authorization boundaries, duplicate submission handling, concurrent balance updates, correction behavior, reminder retry/deduplication, timezone handling, bilingual forms, and mobile handoff workflows. Configure logs to avoid customer data and credentials. Separate development/test data from production.

## House configuration (local feature)

Admin-only `/api/houses` GET and `/api/houses/{id}` PUT use canonical `houses/{id}` records, stable UUIDs, named IANA timezones, transactional versions and `history/{version}` actual-actor audit entries. Identical retries do not duplicate history; conflicting updates return 409. Houses are not yet deployed and do not imply approved addresses, capacities, rooms or booking rules. No deletion/archiving policy is introduced.

Local fixture API uses demo Auth/Firestore and a disposable photo cache sourced from private dev GCS; production uses its existing private bucket. Integration tests use the emulator's separate per-run `integration-*` database to avoid adding partial fixtures to the owner’s default demo preview. Test-mode frontend proxy always targets local demo API port 8081, never the production relay.

## Room capacity direction — WIP, not deployed

The requested hierarchy is House → Room. Individual spaces are removed from the product model. Room configuration has a maximum capacity; pet category/type/weight groups determine consumption, and an admin-set per-pet override takes precedence. Only one species may occupy a room at a time; it may switch species between non-overlapping stays. Weighted capacity and temporal species exclusivity must both be checked when bookings are implemented.

Draft PR #41 and its intermediate uncommitted room revision are preserved as WIP. Do not treat its API/contracts as completed architecture or import them into the clean calendar/balance branch. Preserve old saved local records/history rather than deleting them to reflect a UI change. No actual capacity/group defaults have been approved.

## Calendar and balance implementation boundaries

Continue from main using canonical customer/pet IDs and server-derived ownership/current roles. Keep planned and actual visit timestamps distinct and display house-local times. Package/purchase/usage references must survive customer linking and corrections. Use audited, idempotent transactions for balances and room reservations; no double spending/deduction on retries. A future combined booking operation must check package eligibility, balance and room/species constraints consistently, not rely on an earlier availability read.

Thirty-day package size, three-month first-use validity, holiday rates and 14-/7-day refund policy are confirmed requirements. The exact financial/day-counting/activation/refund boundaries are not settled; consult requirements before implementing them. Available/reserved/used balances are a proposed presentation, not permission to invent a deduction lifecycle. No payment provider is selected.

Preserve Google Cloud and the existing local demo isolation. Keep the current build tooling; the SWC migration was cancelled. Defer deployment until the full requested feature set is complete.

## Balance planning prototype (not a financial backend)

The dev-only calendar keeps sample PetBalance records and adjustment history in React page state. Coverage is keyed by sample pet and service, checks explicit staff-reviewed whole days, manually reviewed coverage dates, and subtracts other new preview plans from planning headroom. A pure reducer rejects negative totals, stale versions, conflicting operation IDs and changes that invalidate a plan. Removal only removes the preview plan reference. No financial reservation, purchase, activation, deduction, refund or persisted ledger is implemented, and the UI says so. This client-side simulation provides no production authorization/transaction guarantee; real balances must use canonical IDs, current server roles, audited idempotent Firestore transactions and approved financial policies.

## Simplified balance policy templates (local preview)

Per latest owner instruction, a balance uses one reviewed date range rather than a second eligible-month restriction. Named, service-scoped templates copy this range into setup; they never share credits or retroactively alter other accounts. Templates and balances remain page-local React state, not persisted financial configuration. Adjustment reason is optional; amount/version/operation/history and planned-stay protections remain. No automatic package activation or expiry rule is inferred from these manually entered dates.
