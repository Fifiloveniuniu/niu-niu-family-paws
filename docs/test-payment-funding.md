# Local test-payment booking funding

Staff confirmation uses eligible pet-specific boarding days first and a saved simulated test card for the uncovered amount and configured holiday surcharge. Atomic Firestore transactions save reservations, day debits, charges, quotes, immutable receipts and activity together. Declined, insufficient or stale attempts do not partially save; identical operation retries replay their receipt. Payment records and activity are paginated and server-scoped.

The payment store and booking activation require the exact isolated demo project and emulator endpoint. Production remains on the existing unbilled path; no real card provider is connected. No card number or CVV is collected. Existing unbilled plans are not retroactively charged.

Charged date/length changes and cancellation refunds remain explicitly blocked pending owner-approved mixed-payment rules. Do not activate production financial behavior or invent refunds. A guarded dry-run-first local activity metadata backfill preserves amounts and balances.

This layer includes the integrated funding review, independent booking field order and database-backed activity projection needed to show the recorded result.
