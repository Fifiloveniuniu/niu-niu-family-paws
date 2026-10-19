# Proposed architecture

## Request path

Browser -> Firebase Hosting frontend -> Cloud Run REST API -> Firestore.

The browser obtains a Firebase Authentication token. The backend verifies it and enforces role and record ownership on every operation. Browser visibility is not authorization. Business data is accessed through the API; direct browser access to Firestore is denied by default. Admin SDK access is controlled with IAM and backend checks.

Public landing content should be statically prerendered for discoverability. The authenticated portal is a React application.

## Consistency

Use Firestore transactions and operation identifiers to save service usage and deduct balances atomically. Retries must not deduct twice. Preserve administrator adjustment history and the employee responsible for each handoff. Store timestamps consistently and display them in the configured business timezone, including daylight saving transitions.

## Email delivery

Persist reminder eligibility/outbox state with the balance transaction, enqueue a Cloud Tasks request, and send through a verified email provider. Use stable reminder identifiers and provider idempotency where supported. Recover from the gap between database commit and task creation through an outbox reconciliation process; its scheduling is to be selected before implementation. Do not send email as untracked background work after returning a Cloud Run HTTP response.

## Deployment

Use the target project `niu-niu-family-paws`; no resources are configured yet. Select compatible US regions after confirming requirements. Firebase Hosting is a global CDN, so US backend/database regions alone do not guarantee US-only processing.

Keep frontend and backend in one repository, with a proposed future structure of `apps/web`, `apps/api`, and `packages/contracts`. Generate API client types from OpenAPI. Use GitHub Actions with Workload Identity Federation instead of long-lived Google service account keys. Cloud Run uses request-based billing and zero minimum instances initially.

Keep secrets in Secret Manager. Production customer data, tokens, and credentials must never be committed. Define recovery and backup requirements before launch.

## Verification before launch

Test authorization boundaries, duplicate submission handling, concurrent balance updates, correction behavior, reminder retry/deduplication, timezone handling, bilingual forms, and mobile handoff workflows. Configure logs to avoid customer data and credentials. Separate development/test data from production.
