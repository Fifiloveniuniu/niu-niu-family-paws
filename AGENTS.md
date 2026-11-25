# Project handoff

Read `docs/session-handoff.md` before continuing work. It records the hosted app, delivery preferences, GitHub protections, local uncommitted work, and next steps. Also read `docs/requirements.md` and `docs/architecture.md` before implementing business workflows.

# Delivery

- Current owner instruction (2026-11-24): deploy automatically after successful validation of changes merged into main. This supersedes earlier manual/final-batch-only deployment directions. Keep changes in focused, signed, validated PRs; never push directly to main. Verify the automatic hosted release.
- Use Google Cloud: Firebase Hosting for the web frontend, Cloud Run for the future API, Firebase Authentication, and Firestore. Do not switch to OpenAI Sites hosting.
- Preserve working features, English/Simplified Chinese support, and mobile/desktop usability in every release.
- Do not invent business contact details, pricing, photos, testimonials, or unresolved service rules.

# Current validation and stacked delivery — 2026-11-20

- Run Playwright only in headless Chrome. Reserve Chrome regression runs for opening/submitting PRs, not after every intermediate edit.
- Batch multiple work items with the `gh stack` CLI; keep each PR focused and enable automatic merging while respecting branch protections and verified signatures. This supersedes the earlier one-PR-at-a-time delivery instructions below. The stack ultimately targets `main`; use stack dependencies as needed.
- Use local build/unit/API/format checks during development. Run the Chrome regression at the PR submission boundary.

# Pull requests

- Owner instruction (2026-11-17): do not push commits or open pull requests between 9:00 AM and 5:00 PM PST (UTC-08:00). Continue local development and validation during this window; defer pushes and PR creation until outside it.

- All commits must have verified signatures. Sign commits with the authorized GitHub signing identity and check GitHub verification before merging.

- Use a concise title that clearly describes the change.
- Write a short description in clear bullet points covering the change and relevant validation.
- Add screenshots when they help reviewers understand visible UI changes.
- Target `main` through a pull request; do not push changes directly to `main`.
- Open and merge PRs as work progresses after validation; the user has authorized merging. Keep one feature, bug fix, or change per PR.

# Working with the business owner

- The user's partner is the business owner and does not know how to code. Read `docs/business-owner-guide.md` and help them make changes using everyday English or Simplified Chinese.
- Handle implementation, GitHub PRs, validation, merging, and deployment. Do not require the owner to use a terminal or edit code. Explain the outcome in plain language.
- User authorized building features as a sequence of GitHub PRs, automatically merging each after validation and continuing. Keep one feature/change per PR targeting `main`; never push directly to `main`.
- Always preview the actual local site in Chrome using running localhost dev servers; screenshots alone are not a local-site walkthrough. Use localhost (not 127.0.0.1) for real Google sign-in.
- Use dialogs for focused tasks such as editing and Google account linking. Use recognizable icons with tooltips and accessible names for secondary actions; keep primary actions clear.
- Preview visible changes locally and walk the owner through them in the browser. Merge validated feature PRs sequentially; successful main validation automatically deploys Firebase Hosting/Cloud Run. Verify the live result after deployment.
- Continue autonomously within the requested scope; avoid repeated approval questions. Ask concise questions for missing business facts, access, billing decisions, or mandatory confirmations. Never invent answers.
- Preserve bilingual support, mobile/desktop usability, and existing working features. Follow the Google Cloud architecture in the handoff.
- Keep the handoff current with delivered changes, links, validation, and unresolved decisions so a future session can continue. Never store secrets in project documentation.
