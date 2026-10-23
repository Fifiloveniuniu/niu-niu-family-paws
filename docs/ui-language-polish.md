# UI and language refinement

Requested: a cleaner, consistent UI, clearer language choice, and copy that reads naturally in English and Simplified Chinese.

- One shared Language / 语言 selector on public and portal headers, with explicit English and 简体中文 options and the current selection shown. Browser preference persists across routes/reloads. Display language does not overwrite a saved profile language or unsaved form inputs.
- Compact account summary, consistent primary/secondary controls, form borders/spacing, restrained green/cream surfaces and responsive headers. Keep visible focus indicators, native selects, minimum 44px controls, and current pressed states for workspace choices.
- Rewrite public and account explanations, status/errors and Chinese navigation in direct, natural language rather than matching sentences literally. Preserve business facts, pending contact/pricing, photo privacy/limits, account linking limitations and the absence of website bookings.
- No API, permissions, database, infrastructure, billing or service-rule changes. Existing sign-in, customer/pet workflows and administrator personal workspace remain.

Delivered 2026-10-22: PR #16 (https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/16), merged `5b8cbc129bde8e25694da008e7d1ef07d8b65169`, built from merged main and deployed to Firebase Hosting at https://niu-niu-family-paws.web.app.

Passed build, GitHub CI and eight browser tests covering 320/400/1280px layouts, both languages, document language, cross-route/reload persistence and preservation of profile-language preferences/unsaved edits. Existing profile/pet retries and administrator revocation remain covered. CUA production preview reviewed English/Chinese phone public/sign-in pages and the English desktop layout; authenticated synthetic UI screenshots come from isolated browser tests with mocked business responses.

Live review confirmed the new public/sign-in selector, Chinese persistence after reload, 400px layout without horizontal overflow, FAQ navigation/expansion, and the existing administrator's new compact portal. In the real personal workspace, changing the interface to Chinese preserved an unsaved name and left the saved profile-language preference unchanged. Restored the draft without saving; no production records were written. Live HTML exactly matches the build and retains no-cache/security headers; unauthenticated profile requests remain 401/private-no-store. Live public/sign-in console capture was empty. Screenshot `docs/screenshots/ui-live-mobile-zh.png` contains no account details. Temporary preview stopped; viewport reset and live pages left in English.

The prior workspace switch remains delivered through PR #14; UI wording now uses “我的资料与宠物” and “切换页面”. This release changes no role, account ownership, data schema, service rule or backend. Contact/pricing details remain pending; booking, impersonation and employee business workflows are still future work.
