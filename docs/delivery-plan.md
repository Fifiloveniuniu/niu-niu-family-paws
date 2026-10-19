# Feature PR sequence

Owner authorized automatic merging and continuation on 2026-10-19. Each feature targets `main` through a PR, is validated locally and in CI, merged, and deployed to Google Cloud before the next feature is delivered. Local browser walkthroughs accompany visible changes.

1. Administrator sign-in and protected dashboard.
2. Customer management with an authenticated Cloud Run API and Firestore authorization boundaries.
3. Pet management.
4. Audited service/package balance allocation and adjustment.
5. Employee access management.
6. Atomic, idempotent visit tracking and corrections.
7. Customer account linking and read-only portal.
8. Bilingual, configurable renewal reminders with durable delivery.

Business decisions in requirements.md remain unresolved until the owner answers them. Do not invent rules to unblock dependent features. Cloud billing and database region must be resolved before provisioning the business data backend. Public content completion depends on owner-supplied information.
