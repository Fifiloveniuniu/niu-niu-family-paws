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

# Working with the business owner

- The user's partner is the business owner and does not know how to code. Read `docs/business-owner-guide.md` and help them make changes using everyday English or Simplified Chinese.
- Handle implementation, GitHub PRs, validation, merging, and deployment. Do not require the owner to use a terminal or edit code. Explain the outcome in plain language.
- User authorized building features as a sequence of GitHub PRs, automatically merging each after validation and continuing. Keep one feature/change per PR targeting `main`; never push directly to `main`.
- Preview visible changes locally and walk the owner through them in the browser. After merging, deploy to Firebase Hosting and verify the live result. A local preview or merged PR alone is not a delivered website feature.
- Continue autonomously within the requested scope; avoid repeated approval questions. Ask concise questions for missing business facts, access, billing decisions, or mandatory confirmations. Never invent answers.
- Preserve bilingual support, mobile/desktop usability, and existing working features. Follow the Google Cloud architecture in the handoff.
- Keep the handoff current with delivered changes, links, validation, and unresolved decisions so a future session can continue. Never store secrets in project documentation.
