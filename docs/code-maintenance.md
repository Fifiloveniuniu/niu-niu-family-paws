# Maintaining the code

Run `npm run format` for handwritten TypeScript, React, styles, JavaScript scripts, tests and root configuration. `npm run format:check` checks the same files in CI. Generated contract types and build artifacts are excluded. Keep the current Node 24 / TypeScript / Vite tooling.

Use domain names such as `customerSnapshot`, `historyIndex`, `operationId` and `overlappingStays`. Keep persisted fields, API payloads, route parameters and exported contract names stable when renaming local variables. Prefer one declaration per statement and named helpers for logic reused across screens. Keep short local callbacks when their purpose is clear.

The web API client owns authenticated, uncached requests and HTTP status errors. Use `apiJson` for JSON, `apiOptionalJson` for endpoints that can return 204, and `apiBlob` for private photos. Cancellation and a captured identity token are supported for asynchronous lookups and photo loading; callers must still guard against stale responses. Do not add implicit write retries.

`date-utils.ts` owns strict date-only validation and local input/statement date formatting. `calendar-time.ts` retains the fixed offsets of the labelled sample planner; these are not production booking or billing rules. `calendar-fixtures.ts` contains sample stays, separate from canonical customer records.

Backend request identity comes from `request-context.ts` after the authenticated API hook. Shared schemas and text checks live in `validation.ts`; route and store authorization still applies at every protected operation. Keep transaction boundaries, idempotency, history, ownership and role checks intact.

Validate refactors with the production build, backend type check, unit tests, isolated Firestore integration tests and relevant browser tests. Never reset the owner's local database to run tests; use its separate integration database. Preview the running localhost site in Chrome. Deployment remains deferred under the project handoff.
