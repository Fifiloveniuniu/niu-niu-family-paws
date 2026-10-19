# Project handoff

Read `docs/session-handoff.md` before continuing work. It records the hosted app, delivery preferences, GitHub protections, local uncommitted work, and next steps. Also read `docs/requirements.md` and `docs/architecture.md` before implementing business workflows.

# Delivery

- Deliver one feature at a time. Each delivery must be hosted and usable; a local-only build is not delivery.
- Use Google Cloud: Firebase Hosting for the web frontend, Cloud Run for the future API, Firebase Authentication, and Firestore. Do not switch to OpenAI Sites hosting.
- Preserve working features, English/Simplified Chinese support, and mobile/desktop usability in every release.
- Do not invent business contact details, pricing, photos, testimonials, or unresolved service rules.

# Pull requests

- Use a concise title that clearly describes the change.
- Write a short description in clear bullet points covering the change and relevant validation.
- Add screenshots when they help reviewers understand visible UI changes.
- Target `main` through a pull request; do not push changes directly to `main`.
- Open and merge PRs as work progresses after validation; the user has authorized merging. Keep one feature, bug fix, or change per PR.
