# Customer profile registration — release preparation

Scope: a verified Google user can create/read/edit their own name and preferred language. Administrators and staff can use the same personal profile panel while retaining their existing roles. Pets/photos, role management, impersonation, and linking existing administrator-created records are separate features.

`GET /api/profile` returns the current identity's canonical customer record (204 when none exists). `PUT /api/profile` accepts only name, language, and record version. The backend derives UID and verified Google email from the checked Firebase account/token, rejects disabled/unverified/non-Google sessions and client-selected owners, and never grants a role. Direct browser Firestore access remains denied.

The internal `people/{uid}` record stores only a reference to one canonical `customers/{uuid}` document. Creating both is transactional; simultaneous requests and uncertain-save retries cannot create multiple profiles. Existing records are never claimed or merged by matching name/contact email. Administrator edits preserve protected ownership and verified-email metadata. Customer edits preserve administrator-managed contact fields. Shared versions prevent stale edits, and the same customer history records the actual actor for both workflows. Current verified login email is server-maintained and refreshed on profile reads with an audit entry if it changes; administrators can search its prefix.

Local validation passed: frontend build, API TypeScript, seven unit tests, two Firestore emulator integration cases, and five browser tests. Checks include owner/role injection, unverified/non-Google/disabled sessions, concurrent registration, retry safety, canonical shared data, stale edits, email refresh, corrupt-reference ownership denial, lost-response retry, sign-out isolation, preserved edits during access refresh, and the 400px Chinese layout. Browser API responses are mocked; Firestore logic is independently exercised against an isolated demo database.

Before delivery: build/deploy the API without disturbing the pinned live Hosting revision, preview using real Google sign-in, validate sample profiles and audit history, merge the feature PR after CI, deploy Hosting, verify the live workflow, and clean up only newly created synthetic verification data. Do not call this feature delivered before those checks pass.

![Chinese profile on mobile, synthetic test identity](screenshots/profile-mobile-zh.png)
