# Session handoff — 2026-10-19

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
- Current branch: `feat/admin-sign-in`.
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
- Live Hosting remains Release 1. Firebase Authentication is now initialized and the web app registered (`1:775511787236:web:99044ab39950f128250ef1`). Google provider is enabled (verified through the Firebase API and a real local Google sign-in). No app database, backend API, or reminder infrastructure is deployed.
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
- No required status checks configured yet; no CI workflow exists yet.
- No rulesets were present when checked.

User has already been told this protection is live. Verify if needed; do not recreate unnecessarily.

## Product scope and sequence still ahead

Original scope/architecture remain in `docs/requirements.md` and `docs/architecture.md`. Proposed backend: Node/TypeScript/Fastify REST API on Cloud Run, Firebase Authentication, Firestore, generated OpenAPI client. Business data accessed through the API with role/ownership enforcement; browser Firestore access denied by default. Deployment CI eventually uses Workload Identity Federation rather than long-lived service account keys.

Next priorities:

1. Finish administrator sign-in on `feat/admin-sign-in`; see `docs/release-2.md`. PR #2 implements sign-in; production Google sign-in was verified from the local preview and correctly denied an account without an administrator claim. Owner confirmed niuniupetsitting@gmail.com as administrator; role granted through trusted tooling and the local production dashboard verified in Chrome. Build, unit test, both emulator browser tests, and GitHub CI pass. Merge/deployment status must be checked on GitHub/Firebase.
2. Complete missing public business content when the user supplies it. Do not invent rates or contact details.
3. Next complete hosted feature: administrator sign-in and protected dashboard.
4. Then customer management, pet management, service/package balances with audited allocations/adjustments, employee access, visit tracking, customer portal, and renewal reminders, one at a time.

Visit tracking must handle atomic balance deductions, retries/idempotency, concurrent updates, corrections with audit history, and business timezone. Keep balances separate by service/unit. Customers can view only their own records. Account linking uses verified identity and administrator authorization, never a self-entered name.

Reminders need configurable thresholds, customer language, outbox/Cloud Tasks delivery, reconciliation, retries and deduplication, and replenishment cycles. These are not implemented.

Unresolved rules: drop-off/pickup meaning, consumption timing, partial days, overnight/cancellation rules, package expiry, shared pet balances, onboarding/linking, reminder defaults, backup/retention and cloud billing/regions. Resolve as needed before dependent features.

Explicitly excluded: purchasing/payment history, income reporting, care notes, and a separate attendance page.
