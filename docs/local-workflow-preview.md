# Local workflow preview

These helpers prepare clearly labelled fictional data for local review. They require the `demo-niu-niu` Auth and Firestore emulators at ports 9099 and 8085. They refuse other project/host configurations and do not connect to production.

Codex handles terminal setup and validation; the business owner can request a populated preview in English or Chinese without running these commands.

## Preparation

1. Start the existing demo emulators with `npm run dev:local:emulators`.
2. If the photo fixture library is absent, use `npm run seed:local:photos`. It requires the existing authorized Firebase CLI login to read the private development photo library. It preserves existing records and attribution. Do not substitute real customer records.
3. Run `npm run seed:local:workflows`. It adds the practice house/room and fictional balances, validity templates, planned/in-care/completed/cancelled stays. Earlier edits and existing records are retained. Only customers and pets explicitly marked `testFixture: true` receive workflow fixtures. No payment is collected.
4. Start `npm run dev:local:api` and `npm run dev:local` if those local servers are not already running. The preview is at `http://localhost:4180`.

The tools use the default demo database for this existing preview. For isolated validation, set `FAMILY_PAWS_FIXTURE_DATABASE` to a fresh named emulator database; both preparation scripts honor it. The integration test uses a unique named database, checks repeat-run behavior, and verifies that non-fixture pets and changed records remain untouched. Never clear the default demo database to run a test.

## Headless walkthrough

With the populated local preview running, `npm run test:local:browser` launches a separate headless Chrome session. It checks the calendar, customer-first booking controls, practice-room availability, balances, photos and the Chinese phone layout. It does not save a booking or balance change, and never attaches to the owner's Chrome session.

`playwright.local.config.ts` is an optional review configuration for these existing local servers. The required CI browser suite remains `playwright.backend.config.ts`, with its own named fixtures and managed servers.
