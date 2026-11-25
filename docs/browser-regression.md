# Browser submission checks

`playwright test` now selects the real authenticated, API-backed workspace regression through `playwright.backend.config.ts`. It starts a dedicated named-database API and a localhost Vite server and runs headless Chrome. `npm run test:browser` starts both required Auth and Firestore emulators, rather than Auth alone.

The earlier prototype/mock fixtures remain in `tests/browser` and can be invoked explicitly with `playwright.prototype.config.ts`. Several assume retired sample controls, claim-only routing or unauthenticated profile responses that do not match the saved application. They are retained as migration references, not presented as passing saved-workspace release checks. The current suite covers live roles/scopes, customers, pets/photos, pricing, balances, statements, layout, navigation, sign-in identities and public pricing. Prototype marketing-only tests can still be selected explicitly.

SDK imports go through `tests/helpers/browser-auth.ts`, so each Vite optimizer uses the same Firebase Auth module instance as its app. The backend test server has a separate optimizer cache and seeds its named holiday catalog from the checked-in verified reference. It never seeds production or relies on another test's default database.

Updated assertions cover the reviewed page/dialog-owned vertical scrolling, date fields specifically (rather than editable timezone combobox text), the new tab priority, searchable language controls, rich combobox overlay text contrast and removal of obsolete staff-plan labels. Visual readability checks still examine the visible rich label using its actual styles.
