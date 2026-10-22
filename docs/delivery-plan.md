# Feature PR sequence

Owner authorized automatic merging and continuation on 2026-10-19. Each feature targets `main` through a PR, is validated locally and in CI, merged, and deployed to Google Cloud before the next feature is delivered. Local browser walkthroughs accompany visible changes.

1. Administrator sign-in and protected dashboard.
2. Customer management with an authenticated Cloud Run API and Firestore authorization boundaries.
3. Google customer profile registration (name/language), sharing canonical records with administrators.
4. Pet management.
5. Audited service/package balance allocation and adjustment.
6. Employee access management.
7. Atomic, idempotent visit tracking and corrections.
8. Customer account linking and read-only service portal.
9. Bilingual, configurable renewal reminders with durable delivery.

Items 1–3 are deployed and verified. Remaining items are separate future deliveries.

Business decisions in requirements.md remain unresolved until the owner answers them. Do not invent rules to unblock dependent features. Cloud billing and database region must be resolved before provisioning the business data backend. Public content completion depends on owner-supplied information.
