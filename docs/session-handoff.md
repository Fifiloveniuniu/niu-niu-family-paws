# Session handoff — 2026-10-19

## Pet feature in progress — 2026-10-22

Current branch `feat/pet-profiles` implements multiple pets and private photos as one feature; not yet delivered. Owner answered “add photo later”: names can be saved without a photo. See `docs/pet-profiles.md` for canonical data, permissions, upload limits and deployment checklist. Created the private Oregon bucket `niu-niu-family-paws-pet-photos`, runtime bucket-scoped custom create/get role, and deployed the pet-name collection-group index. Existing production frontend/API are unchanged at this stage. Continue this feature through validation, PR merge, Hosting deployment, live checks and cleanup; do not start another feature.

Pet continuation: draft PR #12, API source `55595a8`, build `99b9c2ab-c039-42d1-a286-42f026f36032` and revision `family-paws-api-00003-b8d` are ready. Cloud Run now has 512 MiB/concurrency 4 for bounded image processing, still request-based and zero-to-two instances. Production Hosting remains pinned to the previous API until deployment. Real customer/admin local walkthrough, private image read, search, shared edits, duplicate image save, bilingual mobile/desktop and audits passed. Tests: 8 unit, 3 Firestore, 6 browser. Two clearly marked synthetic pets and one synthetic owner profile/mapping remain for live verification; exact paths/current snapshots in `/tmp/family-paws-pets-sample.json`, test image `/tmp/family-paws-test-photo.png`. Preserve authentication accounts and all real data. Finish CI/merge/Hosting/live verification, then remove only these samples and their histories/photo object with exact preconditions.

**Latest delivered state (2026-10-22):** Google customer profile registration and administrator customer contact management are live at https://niu-niu-family-paws.web.app/#/login. Profile PR #10 merged as `12df8c3`, and Firebase Hosting deployment/live verification completed. Users save their own name/language; administrators search the same canonical records by name/contact email/verified Google email. Billing is enabled, with the owner-approved Oregon (`us-west1`) backend/database. Older draft/blocker notes below are historical. See `docs/release-4.md` and the final delivery note at the end.

## User intent and working preferences

The user's partner is the business owner and does not know how to code. Read `docs/business-owner-guide.md`; accept plain-language requests in English or Simplified Chinese and handle the technical delivery. On 2026-10-19 the user explicitly authorized a sequence of feature PRs, automatic merge after validation, and continuation without repeated merge permission. Preview changes locally and walk the owner through them in the browser. Deploy and verify every feature on Google Cloud before calling it delivered. Ask only for necessary missing facts or required authorization; preserve all prior guidance.

Build Niu Niu Family Paws Sitting LLC's English/Simplified Chinese public website and pet service usage tracker. Deliver **one complete feature at a time**, with a **hosted, usable web app after each delivery**. User explicitly chose **Google Cloud**, not OpenAI Sites. Preserve all working features as the app grows. Do not start several partially finished features.

PR titles must be concise and clear. PR descriptions must use short, clear bullet points and include relevant validation. Add screenshots when useful for UI review. All changes must go through PRs into `main`.

User prefers autonomous work without repetitive command approval prompts. At their explicit request, global `/Users/fiona/.codex/config.toml` was updated to `approval_policy = "never"` and `sandbox_mode = "danger-full-access"`. Existing settings were preserved; backup is `/Users/fiona/.codex/config.toml.before-full-access`. A new session may pick these up; runtime/managed policies still take precedence. Do not promise that no authentication or mandatory confirmation will ever be required.

## Workspace and source state

- Workspace: `/Users/fiona/Projects/niu-niu-family-paws`.
- GitHub: https://github.com/Fifiloveniuniu/niu-niu-family-paws.
- GitHub account: `Fifiloveniuniu`.
- Remote now uses SSH: `git@github.com:Fifiloveniuniu/niu-niu-family-paws.git`.
- Administrator sign-in delivered through merged PR #2 (commit `cac35ec`). Check the current branch with git before work.
- Release 1 merged via PR #1 using squash (the repository disallows merge commits). `main` is protected. The user has authorized opening and merging PRs after validation, one feature/bug fix/change per PR.
- Release 1 source, configuration, documentation, and review screenshots are included on the feature branch.
- Do not commit to or push directly to `main`. Keep changes going through pull requests.
- `dist/`, `node_modules/`, Firebase debug logs, environment files, and credentials are ignored.

## Hosted website and Google Cloud

- **Live URL:** https://niu-niu-family-paws.web.app.
- Google Cloud project ID: **`niu-niu-family-paws`**.
- Google Cloud project number: **`775511787236`**.
- Firebase console: https://console.firebase.google.com/project/niu-niu-family-paws/overview.
- Firebase CLI signed in as **`niuniupetsitting@gmail.com`**. Sign-in completed successfully; do not request the old one-time code again.
- Firebase Terms were accepted with explicit user authorization using Chrome. Firebase was added to the existing correct Google Cloud project. Optional Google Analytics was disabled.
- `npx firebase deploy --only hosting --project niu-niu-family-paws --non-interactive` succeeded and returned the live URL.
- Live Hosting includes Release 2: administrator sign-in and protected dashboard at https://niu-niu-family-paws.web.app/#/admin. Firebase Authentication is now initialized and the web app registered (`1:775511787236:web:99044ab39950f128250ef1`). Google provider is enabled (verified through the Firebase API and a real local Google sign-in). No app database, backend API, or reminder infrastructure is deployed.
- Billing was checked via Cloud Billing API: no billing account attached (`billingEnabled: false`). Cloud Run needs billing before the business API can be deployed. No billing changes were made.
- Verify billing/regions before future services; no billing upgrade was performed as part of this work.

Setup history: before the user supplied the original project's number, an unused Google Cloud project **`niu-niu-family-paws-web`** was created under this account. It is not the target and has no website deployed; do not delete it without authorization. An unused private OpenAI Sites project was also created with ID `appgprj_6ad6a33472188191b6473395ca7b4421`, slug `niu-niu-family-paws`; nothing was deployed there. Its local `.openai/hosting.json` was removed when the user selected Google Cloud. Do not resume the Sites workflow or assume its credentials are available.

## Release 1 implementation

React 19 + TypeScript + Vite + i18next/react-i18next. Plain CSS currently provides the visual styling; Tailwind/Radix from the proposed stack have not been installed. No router or backend yet.

- Responsive public landing page with service information, about/planning guidance, FAQs, and contact section.
- English/Simplified Chinese language switch; preference saved in localStorage when available; document language follows selection.
- In-page navigation and accessible native FAQ disclosures.
- Original inline SVG dog illustration. This is not a real business photo.
- Green/cream/brown styling with serif headings.
- `scripts/prerender.mjs` uses Vite SSR and React server rendering to put English public content into built HTML, then `entry.tsx` hydrates. Saved Chinese preference applies after hydration to avoid mismatched initial markup.
- Firebase security headers include CSP, HSTS (provided by Hosting), nosniff, referrer policy, and frame denial.
- No dead portal/sign-in links, fake booking forms, payment flows, invented prices, or invented business contact details.

**Content still incomplete:** public contact email/phone, service location/timezone, confirmed service offerings, prices, package terms, business photos, official Chinese business name, and domain/branding assets. Owner has not supplied these. Current website explicitly marks contact and pricing as pending and does not accept bookings. Do not portray it as a fully finished business launch or invent missing details. The Google authentication email is not automatically approved public contact information.

## Commands and verification

Node.js was installed with Homebrew (v26.12.0 at setup); npm available. Firebase CLI is a local dev dependency. `gcloud` was not installed.

```sh
npm ci
npm run dev
npm run build
npm run preview
npm run deploy
```

Build: `tsc --noEmit && vite build && node scripts/prerender.mjs`.

Checks completed:

- Production build and prerender passed.
- `git diff --check` passed.
- `npm audit --omit=dev`: zero known production vulnerabilities at the time checked. Initial full install reported development-tool dependency vulnerabilities; these were not all resolved. Node 26 also produced an engine warning for Firebase's `superstatic` dependency (expects Node 20/22/24). Consider a supported Node LTS for reproducible tooling later.
- Chrome local production preview: language switch, persistence after refresh, section navigation, and FAQ expansion passed.
- Visual desktop and 400px mobile Chinese layout checked through Chrome device toolbar.
- Live HTTPS page returned HTTP 200 and expected security headers.
- Live English/Chinese switching, FAQ navigation, and expansion passed.
- Local preview server was stopped after verification. No server should be assumed running.
- Review screenshots: `docs/screenshots/public-desktop-en.png` and `docs/screenshots/public-mobile-zh.png`.
- Rechecked the live release with headless Chrome: Chinese persists after reload, FAQ expands, 400px layout has no horizontal overflow, and no page errors occurred. Hosted HTML exactly matches the current build.

UI tools: browser-provider inventory was empty and `iab` unavailable. Native Chrome via `cua.getApp('com.google.Chrome')` worked. The user sometimes operates Chrome concurrently: re-read UI state after a user-change error and do not reuse stale indices.

## GitHub SSH and signing — complete

- Existing local key pair: `/Users/fiona/.ssh/id_ed25519_niu_niu_family_paws` and `.pub`. Never read, publish, or commit the private key.
- Public key registered on GitHub for authentication, title `Niu Niu Family Paws (Mac)`, key ID `167003930`.
- Same public key registered for SSH signing, title `Niu Niu Family Paws (Mac signing)`, key ID `1256920`.
- Fingerprint: `SHA256:q3MEQm/iJYPUOIKAgr3eXWhB3qlE6pBiXZtNQ7w3DuI`.
- GitHub CLI authorization was refreshed with `admin:public_key` and `admin:ssh_signing_key`; completed successfully. Do not reuse old device codes.
- GitHub host keys fetched from GitHub HTTPS API and added to local `~/.ssh/known_hosts`.
- Repository-local configuration:
  - `user.name = Fifiloveniuniu`
  - `user.email = 345028173+Fifiloveniuniu@users.noreply.github.com`
  - `gpg.format = ssh`
  - `user.signingkey = /Users/fiona/.ssh/id_ed25519_niu_niu_family_paws.pub`
  - `commit.gpgsign = true`
  - `tag.gpgsign = true`
  - `core.sshCommand = ssh -i /Users/fiona/.ssh/id_ed25519_niu_niu_family_paws -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes`
- Verified: `ssh -T` authenticated as Fifiloveniuniu; `git ls-remote origin HEAD` succeeded; test message signature successfully created and verified in a temporary directory. No test commit was created.
- Existing historical commit `3985100` was unsigned; enabling signing does not rewrite history.

## GitHub branch protection — complete

Repository is public and user has admin permissions. GitHub classic branch protection for **`main`** was created and read back successfully:

- Pull requests required.
- Enforced for administrators too (`enforce_admins = true`).
- Force pushes blocked.
- Branch deletion blocked.
- Required approving reviews: **0**, so the sole owner can merge their own PRs.
- Stale reviews dismissed on new changes.
- No required status checks configured yet; the Validate workflow added in PR #2 runs the build and unit test on PRs and main.
- No rulesets were present when checked.

User has already been told this protection is live. Verify if needed; do not recreate unnecessarily.

## Product scope and sequence still ahead

Additional owner requirement on 2026-10-19: administrators can view, search, and edit customer and pet information. Search planned by customer name, Google login email, and pet name; show each customer's multiple pets clearly. Preserve server-enforced administrator authorization, verified account ownership, and an edit audit trail. Recorded in requirements.md; not implemented or deployed.

Additional owner requirement on 2026-10-19: each customer can have multiple pets, each with a name and photo. Recorded in requirements.md; not yet implemented or deployed. Pet records and uploaded photos must enforce owner access. Photo-required behavior has not been specified.

Owner update on 2026-10-19: customers should sign in using their own Google account and fill in their name and pet information. Recorded in requirements.md. Treat this as requested customer self-registration; preserve verified UID ownership and administrator authorization for linking pre-existing records. This feature is not implemented or deployed. Asked whether us-west1 is approved and the owner will associate a billing account; response pending. Existing uncommitted customer-management work must be preserved.

Original scope/architecture remain in `docs/requirements.md` and `docs/architecture.md`. Proposed backend: Node/TypeScript/Fastify REST API on Cloud Run, Firebase Authentication, Firestore, generated OpenAPI client. Business data accessed through the API with role/ownership enforcement; browser Firestore access denied by default. Deployment CI eventually uses Workload Identity Federation rather than long-lived service account keys.

Next priorities:

1. Administrator sign-in is complete; see `docs/release-2.md`. PR #2 implements sign-in; production Google sign-in was verified from the local preview and correctly denied an account without an administrator claim. Owner confirmed niuniupetsitting@gmail.com as administrator; role granted through trusted tooling and the local production dashboard verified in Chrome. Build, unit test, both emulator browser tests, and GitHub CI pass. PR #2 merged and Firebase Hosting deployment succeeded. Hosted HTML exactly matches the production build. Real live Google login as niuniupetsitting@gmail.com opens the Chinese administrator dashboard; English/Chinese dashboard and sign-out also verified locally.
2. Complete missing public business content when the user supplies it. Do not invent rates or contact details.
3. Next hosted feature: customer management. Blocked on Google Cloud billing (still disabled) and database region approval. Asked whether us-west1 is acceptable; no answer yet. Do not enable billing or select the database region as though approved.
4. Then customer management, pet management, service/package balances with audited allocations/adjustments, employee access, visit tracking, customer portal, and renewal reminders, one at a time.

Visit tracking must handle atomic balance deductions, retries/idempotency, concurrent updates, corrections with audit history, and business timezone. Keep balances separate by service/unit. Customers can view only their own records. Account linking uses verified identity and administrator authorization, never a self-entered name.

Reminders need configurable thresholds, customer language, outbox/Cloud Tasks delivery, reconciliation, retries and deduplication, and replenishment cycles. These are not implemented.

Unresolved rules: drop-off/pickup meaning, consumption timing, partial days, overnight/cancellation rules, package expiry, shared pet balances, onboarding/linking, reminder defaults, backup/retention and cloud billing/regions. Resolve as needed before dependent features.

Explicitly excluded: purchasing/payment history, income reporting, care notes, and a separate attendance page.

## Customer management draft progress — 2026-10-19

Draft PR: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/5 (branch `feat/customer-management`). Do not merge until the cloud prerequisites and live deployment path are ready. Local validation is recorded below; check GitHub CI status before proceeding.

Continued the existing `feat/customer-management` work, preserving earlier changes. Administrator customer create/edit and name/contact-email prefix search are implemented locally, with a Fastify API, generated OpenAPI types, Firestore transactional version checks/idempotent retries and audited edits, and deny-by-default database rules. This is **not deployed** and production Hosting has no API rewrite yet. Pet management/photos/customer self-registration remain subsequent releases.

Passed frontend build, API TypeScript check, 4 unit tests, Firestore emulator integration (concurrent updates, retry safety, audit history, bilingual search and pagination), and 3 Chrome/Auth emulator browser tests. Customer browser UI test mocks the API; database integration is separately exercised with the isolated demo Firestore emulator. Reviewed the 400px Chinese screenshot at `docs/screenshots/customers-mobile-zh-draft.png`. Java 21 is already installed under `/opt/homebrew/opt/openjdk@21/bin`; prefix PATH for database emulator tests. More detail: `docs/customer-management-draft.md`.

Rechecked Cloud Billing API: billing remains disabled. Firestore API reports disabled/not yet used. Asked owner to link billing and approve us-west1; no answer at the time of this note. Do not merge/deploy a broken customer UI while its API is unavailable. Next: resolve cloud prerequisites, provision backend safely, preview, finish PR validation, merge, deploy, and verify live.

## Shared sign-in delivered — 2026-10-19

Owner requested a clear, prominent single sign-in entry for customers, administrators, and employees. Delivered through PR #6 (https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/6), merged as `59dc3e6` and deployed to Firebase Hosting. The release workspace is `/Users/fiona/Projects/niu-niu-family-paws-login`. Customer-management PR #5 remains a draft blocked by cloud prerequisites. Adds one prominent header sign-in (owner requested removal of duplicate hero/footer entries) and shared `/#/login` (legacy `/#/admin` remains compatible). Verified accounts display administrator, staff (`employee: true`), or ordinary customer landing states. Claims are trusted assignments, not a user-selected role. Customer/staff business features are explicitly pending.

Further owner requirements: administrators may impersonate any customer/employee and also manage their own pets as a customer. Avoid duplicate person/contact/pet information across roles or impersonation. Recorded in requirements.md with server authorization, actual/effective actor audit, and visible impersonation/exit requirements. These business features are not implemented in the sign-in release.


Shared sign-in live verification: https://niu-niu-family-paws.web.app/#/login. Hosted HTML exactly matches the released production build. Real Google login as the approved administrator was verified from the local production preview. Live Chrome checks passed for exactly one homepage login link in English and Chinese, language persistence, 400px mobile overflow, FAQ expansion, shared login and legacy administrator routes, and no page errors. Two unit tests, three emulator browser tests, and PR #6 GitHub CI passed. Customer/staff pages explicitly describe their business features as pending. Administrator impersonation and own-pet context are requirements only.

Before resuming customer-management PR #5, merge the latest main into its branch and resolve portal/test/documentation conflicts while preserving the single shared login entry. Do not deploy that branch's older administrator-only portal over the shared login release. The main workspace remains on `feat/customer-management`; the separate release worktree avoids disturbing its unfinished business-data work.


HTML freshness fix: native Chrome exposed a cached pre-release homepage after the shared-login deploy; Hosting's default HTML response was `max-age=3600`. Follow-up configuration sets `Cache-Control: no-cache` on `/` and `/index.html` so future page loads revalidate against the current release. Existing cached responses may still require a one-time hard refresh. Hashed assets keep their existing behavior. Verify the response headers after deploying this configuration; this change does not alter application code.

Cache follow-up PR #8 (https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/8) merged as `eeaf830` and deployed to Firebase Hosting. Live `/` and `/index.html` now return `Cache-Control: no-cache`, exactly match the released HTML, and retain the security headers. The code delivery is PR #6; documentation PR #7 is also merged. The original customer-management draft remains unmerged; merge current main before implementing/deploying it.


## Customer-management continuation — 2026-10-19

Merged current `origin/main` (`eeaf830`) into the customer-management branch, resolving portal, stylesheet, browser-test, and handoff conflicts. Preserved shared customer/staff/admin sign-in, the single homepage sign-in entry, and HTML revalidation headers. The administrator dashboard includes the customer draft; customer/staff pending states remain intact. No production deployment or main merge was performed.

Validation after integration: frontend build, API TypeScript check, five unit tests, Firestore emulator integration, and all four Chrome/Auth emulator browser tests passed. Browser customer operations mock the API; Firestore integration is tested separately. Running the two emulator suites concurrently caused a shared emulator hub conflict; sequential rerun passed. Node runtime was v26.12.0 (project declares Node 24); CI uses Node 24.

Rechecked Cloud Billing API: `billingEnabled: false`. User said “continue” after discussing Cloud Run's free allowance; this does not resolve billing setup or region approval. Asked owner to link billing to `niu-niu-family-paws` and confirm `us-west1` (Oregon). Both remain pending. Continue only customer management; keep PR #5 draft until backend deployment and live validation are possible.


## Billing setup resolved — 2026-10-19

Google Cloud console initially showed a permissions error because it was signed in as a different Google account. Switched the billing tab to the existing project owner `niuniupetsitting@gmail.com`; project access then worked. Owner completed billing setup in the browser. Cloud Billing API now confirms `billingEnabled: true` for `niu-niu-family-paws`. No payment details, payment profile, or credentials are recorded here. Do not continue to describe billing as disabled.

Enabled Firestore, Cloud Run, Cloud Build, Artifact Registry, and IAM APIs for the customer-management backend; the enablement operation completed successfully. No database, repository, Cloud Run service, customer data, or additional IAM grants were created in this step. Region approval is still pending; asked explicitly whether `us-west1` (Oregon) is approved. Do not treat the earlier “continue” replies about billing terms as a database-region selection.

Customer-management PR #5 remains draft and is not deployed. Latest documentation-only commit before this note was `ec72a17`; GitHub validation passed. Continue only this feature, following the existing deployment and live-verification requirements.

## Customer-management cloud preparation — 2026-10-19

Owner explicitly approved `us-west1` (Oregon) after billing setup. Created the default Firestore database in Oregon with deletion protection, deployed deny-by-default rules, and deployed Cloud Run `family-paws-api` using a dedicated runtime identity. The service is healthy at `https://family-paws-api-2la63akoma-uw.a.run.app`. No service-account keys were generated. Runtime permissions: `roles/datastore.user` and custom role `familyPawsAuthReader` containing only `firebaseauth.users.get`. Cloud Run permits network invocation; every customer operation still verifies a Firebase token, current account status, verified email, and current administrator claim in the application.

Cloud Run scales from zero to two instances with request-based CPU, 256 MiB memory, concurrency 40, and a 30-second timeout. Private Artifact Registry repository `family-paws` and source bucket `niu-niu-family-paws-build-source` are in Oregon. Dedicated builder permissions are scoped to repository writes, bucket reads, and build logging. Source uploads expire after one day. Build `517d4220-bf0b-49fa-902d-63d9ce58367b` succeeded; deployed image digest is `sha256:27abef25ab612a93c3baf22195b9f2c72a974531cc5ce23594a87cdf49da6014` (API source `2b8bbdc`). See `cloudbuild.api.yaml` and the customer-management release-preparation document.

Real API checks passed: health 200, unauthenticated customer API 401, anonymous Firestore 403. Native Chrome Google sign-in from a local production preview succeeded as the approved administrator. Adding, editing, prefix search, empty search results, and persistence after reload all worked against the real Cloud Run/Firestore backend. The Chinese page fits 400px with no horizontal overflow. Audit history contains both versions and the actual administrator UID. A synthetic customer named `Release check — sample customer 已更新` remains for live verification; remove only that sample and its history afterward. Its exact document paths are saved temporarily in `/tmp/family-paws-sample.json` (no credentials).

Created Cloud Logging exclusion `family-paws-api-request-privacy` to avoid storing automatic request URLs containing customer search details. Safe application/system logs remain enabled. No automated backups or exports were configured; retention and recovery policy remain owner decisions, with no automatic deletion of customer/audit data.

Next: commit Hosting rewrite and build configuration, finish PR #5, merge, deploy Hosting, verify the real live workflow, clean up the synthetic sample, and record final delivery. Preserve shared login, public-page behavior, both languages, and phone layouts. The frontend is still the earlier live release until this step is completed.

## Customer contact management delivered — 2026-10-20

PR #5 passed GitHub validation, was marked ready, and merged as `065b09d06c059e63a2f68c660ceeb8796637f703`. Built from the merged main commit and successfully deployed Firebase Hosting with its Cloud Run rewrite and revision pin. Live URL: https://niu-niu-family-paws.web.app/#/login. Administrators can add/edit customer names, optional contact email/phone, preferred language, and search by name/contact-email prefix. Contact email is not a verified login identity; no account linking or email sending occurs.

After deployment, verified real live create/edit/search and persistence, actual administrator audit history, Chinese persistence after reload, 400px overflow, one homepage sign-in entry, section navigation, and expanded FAQ. Live HTML exactly matches `dist/index.html`; homepage is HTTP 200 with `Cache-Control: no-cache` and security headers. Hosted API rejects missing and invalid tokens with 401 and `private, no-store`. Anonymous Firestore access returns 403. Browser error logs were empty. The two synthetic customers and their four synthetic history entries were removed with exact-target/version checks. The live directory is empty and ready for real records. No real customer records were used or deleted.

Screenshot `docs/screenshots/customers-live-mobile-zh.png` shows only the live customer directory, without account details. The browser viewport was restored to desktop and the live page left in English, matching its original preference. Live browser tab `782393907` was marked as the deliverable. The temporary production preview on `localhost:4177` and development server on `127.0.0.1:4174` were stopped after verification, and the temporary production-preview tab was closed.

See `docs/release-3.md`, the updated owner guide, and `docs/customer-management-draft.md` for feature scope and infrastructure. Customer self-registration, pet names/photos, verified-login/pet search, balances, employee operations, impersonation, and reminders remain undelivered. Do not start another feature until this delivery has been handed back to the owner. Public contact/rates/photos and business rules remain unresolved. No automated backups/exports are configured; no customer/audit records expire automatically.

## Customer profile registration in progress — 2026-10-22

Owner asked to continue after the customer-contact delivery. Next single feature: Google users save their own name/language. Branch `feat/customer-profile`; not yet deployed. See `docs/customer-profile.md` for scope, ownership model, validation, and remaining deployment steps. Self-registration creates one canonical customer document and a UID reference transactionally. Administrator/staff roles reuse that profile; no role is granted and no old record is claimed by a matching name/email. Administrator edits preserve ownership/verified-email metadata, and customer edits preserve administrator-managed contact fields. Adds trusted Google-email prefix search to the administrator directory. Pet data/photos, account linking, and impersonation remain later features.

Passed frontend build, API typecheck, seven unit tests, two Firestore emulator integration cases, and five browser tests, including retries, concurrency, stale edits, authorization/owner injection, shared record ownership, Chinese mobile layout, and preservation of unsaved profile edits during access refresh. Browser tests mock the profile API; database logic is tested independently. Next: build/deploy backend, real local production walkthrough, PR/CI merge, Hosting deploy/live checks, exact cleanup of synthetic profile/mapping/history, and final documentation.

Customer profile PR: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/10. API source `1eea684`, build `b3255756-9a41-4ce4-9da7-b3756c2f1e23`, image digest `sha256:8c3700d8c9b80335016b1cb246c0d0867542997afbf092cd6312c70849ea697d`, deployed revision `family-paws-api-00002-6x6`. Hosting is still pinned to Release 3's API until the frontend deploy. New backend preserves old frontend payloads. Do not later roll back to the original API that overwrites whole customer documents, because it does not preserve profile ownership/login metadata.

Real local production preview `http://localhost:4177/#/login` verified ordinary Google account registration/edit/reload/sign-out. An existing Google identity signed in normally without administrator claims and was used only to exercise a clearly named synthetic profile. One canonical mapping/customer was created, with two audited self edits. An administrator then found it by Google-email prefix and updated the same record; version 3 preserves ownership and login email, and history identifies the administrator actor. Administrator's own profile was uncreated at this stage (GET 204), confirming separate personal context. Temporary exact-target cleanup details were saved in `/tmp/family-paws-profile-sample.json` and preflight flags in `/tmp/family-paws-profile-preflight.json`, neither contains credentials. Authentication accounts must be preserved; only synthetic profiles/mappings/history are disposable.

## Customer profile registration delivered — 2026-10-22

PR #10 passed CI and merged as `12df8c3e238ca8197a3c50f4db8290ca87db9f3e`. Built from merged main and deployed Firebase Hosting successfully; its rewrite is pinned to the new Cloud Run revision `family-paws-api-00002-6x6`. Profile feature is live at https://niu-niu-family-paws.web.app/#/login. No new billing, region, IAM, database rules, or service-account keys were needed for this release.

Verified ordinary Google registration/edit/reload/sign-out with the real API locally, then real live administrator personal-profile registration/editing and automatic canonical directory refresh without losing the administrator role. Live Google-email prefix search returned the other registered customer without mixing it with the administrator's own profile. Name/language persisted after reload; English/Chinese and desktop/400px layouts passed. Hosted HTML exactly matches the production build; homepage 200, no-cache, and security headers retained. Missing/invalid tokens on both `/api/profile` and `/api/customers` return 401 with private/no-store; anonymous identity-map access returns 403. Console capture had no application-origin errors (an unrelated browser-extension error was observed).

Exact cleanup removed two synthetic profiles, two UID mappings, and five synthetic audit entries atomically with update-time preconditions. Login accounts and real customer records were preserved. The live administrator directory and personal profile are empty and ready for use. Temporary preview on port 4177 was stopped, its tab closed, and the live browser restored to desktop/English and marked as deliverable. `docs/screenshots/profile-live-mobile-zh.png` crops to the real form, excluding account details. Synthetic full-page mobile screenshot remains available for broader UI review.

Current scope and rollback boundary: `docs/customer-profile.md` and `docs/release-4.md`. Administrator/staff identities reuse the same canonical personal profile, but explicit context switching/impersonation and employee business workflows are still future features. Old administrator-created contacts are not linked by matching names/emails; linking remains administrator-authorized future work. Pet names/photos are the next planned feature, not started in this delivery. Business contact/rates/photos/rules and recovery/backup policy decisions remain unresolved. No automated deletion/backup/export policies were added.
