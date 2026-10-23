# UI and language refinement

Requested: a cleaner, consistent UI, clearer language choice, and copy that reads naturally in English and Simplified Chinese.

- One shared Language / 语言 selector on public and portal headers, with explicit English and 简体中文 options and the current selection shown. Browser preference persists across routes/reloads. Display language does not overwrite a saved profile language or unsaved form inputs.
- Compact account summary, consistent primary/secondary controls, form borders/spacing, restrained green/cream surfaces and responsive headers. Keep visible focus indicators, native selects, minimum 44px controls, and current pressed states for workspace choices.
- Rewrite public and account explanations, status/errors and Chinese navigation in direct, natural language rather than matching sentences literally. Preserve business facts, pending contact/pricing, photo privacy/limits, account linking limitations and the absence of website bookings.
- No API, permissions, database, infrastructure, billing or service-rule changes. Existing sign-in, customer/pet workflows and administrator personal workspace remain.

Validation in progress: build and eight browser tests include 320/400/1280px layouts, both languages, document language, cross-route/reload persistence and preservation of profile-language preferences/unsaved edits. Existing profile/pet retries and administrator revocation remain covered. CUA production preview reviewed English/Chinese phone public pages and sign-in; authenticated synthetic UI screenshots are from isolated browser tests with mocked business responses. Complete PR/CI, merge, Hosting deploy and live review before calling this delivered.
