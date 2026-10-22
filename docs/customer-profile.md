# Customer profile registration — release preparation

Scope: a verified Google user can create/read/edit their own name and preferred language. Administrators and staff can use the same personal profile panel while retaining their existing roles. Pets/photos, role management, impersonation, and linking existing administrator-created records are separate features.

`GET /api/profile` returns the current identity's canonical customer record (204 when none exists). `PUT /api/profile` accepts only name, language, and record version. The backend derives UID and verified Google email from the checked Firebase account/token, rejects disabled/unverified/non-Google sessions and client-selected owners, and never grants a role. Direct browser Firestore access remains denied.

The internal `people/{uid}` record stores only a reference to one canonical `customers/{uuid}` document. Creating both is transactional; simultaneous requests and uncertain-save retries cannot create multiple profiles. Existing records are never claimed or merged by matching name/contact email. Administrator edits preserve protected ownership and verified-email metadata. Customer edits preserve administrator-managed contact fields. Shared versions prevent stale edits, and the same customer history records the actual actor for both workflows. Current verified login email is server-maintained and refreshed on profile reads with an audit entry if it changes; administrators can search its prefix.

Local validation passed: frontend build, API TypeScript, seven unit tests, two Firestore emulator integration cases, and five browser tests. Checks include owner/role injection, unverified/non-Google/disabled sessions, concurrent registration, retry safety, canonical shared data, stale edits, email refresh, corrupt-reference ownership denial, lost-response retry, sign-out isolation, preserved edits during access refresh, and the 400px Chinese layout. Browser API responses are mocked; Firestore logic is independently exercised against an isolated demo database.

Cloud Build `b3255756-9a41-4ce4-9da7-b3756c2f1e23` produced digest `sha256:8c3700d8c9b80335016b1cb246c0d0867542997afbf092cd6312c70849ea697d` from API source `1eea684`. It is deployed as Cloud Run revision `family-paws-api-00002-6x6`. The existing live Hosting revision remains pinned to the preceding backend until the new frontend is published.

Real premerge verification passed with an ordinary verified Google account: registration, edit, reload, sign-out isolation, one canonical mapping/customer, and two self audit entries. An administrator then found that same record by verified Google-email prefix and edited it; the existing owner and login email were preserved, version advanced to 3, and the audit identified the actual administrator. The administrator's own profile remained empty and separate. Missing/invalid API tokens return 401.

Before delivery: merge [PR #10](https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/10) after final CI, deploy Hosting, verify the live profile workflow, and clean up only the newly created synthetic customer/mapping/history. Do not call this feature delivered before those checks pass.

Rollback note: registered profiles require a metadata-preserving API at or after `1eea684`. Do not roll back Hosting to an older API revision whose administrator writes replace entire customer documents; that could discard ownership/login metadata. Older frontend payloads remain compatible with the new API.

![Chinese profile on mobile, synthetic test identity](screenshots/profile-mobile-zh.png)
