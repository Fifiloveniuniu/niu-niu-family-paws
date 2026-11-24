## Dialog URLs, field focus and database holiday catalogs — 2026-11-20

`useDialogState` stores only dialog flags and canonical record identifiers in `dialog.*` query parameters. Existing path routes cover pages/booking details; dialog routes preserve filters, language and sign-in return paths. Accepted navigation events hydrate dialogs, with cancellable authorized API reads and pending-data sentinel support. Unsaved drafts stay in component memory; the existing discard guard handles Back/Forward before hydration. Parent closure removes nested child query state. Invalid or unauthorized records show a localized unavailable notice. Canonical pet lookup uses scoped workspace API reads, not an unsupported individual GET endpoint. Customer pickers preserve selected text on opening and resolve selected records beyond the first directory page through authorized pagination.

Shared field focus uses a two-pixel inset outline so scrollport clipping cannot remove the indicator, including custom autocomplete/select triggers. The rule applies across all four palettes; dialog fields also constrain their width to their container.

Public read-only `/api/public/holiday-presets?year=YYYY` reads `configuration/holidayCatalog` (year index) and `configuration/holidayCatalog/years/{year}` (country groups). It does not read a frontend hardcoded business calendar or mutate pricing. Admin choices group US/CN/IN and deduplicate selected date keys, so coincident festivals cannot double the fee. Existing selected holiday dates/custom dates are preserved. `scripts/prepare-local-holiday-catalog.mjs --apply` requires the exact demo project/Auth/Firestore emulator environment and writes reference docs only; without apply it only prepares reviewed reference data. Reference years 2025–2028 use official OPM, Hong Kong Observatory and Indian government calendars. India 2028 explicitly has fixed-date choices only and marks movable dates unavailable. No hosted catalog or financial settings were changed.

## Calendar display filtering and free-order booking input — 2026-11-20

Saved Calendar uses a normal admin `customer` query filter separately from authorization/view-as scope. It derives matching room keys from already scoped, date-window API bookings and current pet/type/status filters, then removes nonmatching rooms and empty house shells when matching locations is enabled. Busy spans from other customers never establish a matching-pet location. No room roster, financial rule or database data is invented. Add booking uses canonical customer/pet pair option IDs, derives owner from the permitted chosen row, and gates step progression rather than disabling unrelated inputs. Existing server ownership/capacity/funding checks remain authoritative.

## Persisted scheduling activity — local follow-up, 2026-11-20

Booking operation receipts now persist activity delta/date metadata in the same transaction as their result. Scheduling-only receipts record zero boarding-day change; actual boarding-day deductions are distinct saved balance events. Workspace prefers the saved receipt activity snapshot and keeps backward-compatible projection for old records. The guarded local metadata backfill stores snapshots/charge-kind labels with audit records without touching financial amounts, original receipt signatures or operation results. Frontend tables/details/CSV render the API delta directly instead of substituting a dash for booking IDs. Totals still use the separate financial entries once each.

## Local test payments and booking funding — 2026-11-20

Payments uses authenticated customer-scoped simulator APIs, never client-held card data. Test-payment routes are registered only in the isolated demo runtime. Both store construction and booking funding activation verify the demo project and Firestore emulator endpoint; production keeps unbilled booking behavior and advertises test payments unavailable. The provider is an in-Firestore simulator, so booking/capacity/debit/test-charge/receipt commit atomically without external side effects. Do not reuse this transaction as a real-card integration: that needs provider idempotency, payment authorization/capture and recovery orchestration.

Server funding review reads canonical pet, house timezone, balance validity/version, configured rate/holiday snapshot and saved test-card version. Confirmation recalculates and compares the review token; no client amount or card flag is trusted. Valid boarding days cover the ordinary base charge, and configured holiday fees remain separate card amounts. The current quote has one configured base rate for the selected pet across the stay, so allocating base days chronologically does not change the uncovered amount. Original quote inputs/rates/validity and actual actor are retained. Recorded balance charges use a separate event/operation ID from the booking receipt to avoid duplicate activity keys. Test-charge history uses customer-scoped stable descending timestamp/UUID pagination and existing shared UI pagination.

Charged booking room-only moves retain the original funding and perform no additional financial write; planned dates and house timezone must remain unchanged. Handoffs do not charge again. Charged date changes/cancellations remain blocked until adjustment/refund rules are approved; legacy unbilled operations remain available. There is no historical migration or real card integration in this local change.

## Calendar/dialog and pricing-entry follow-up — 2026-11-20

Normal-calendar date headers must remain sticky inside their owning scrollport. Focused balance, validity-template and pricing dialogs keep title/actions visible with a scrolling form body; template lists adapt to cards on phones. Category translations are explicitly added with Enter and removed per language, retaining English/Chinese requirements and optional Spanish fallback. Holiday configuration offers named US actual-calendar-date presets with manual selection by year, preserves custom dates, and never automatically enables holidays or substitutes observed office weekdays. Existing pricing/date-only API schemas and cancellation draft/financial boundaries are unchanged.

## Focused price-name translations — 2026-11-20

`PriceNameEditor` reuses the shared language registry and CustomSelect, stores only the active editor language locally, and writes draft names through the existing parent price state. Switching languages never changes saved values or marks the form dirty. A single visible input avoids hidden required fields; the existing English/Chinese validation and optional Spanish fallback remain. Customer preview uses the same `priceName` function as Pricing/public display. Blank optional Spanish, including whitespace, retains the fallback. Pricing dialogs have scoped dirty-notice contrast and responsive field alignment.

## Calendar, unified activity and Spanish — 2026-11-20

`CalendarControls` and the shared timeline components own saved-calendar navigation, sticky scrollports, date/holiday annotations and the live clock. Booking availability has a separate display timezone; editing it leaves booking wall times/instant resolution intact. `estimateBoarding` produces a display-only itemized estimate using supplied/configured rates, inclusive house-local dates and separately itemized holiday fees; missing prices stay unknown, with no financial mutations.

Workspace Activity reads immutable `balanceOperations` and `bookingOperations` in parallel, applies authorization and customer/pet/kind/date filters before bounded reads, merges newest first, and paginates with an actor/filter-bound timestamp/UUID/source cursor. Booking history is projected from existing operation receipts, so historical bookings appear without migration or fabricated balance events. Booking projections have `daysAfter: null`; UI/CSV keep financial columns empty. Transactional save/cancel idempotency is unchanged. Include the new booking-operation query indexes before publishing.

`/workspace/busy` verifies canonical customer scope and returns only clipped room/house/time spans from other customers' active bookings, with overdue occupancy extended to the requested window. Customer names, pet IDs, booking IDs and staff metadata are absent from items. Busy indicates occupancy, not necessarily full capacity. Add booking separately checks weighted remaining capacity, species and timing rules for the selected pet across the entire stay. Ordinary booking reads remain owner scoped. `PetDetails` uses canonical scoped/paginated workspace, booking and activity endpoints; its modal does not bypass record ownership.

The Spanish resource catalog preserves the complete English key/nested/interpolation shape. The shared language registry drives routes, menus, document language and formatting. Optional `PriceRate.nameEs` is backward compatible and audited with the other labels; unchanged owner-supplied labels can inherit their supplied Spanish translation while renamed/custom labels require an owner-entered translation. Prices and historical transactions are unchanged.

## Retired management routes — 2026-11-20

Canonical routing maps operations, settings root and location-settings URLs/deep links to Calendar without losing language/query state. Removed operations/employee-assignment page components and the saved/preview settings overview. Calendar row editors continue to compose Houses/Rooms inside Modal. Cancellation policy stays on its existing scoped administrator route and returns to Balances. Employee-only routing now opens personal Profile. Operational/location APIs and stored data are preserved. Timezone uses the shared CustomSelect with an accessible name but no visible label.

## Shared presentation controls and Metrics source — 2026-11-19

`button.tsx` owns primary/secondary/icon action surfaces; `icon-button.tsx` pairs secondary action labels/tooltips; `search-input.tsx` supplies shared search fields. `segmented-tabs.tsx` owns selection rendering and arrow/Home/End navigation for Calendar, Pricing, Balances and Metrics period controls. Its buttons mode uses pressed semantics; tabs mode uses roving focus and tab semantics. Paired primary/on-primary roles drive every selected segmented control. `Modal` also owns the marketing photo viewer and preview booking details.

Metrics has no frontend sample-data path. The guarded local metrics seed writes persisted canonical records through ordinary audited booking/balance stores, with explicitly fictional identities and reviewed fixture dates. Its historical manual events are fixture-only, not an implementation of automatic booking charges/refunds. Existing demo records stay intact. The normal aggregate API remains authoritative and revenue remains unavailable without payment records. No production fixture seeding or financial activation.

# Architecture and planned workflows

## Browser appearance preferences

Appearance is frontend-only: version-2 `family-paws:appearance` contains a supported palette name, with a bundled component style defined by `theme-catalog.ts`, `theme-presets.css` and `theme-components.css`. Migrate legacy custom and retired preset names to supported presets. Validate malformed/unknown data and fall back to Google. Scope root palette/style attributes to app routes; remove them and restore original marketing metadata on public routes. Restore the saved choice on app navigation/history. Cross-tab storage events update app appearance without recoloring marketing pages. Storage failures leave working session-only changes with an explanation. Initialize before React mounting without inline scripts or CSP changes. No API, Firestore, account synchronization or authorization changes.


## Request path

Browser -> Firebase Hosting frontend -> Cloud Run REST API -> Firestore.

The browser obtains a Firebase Authentication token. The backend verifies it and enforces role and record ownership on every operation. Browser visibility is not authorization. Business data is accessed through the API; direct browser access to Firestore is denied by default. Admin SDK access is controlled with IAM and backend checks.

Public landing content should be statically prerendered for discoverability. The authenticated portal is a React application.

## Consistency

Use Firestore transactions and operation identifiers to save service usage and deduct balances atomically. Retries must not deduct twice. Preserve administrator adjustment history and the employee responsible for each handoff. Store timestamps consistently and display them in the configured business timezone, including daylight saving transitions.

## Email delivery

Persist reminder eligibility/outbox state with the balance transaction, enqueue a Cloud Tasks request, and send through a verified email provider. Use stable reminder identifiers and provider idempotency where supported. Recover from the gap between database commit and task creation through an outbox reconciliation process; its scheduling is to be selected before implementation. Do not send email as untracked background work after returning a Cloud Run HTTP response.

## Deployment

Use the target project `niu-niu-family-paws`. Firebase Hosting, Firebase Authentication, the default Firestore database, and Cloud Run customer API are deployed. The owner approved `us-west1` (Oregon) for the database and backend. Firebase Hosting is a global CDN, so US backend/database regions alone do not guarantee US-only processing.

Frontend and backend share one repository under `apps/web`, `apps/api`, and `packages/contracts`. API types are generated from OpenAPI. Current deployments use the owner's existing authorized CLI session, with separate runtime and build identities and no service-account keys. Future deployment CI should use Workload Identity Federation. Cloud Run uses request-based billing, zero minimum instances, and two maximum instances.

The API checks the token and current Firebase account status on every business request. Directory operations require current administrator authorization (managed Firestore policy, or legacy Auth bootstrap claim for unmanaged identities); profile operations require an active verified Google identity and derive ownership from its UID. `people/{uid}` references one canonical customer document. Self and administrator edits share that document/version/history, and protected ownership/verified-email metadata cannot be set by clients. Its dedicated identity has database access and only `firebaseauth.users.get` for current account checks. Automatic Cloud Run request URL logs are excluded because search terms can contain customer information; safe application/system logs remain available.

Registered profiles require the metadata-preserving API introduced with customer registration. Do not roll Hosting back to a pre-registration API that replaces entire customer documents and drops ownership fields. Older frontend payloads can use the new API. See `docs/customer-profile.md` for the deployment/rollback boundary.

Pet profiles use canonical `customers/{customerId}/pets/{petId}` documents with immutable customer relationships, transactional versions and actor audit history. Current customer ownership/current administrator authorization is checked for list, save and private photo reads. Administrator pet-name search joins canonical customer information using a collection-group prefix index. Photos use a private Oregon Cloud Storage bucket with enforced public-access prevention; the API validates/reencodes uploads and reads immutable content-addressed WebP objects. Browser Storage access/download tokens/public URLs are not used. Runtime create/get permissions are bucket-scoped. See `docs/pet-profiles.md` for image limits, retention caveats and deployed revision. Retain the pet-capable API when rolling back frontend releases; older APIs have no pet endpoints.

Keep secrets in Secret Manager. Production customer data, tokens, and credentials must never be committed. The database has deletion protection. Customer records and audit history have no automatic deletion; scheduled backups/exports and a business recovery/retention policy remain undecided.

## Verification before launch

Account linking is deployed: a 24-hour hash-only one-time code allows a verified Google identity to request access to an unclaimed customer; a current administrator must verify and approve the request. Approval rechecks the target Auth account and reviewed record versions, then atomically adds canonical ownership/mapping and actor/effective-UID audit records without moving pets or photos. Existing personal profiles are not merged. Runtime IAM remains unchanged. See `docs/account-linking.md`.

Test authorization boundaries, duplicate submission handling, concurrent balance updates, correction behavior, reminder retry/deduplication, timezone handling, bilingual forms, and mobile handoff workflows. Configure logs to avoid customer data and credentials. Separate development/test data from production.

## House configuration (local feature)

Admin-only `/api/houses` GET and `/api/houses/{id}` PUT use canonical `houses/{id}` records, stable UUIDs, named IANA timezones, transactional versions and `history/{version}` actual-actor audit entries. Identical retries do not duplicate history; conflicting updates return 409. House writes require a nonblank address; existing missing addresses remain readable and are flagged for completion. Calendar exposes an address dialog. Houses are not yet deployed and do not imply approved addresses, capacities, rooms or booking rules. No deletion/archiving policy is introduced.

Local fixture API uses demo Auth/Firestore and a disposable photo cache sourced from private dev GCS; production uses its existing private bucket. Integration tests use the emulator's separate per-run `integration-*` database to avoid adding partial fixtures to the owner’s default demo preview. Test-mode frontend proxy always targets local demo API port 8081, never the production relay.

## Room capacity direction — WIP, not deployed

The requested hierarchy is House → Room. Individual spaces are removed from the product model. Room configuration has a maximum capacity; pet category/type/weight groups determine consumption, and an admin-set per-pet override takes precedence. Only one species may occupy a room at a time; it may switch species between non-overlapping stays. Weighted capacity and temporal species exclusivity must both be checked when bookings are implemented.

Draft PR #41 and its intermediate uncommitted room revision are preserved as WIP. Do not treat its API/contracts as completed architecture or import them into the clean calendar/balance branch. Preserve old saved local records/history rather than deleting them to reflect a UI change. No actual capacity/group defaults have been approved.

## Calendar and balance implementation boundaries

Continue from main using canonical customer/pet IDs and server-derived ownership/current roles. Keep planned and actual visit timestamps distinct and display house-local times. Package/purchase/usage references must survive customer linking and corrections. Use audited, idempotent transactions for balances and room reservations; no double spending/deduction on retries. A future combined booking operation must check package eligibility, balance and room/species constraints consistently, not rely on an earlier availability read.

Thirty-day package size, three-month first-use validity, holiday rates and 14-/7-day refund policy are confirmed requirements. The exact financial/day-counting/activation/refund boundaries are not settled; consult requirements before implementing them. Available/reserved/used balances are a proposed presentation, not permission to invent a deduction lifecycle. No payment provider is selected.

Preserve Google Cloud and the existing local demo isolation. Keep the current build tooling; the SWC migration was cancelled. Defer deployment until the full requested feature set is complete.

## Balance planning prototype (not a financial backend)

The dev-only calendar keeps sample PetBalance records and adjustment history in React page state. Only boarding balances are supported; coverage is keyed by sample pet and boarding service, checks explicit staff-reviewed whole days, manually reviewed coverage dates, and subtracts other new preview plans from planning headroom. A pure reducer rejects negative totals, stale versions, conflicting operation IDs and changes that invalidate a plan. Removal only removes the preview plan reference. No financial reservation, purchase, activation, deduction, refund or persisted ledger is implemented, and the UI says so. This client-side simulation provides no production authorization/transaction guarantee; real balances must use canonical IDs, current server roles, audited idempotent Firestore transactions and approved financial policies.

## Simplified balance policy templates (local preview)

Per latest owner instruction, a balance uses one reviewed date range rather than a second eligible-month restriction. Named, service-scoped templates copy this range into setup; they never share credits or retroactively alter other accounts. Templates and balances remain page-local React state, not persisted financial configuration. Adjustment reason is optional; amount/version/operation/history and planned-stay protections remain. No automatic package activation or expiry rule is inferred from these manually entered dates.

## Local boarding workspace pages

Development-only hash routes keep one mounted calendar workspace so navigating between calendar, cancellation policy and transactions retains preview balances, location edits, stays and templates. Leaving an editor is protected by the shared draft guard before changing the route. Cancellation policy uses a page-local draft in the workspace; the 14-day/full and 7-day/half terms are known, while short-notice percentages and cutoff calculations start unconfigured. Saving the draft does not activate refunds or change historical bookings. Production routing/API/data are unchanged.

The dev-only #/transactions route derives an immutable read view from existing preview balance history. Credits, manual corrections and zero-unit term changes remain distinct from unimplemented booking charges/refunds. Each row uses the recorded post-change pet balance; filters do not rebuild a misleading running total. Date filters use the displayed browser-local day; exported timestamps are explicitly UTC. CSV quotes text/formula prefixes and keeps numeric amounts numeric. A pet-scoped balance link uses an encoded query parameter; route guards handle queries without resetting the workspace. This is not a persisted/authenticated financial ledger; production statements still require canonical IDs, actor references and transactional server history.

## Integrated local administrator shell — 2026-11-16

In development, Portal owns current authentication and renders one mounted HouseCalendar shell for administrator routes. Ordered navigation is Calendar, Customers, Balances, Statement, Settings; /personal is secondary and /cancellation-policy selects Settings. Customers and Profile remain mounted in hidden route containers to retain drafts. The route guard skips their retained drafts only for internal shell routes, while sign-out/public navigation/login departure still check all drafts. Balance/policy editors continue to require discard confirmation. Role/identity loss removes administrator customer components and clears sample balances/plans/configuration; the user's own Profile stays mounted across same-identity role loss. Backend authorization remains mandatory.

Balances reuses PetBalances as an embedded page or focused dialog, sharing the existing in-memory model/statement. These routes remain development-only, preserving the production portal while the financial workflow and room setup are unfinished. No calendar sample is linked to a saved booking or canonical financial balance. Mobile customer selection scrolls again after the pet list loads, avoiding a focus jump to an incomplete short panel.

## Statement inside Balances — 2026-11-16

Latest local navigation is Calendar, Customers, Balances, Settings. Balances owns Overview and Statement subviews. Canonical statement links use #/balances?view=statement with optional encoded pet scope; legacy #/transactions links still resolve to the same nested statement and select Balances in primary navigation. The existing statement data, validation, details and CSV implementation are reused with a subordinate heading. The selected overview pet survives subview transitions in workspace state; full-page customer filters start at All customers, while pet-scoped dialog behavior is unchanged. Settings exposes cancellation policy only; Calendar retains saved house management. No API, ledger, auth or production-routing change.

## Persisted rooms (local feature, not deployed)

Admin room list/save endpoints use canonical houses/{houseId}/rooms/{roomId} records, versioned retry-safe writes and actor history. Rooms require an existing house with a completed address; capacity and configured species consumption must be positive. Unconfigured species cannot be booked. Room writes update the per-house houseSchedules revision lock for coordination with booking transactions. Capacity reductions below saved active occupancy and consumption changes while stays remain active are rejected, preserving the current assignment until a reviewed change policy exists. No deletion, pricing, turnover or approved business defaults are inferred.

## Persisted manual boarding ledger (local API feature, not deployed)

Each canonical pet has one boarding balance account with whole-day credits and an explicitly reviewed valid-from/valid-through range. Administrator adjustments atomically write the account, immutable events and a globally unique operation receipt containing actual actor/customer/pet and before/after terms. Exact retries return the original receipt without applying again; changed payloads/actors/targets and stale versions conflict. Negative totals are rejected; credits cannot be borrowed from another pet. Own-customer reads recheck canonical ownership and omit internal actor UIDs; ledger history is cursor-paginated. This is manual credit/correction persistence, not payment confirmation, package activation, reservation, booking usage or refunds. Frontend integration and the approved financial lifecycle remain pending.

## Persisted unbilled scheduling (local API feature, not deployed)

Canonical booking saves, edits and actual handoffs are audited/idempotent Firestore transactions. Active house and pet queries are coordinated through houseSchedules and petSchedules locks so independent rooms/houses cannot double-place a pet or overbook capacity during concurrent saves/configuration changes. Decimal capacity sums are exact. Saved pet species/consumption and house timezone remain explicit. In-care pets with overdue pickup block capacity until actual pickup is recorded; recording pickup does not depend on optional pet metadata remaining configured. Existing guests are immutable, closed records retain history, and in-care edits change expected pickup only.

Availability returns aggregate free/blocked room spans, labels and saved addresses, without other customer/pet identities. Booking lists enforce own scope or current admin access and support indexed occupancy-window reads with overdue in-care rows plus cursor pagination. Planned/actual times remain distinct UTC instants with house timezone metadata. Required composite indexes are checked into firestore.indexes.json for final deployment.

All implemented placements are explicitly unbilled staff plans: no credit is reserved, spent, restored or marked paid. Normal customer booking writes fail with booking_policy_unconfigured after ownership validation until the approved financial lifecycle is implemented. Admin view-as retains the actual administrator and explicit effective customer in audit history; it cannot masquerade as a customer Firebase identity. This API layer does not yet replace the development-only UI; production workspace integration follows.

## Canonical workspace reads (local API feature, not deployed)

Paginated workspace pet rows join canonical customer contacts, pets and current boarding accounts on the server. Current admins may read all or an explicit customer; ordinary Google customers derive their canonical scope from people/{uid} and current ownerUid. Empty/unregistered profiles return no private rows. House/room catalog reads contain no private placements. DTO projections omit ownership and internal metadata; own ledger events omit actor UIDs.

Pet identity is the canonical customerId/petId pair, including scheduling locks and duplicate checks; equal pet UUIDs under different customers remain separate records. Calendar indexes include this pair. Real authenticated HTTP tests load100 customers/300 pets across three pages, verify owner/view-as projections and same-pet-ID isolation, and confirm current role removal immediately stops global reads. Frontend connection follows separately.

## Scoped recorded boarding statements (local API feature, not deployed)

Workspace event reads join immutable boarding events and canonical customer/pet labels through atomic balance-operation receipts. Customer scope is server-derived; pet filters require their canonical customer/pet pair. Customer, pet, activity and UTC date filters run before stable time/operation-ID pagination. Internal operation signatures/before snapshots are never returned; own rows omit actor UIDs. Entries retain their recorded running balance after the change regardless of filters. Only manual credits/corrections/coverage-note changes exist: no fictitious booking charges, payments or refunds are produced. Composite statement indexes are included for final deployment.

## Integrated saved workspace (local frontend, not deployed)

Authenticated admin/customer pages use the canonical workspace APIs rather than calendar fixtures. Canonical customer/pet and house/room pairs identify rows and filters. Admin customer context is an explicit server-checked filter, retaining actual Firebase identity/audit actor; normal users derive their own scope on the server. Calendar occupancy windows, directory pagination, current accounts and recorded statement filters/exports read persisted data. Versions and stable operation IDs protect manual adjustments, staff plans and actual handoffs; uncertain saves retain frozen inputs for identical retries. Confirmed forms release only their own draft notice, and context changes protect retained customer drafts.

Custom date controls capture neutral wall values; selected IANA zones resolve real UTC instants, reject DST gaps and require explicit repeated-time choices. Availability uses aggregate free/blocked spans without private guest identities. Staff bookings remain explicitly unbilled, and customer paid booking is unavailable until financial policy is configured. An isolated named-database browser harness exercises the same real authentication/stores/routes used by production, without writing owner/demo records. Native Chrome walkthrough and final combined deployment remain outstanding.

## Saved validity templates and explicit partial date input (implemented; deployment deferred)

Administrator-only validity templates store named, reviewed valid-from/valid-through dates and active/archive state. Writes use versions, immutable actual-actor history and actor/target/payload-bound operation receipts; identical retries return the original result. Template dates are copied into balance adjustments rather than linked dynamically, so editing or archiving a template never rewrites existing account coverage or balance events. These templates do not infer financial activation, billable units or expiry policy.

Date/time pickers immediately expose the selected day as a partial wall value, without inventing a midnight time. The field requires an explicit time before scheduling can advance; the existing IANA-gap/fold resolution remains authoritative. Autocomplete options can provide an avatar/icon adornment shared by the selected input. Type filtering uses canonical pet metadata, without inferring species from editable names.

The local fixture preparation script guards the demo emulator addresses/project, migrates only still-marked synthetic pets with absent (not explicitly cleared) species from their recorded testSpecies, preserves images/credits and existing accounts/bookings, and creates one clearly labeled practice house/room only if absent. It cannot run against production.


## Current-account role display (implemented; deployment deferred)

`GET /api/identity` returns only the authenticated actor UID and role names, with private/no-store caching and no caller-selected scope. Current Firebase account state supplies exact-boolean Admin/Employee claims; verified Google identities have the existing personal Customer access. This display endpoint grants no permissions and has no write operation. Profile uses the generated contract, keeps account roles distinct from view-as customer records, refreshes on visibility resume, and omits unverified roles on errors without blocking ordinary profile editing. Location management is reachable from Calendar and cancellation configuration from Balances after removal of the Settings header action. Pricing navigation and management are implemented through the separate boarding-configuration feature.


## Local pricing, paging and assigned-house operations — 2026-11-18

The new versioned pricing configuration, bounded record-list reads, filter-bound statement cursors and employee operational transactions are described in [pricing-and-operations.md](pricing-and-operations.md). Added composite indexes remain undeployed. The canonical Pet read contract now includes optional verification weight/date; the actor/reference stays in trusted storage/history. Employee role is checked against current Auth state and current trusted house assignments, including inside operational write transactions. No financial permissions or paid-booking lifecycle are granted by operational access. Public pricing exposes active configuration only. All local e2e runs use isolated headless Chrome, never the owner's Chrome profile.


## Shared presentation layer

The public site and authenticated pages use shared Material color roles in `apps/web/src/material-theme.css`, alongside existing fonts and branding. Dialogs and form controls reuse the existing React components. The saved main calendar and booking wizard share viewport, frame, axis and track components from `calendar-timeline.tsx`; `timeline-layout.ts` owns timezone-aware day boundaries, visible interval clipping and grid positioning. Use these components for new timeline views instead of independently calculating dates or percentages. See [UI conventions](ui-design.md) for usage and validation boundaries. This presentation work does not change the Google Cloud architecture or financial rules.


## Business metrics

`GET /api/business-metrics` requires the current verified administrator role. Firestore count/sum aggregations return only explicit aggregate fields, never customer/pet records. Current customer/pet/in-care/overdue counts and recorded boarding days are independent of the selected period. Period counts use scheduled arrival/pickup (excluding cancelled bookings) and actual arrival/pickup separately, with an inclusive lower and exclusive upper UTC boundary. The UI resolves inclusive date-only selections in the chosen IANA timezone. Requests are bounded to 366 days; no first-page/client-side totals or inferred revenue. Recorded days include every saved validity range and are not labeled spendable days. Error/refresh states clear old results. Aggregate queries are individually current, not one transactionally frozen cross-metric snapshot. New group/composite indexes are recorded in firestore.indexes.json and remain undeployed.


## Local Metrics charts and grouped filters — 2026-11-19

Administrator navigation begins with Metrics; explicit return destinations and customer routes retain their existing scope. Calendar filter groups remain mounted when collapsed to preserve filter state. Balances/Activity reuse Pricing segmented styles; secondary icon controls retain accessible names and tooltips.

MetricsQuery accepts an optional IANA timeZone. Shared pure packages/time helpers split the inclusive-lower/exclusive-upper range at real zoned midnights into at most 12 intervals, including DST. Counts and sums run server-side with bounded interval concurrency. Series include active scheduled arrivals, customer creation and net recorded balance changes. Separate before.days and after.days aggregations preserve initial credits with missing/null before snapshots: Firestore multiple-field aggregates exclude documents missing any aggregated field ([Firebase aggregation documentation](https://firebase.google.com/docs/firestore/query-data/aggregation-queries?hl=en)). Usage counts actual boarding arrivals by recorded species, without inventing grooming records. Current snapshot counts are separate from period graphs. Revenue is explicitly unavailable, with null monetary values. New collection indexes remain undeployed. API Docker copies all packages, including shared time/metrics/pricing code. No booking/payment/refund transaction is activated by these graphs.


## Isolated dashboard presentation samples — 2026-11-19

Metrics uses one responsive card/plot system for six aggregate views. A frontend-only DashboardMetrics projection permits monetary values solely for explicitly labeled fictional samples; the API contract, recorded aggregates and unavailable-payment behavior are unchanged. Sample generation uses fixed UTC-dated example events and shared timezone intervals. Changing the reporting zone only regroups events: current snapshots and totals over the same UTC window remain unchanged. Species counts reconcile to actual arrivals, scheduled/actual counts remain distinct, and future records are not fabricated. Sampling has no storage/write path. A test-mode development guard controls availability, and only the explicitly enabled local demo defaults to sample mode. URL data=saved overrides that default. Production builds cannot select samples. Authenticated administrator routing remains unchanged.

## Access UI preview — 2026-11-24

`identity-access.tsx` is the administrator-only `/app/access/` preview; its tab uses the shorter Access label. `access-preview.ts` defines explicit fictional records and pure preview-only normalization, duplicate-invitation and current/last-admin validation; it is not a server authorization module. Accounts, invitation drafts and before/after history live only in mounted component state. Section selection and focused dialogs are URL-routed; draft emails/reasons remain in memory. After an invitation draft is saved, section navigation occurs after the editor unmounts, avoiding a spurious dirty-form warning. No IAM/account write endpoints or Firestore changes are introduced. A real implementation must enforce authorization and lockout checks on the server, address current Firebase identity/claim refresh and revocation, and persist idempotent, concurrency-safe audited changes.

## Server-backed Access — 2026-11-24

This supersedes the fictional Access preview architecture. See [access-management.md](access-management.md). Generated contract aliases in `packages/access/types.ts` are shared by the real Access UI and `access-management.ts` API store/routes. Runtime authentication requires Firestore and enforces current managed `accountAccess` state before any business request. Versioned policies and compatible employee assignments commit with shared serialization, immutable audit and idempotent receipts. Google authentication remains in Firebase; no Auth write permissions or claim-sync saga is needed. Portal routing uses the backend identity endpoint and refreshes current access while visible. The read-only default directory projects Firebase Auth pages and current policy/assignment records, applying filters before returning a page.

Invitation codes remain in form memory/request bodies and are stored as digests only, with email-index serialization, expiry, current issuer checks and atomic acceptance. My profile hosts recipient acceptance independently from customer record linking. Uncertain saves retain a frozen reviewed payload/operation; stale versions require a new review. No client-side preview data is used. `npm run check:local:access` provides guarded actual-localhost validation. Final deployment must retain a policy-aware API for rollback.
