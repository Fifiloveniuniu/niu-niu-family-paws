# Unsaved changes before leaving the page

Personal profile, administrator customer and pet forms now show a bilingual notice when values differ from the form's loaded/opened values. A pending save, uncertain response or photo read also keeps the warning active. Saving successfully, restoring the original values or closing an editor removes its warning. Administrator workspace switches retain mounted drafts and their protection.

While any form needs protection, a `beforeunload` listener requests the browser's native confirmation when refreshing, closing or navigating away from the document. The browser controls the popup wording/language and may suppress it (especially on mobile, app termination or before user interaction). This is a reminder, not autosave or persistent draft storage. Website language changes alone do not make a clean form dirty.

This release covers full-page departures. Existing in-app Cancel, opening another record, sign-out and hash navigation retain their existing behavior. No business data is written by the warning, and no form values or photos are stored in browser storage. Permissions, API and billing configuration are unchanged.

Validation includes the production build and eight browser tests with isolated authentication and mocked business API responses. Regression checks exercise native refresh confirmation, dismissing it without losing drafts, retained hidden workspace drafts, removing the warning after reverting/cancelling, a clean refresh, and preserving the warning across a lost save response until a successful retry. Local and hosted visual walkthrough results are recorded in the session handoff after delivery.

Delivered through [PR #18](https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/18), merged as `9791b4e`, built from main and deployed to Firebase Hosting. The live administrator walkthrough verified Chrome's native refresh confirmation and preserving the draft after cancellation, followed by a clean refresh after cancelling the editor. No production record was saved. Review screenshot: `docs/screenshots/unsaved-live-zh.png`.
