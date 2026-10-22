# Administrator's own customer workspace

Frontend feature: administrators choose Customer management or My profile & pets after the same Google sign-in. Each has a clear pressed button and workspace description; the page heading follows the selected workspace. Current administrator role remains visible. Staff/customer landing behavior is preserved.

Both panels stay mounted while switching so unsaved directory/profile/pet edits and pending saves are preserved. Hidden panels are excluded from normal keyboard/accessibility interaction. Each UID change/sign-out resets the selection; reload starts in customer management. Current access checks remove administrator management when the claim is revoked. These controls organize the existing authorized views; API authentication/ownership checks remain authoritative. No impersonation, claim changes, data copies, account linking or new role grants.

Reuses the canonical `/api/profile` and pet endpoints. No backend, database, IAM, billing or region changes. Existing pet-capable Cloud Run revision must remain deployed.

Build and seven isolated Chrome/Auth emulator browser tests passed. The new test verifies selection, directory/profile/pet draft preservation, same-UID access refresh, role revocation, sign-out and 400px Chinese layout. Business responses are mocked in browser tests. Real Google preview, PR/CI, Hosting deployment and live checks remain before delivery.
