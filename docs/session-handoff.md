# Session handoff — 2026-10-22

## Boarding-only balance direction — 2026-11-15

Latest owner clarification: rename Set up balance to Add balance; only boarding, no daycare balance. Booking costs deduct balance and cancellation restores credits automatically based on cancellation date. Asked whether approved cutoffs are ≥14 days 100%, 7–13 days 50%, <7 days 0%, and whether units are prepaid days (including half-day refunds) or money; answers pending. Do not infer under-seven-day refund, rounding, money currency/rates or automatic stay counting. Branch feat/boarding-only-balance implements the independent UI change: only boarding typed balance/placement references, no service selector, Boarding balances entry, Add balance for new/top-up actions and Save adjustment for corrections. Existing balance days/history and date templates stay intact; no booking deduction/refund behavior has been claimed complete. Build, 26 unit tests and all eighteen browser cases pass (seven focused calendar/photo cases also passed); actual localhost Chrome confirmed Boarding balances, Add balance, no service tabs and all twelve saved profile photos. Financial answers remain pending. Photo recovery #49 is merged as b5f0c5c (Verified); normal emulator Google popup smoke also confirmed real private photo reads returning200 and image recovery.

## Photo access recovery — 2026-11-15

Owner reported missing avatars after local Auth restart. Photos/cache and profile records were intact; signed-out/expired tab had neutral placeholders. Reconnected existing local-admin through normal Google emulator popup and verified all twelve balance photos in actual localhost Chrome. Added bilingual in-place Sign in for pet photos in calendar and balance sidebar, clearer sign-in placeholders and denied-admin explanation, popup errors/retry. Uses existing Google session persistence and API authorization; no public photos or role bypass. Login recovers images without leaving the editor. Build passes; browser test records draft survival across auth recovery and renewed access action after role loss. No deployment or saved record changes. Review record: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/49; implementation 9075bc3 is GitHub Verified.

## Simplified balance setup and policy templates — 2026-11-15

Owner explicitly removed redundant eligible months alongside valid-from/through and made reason optional. Local balance model/validation now uses one full-stay reviewed date range. Set up balance focuses on starting days and optional reason; editing hides metrics and initial Add selector. Coverage policy is open for initial setup and collapsed for adjustments, with automatic expansion on invalid fields. Service-scoped named templates copy reviewed dates into another pet’s balance; Custom dates permits exceptions, template changes never share credits/retroactively change accounts. Templates persist only across modal close/open within the calendar page, like all other preview state. No built-in business dates or inferred expiry rules.

Owner also wrote “boarding and beatify balance”; beauty/grooming interpretation and unit (sessions or money) remain unanswered. Do not silently relabel existing daycare day credits as grooming or infer its units. Actual localhost Chrome walkthrough confirmed optional reason, template controls and absence of month grid; saved records/photos, earlier draft tabs and WIP #41 preserved. No deployment or real balance changes. Build and 26 unit tests pass. Full 18-browser suite passed after starting missing local Auth emulator (existing Firestore untouched); final template-disclosure test rerun passed. Desktop/mobile Chinese screenshots saved in docs/screenshots/balance-policy-template-desktop.png and balance-setup-mobile-zh.png. Local frontend4180/API8081/Auth9099 are running; restarting Auth requires re-sign-in. Review record: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/48. Implementation d198efa is GitHub Verified; consult PR checks/state for merge status.

## Profile-photo avatars replace initials — 2026-11-15

Review record: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/47. Implementation `94506d4` is GitHub Verified. Consult PR checks/state for merge status; no hosted deployment.

Owner requested pet profile photos instead of first letters. Branch `feat/calendar-pet-profile-photos` starts from merged #46 (`5db2816`, Verified). Added an isolated-demo-only photo provider linking fictional calendar aliases explicitly to existing demo pet profile IDs; current profile metadata/photo is read through existing authenticated admin APIs. One page cache shares revocable blob URLs across calendar, scheduling steps/review and balance pet selectors. No image binaries/URLs are hardcoded or publicized, no seeder/reset/photo overwrites or business-data writes. Real production identities must use canonical pet IDs, not these explicit sample aliases.

Missing/inaccessible photos use a neutral pet outline, never initials or another image. Failures offer Retry profile photos. Requests are gated on verified administrator claims and exact demo mode; state/URLs clear on identity/access change or unmount, and current access is refreshed on tab return. Sample credits/source/license links are available in the UI; screenshot attribution is recorded in docs/calendar-profile-photos.md.

Build and all 17 browser tests pass; focused photo test also passed after retry handling. Coverage checks authenticated reads, six metadata queries/shared photo reuse across views, missing/failed images, retry, and removal of images/credits on role loss. Real local API smoke verified all nine calendar images and balance images from current saved profiles, without data writes. Actual native localhost Chrome visibly confirmed all calendar and balance profile photos. Screenshots: calendar-profile-photos-desktop.png, balance-profile-photos-desktop.png, calendar-profile-photos-mobile-zh.png. No deployment; saved local records/photos and WIP #41 preserved.

## Per-pet balance management and planning validation — 2026-11-15

Review/merge record: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/46. Implementation `6e9b699` is GitHub Verified. UI redesign record: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/45 (merged). Consult PR state/checks for final status; no hosted deployment.

Owner requested professional UI and per-pet balance management/validation. UI redesign PR #45 is merged as `c43162ab33c8d0196cff984dc9c43fa5322a762c` (GitHub Verified); build/CI passed, 13 browser cases passed full plus awaited-dialog workspace targeted rerun. Current branch `feat/pet-balance-preview` adds a separate sample balance manager filtered by customer/pet, separate daycare/boarding records, explicit add/remove day adjustments with required reasons, reviewed validity dates, eligible months and retained in-memory adjustment history. No assumed real credits, prices, package activation, first-use expiry calculation or automatic day count. New records are unset until configured.

Add pet asks service and staff-reviewed whole days explicitly, then review checks this pet/service only, sufficiency after other new preview plans, full date coverage and all months crossed. Missing/insufficient/invalid coverage blocks Add to preview. New placements carry planning coverage metadata; removing a placement releases only that in-memory planning allocation, keeping pet and balance history. Adjustment reducer prevents negative balances, stale versions, conflicting operation retries and changes that strand existing plans. This is planning simulation, not a financial reservation/deduction lifecycle. Earlier sample stays have no day allocations and are not charged by this preview.

All 25 unit tests and all 16 browser tests pass; build passes. Tests cover cross-pet/service isolation, date/month limits, duplicate planning headroom, idempotency/version/history, invalid reductions, insufficient-stay blocking, correction and draft continuity. Actual localhost Chrome opened Pet balances and confirmed separate pet/service controls; owner’s Oliver scheduling draft was preserved in its original tab (cancelled reload via Raise + Escape, then used a new review tab). Screenshots: docs/screenshots/stay-balance-review.png and pet-balances-mobile-zh.png. Account/plan state lives only on the current preview page; no real customer/pet balances, APIs, Firestore, payments or deployment changed.

Two async business questions remain unanswered: day counting (e.g. Monday10am → Tuesday3pm) and when days are reserved/consumed. Real persisted balance/paid-booking workflows remain dependent on those decisions and the other package/payment rules in requirements. Do not claim financial balance delivery complete or deploy this sample workflow as live. The UI/preview implementation can be reviewed/merged independently. Preserve existing emulators/photos/data and room WIP #41.

## Professional calendar workspace redesign — 2026-11-15

Owner requested a professional, clean whole calendar/Add pet UX and per-pet balance management/validation. First focused change redesigns the calendar visual system and Add pet into Stay details → Choose room → Review, with stable sticky actions, explicit step progression, narrow details/review dialogs and a wider room timeline. Draft guards remain, but the large unsaved banner is visually hidden within this wizard. Gray continuous unavailable ranges, precise inputs and keyboard/manual alternatives are retained. Replaced accumulated CSS overrides with a consolidated stylesheet; updated browser flows for step navigation. Actual localhost Chrome opened the redesigned first step; desktop/mobile artifacts in docs/screenshots/add-pet-details-*.png.

Build passed; 13 browser cases passed in the full run, with the known workspace dialog-handler race reproduced in the remaining case. Awaited its dialog handlers explicitly and reran that case before review. Per-pet balance feature is next, as a separate PR after this one. Asked owner asynchronously for day-counting and reservation/consumption rules; these are required for real financial workflows. Independent sample balance UI/manual validation can proceed without guessing automatic deductions or payment rules. No deployment, production records or room WIP #41 changes.

## Continuous gray unavailability ranges — 2026-11-15

Owner clarified that unavailable periods must be gray time ranges, not individual dark date tiles. Revised unmerged PR #44 accordingly: Add pet now has continuous per-room timelines, gray bands at exact occupied/unavailable boundaries (including partial days), and free space between bands. Range reasons remain visible/accessible with exact-time tooltips. Select the entered stay with Choose room or its green range; tapping a free point shifts the whole entered interval to that minute and revalidates it. Crossing any conflict is rejected, and gray bands cannot be selected. No dragging required; exact datetime fields/manual selectors remain keyboard alternatives. Unknown configuration/overdue stays conservatively gray their affected range. Boundary/turnover decisions remain unresolved and are still rechecked on submission.

Added pure unavailableRanges sweep/merge helper and tests for partial-day boundaries, merging across unrelated stay endpoints, peak capacity changes, overdue, missing setup and duplicate-pet reservations. All 20 unit tests, build, four targeted browser cases and all 14 browser cases pass; calendar coverage includes tapping free time. Actual localhost Chrome opened the continuous timeline; desktop screenshot refreshed. PR #44 is still the active feature record; do not merge an earlier individual-day version. No deployment or real-record writes.

## Add-pet calendar and unavailable-date blackouts — 2026-11-15

Review/merge record: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/44. Implementation `0593980` is GitHub Verified. Check that PR for final CI and merge status; no hosted deployment.

Owner requested Add pet as a calendar and dark blackouts for unavailable room/time choices. Branch `feat/calendar-date-picker` starts from merged #43 (`2895ff8`, Verified). Add pet now shows weekly room/date availability: enter pet and precise arrival/pickup first; each date tests the entire stay shifted to that start date, preserving local times and calendar-day length (including DST). Each room/date option is checked for the full interval using existing species, capacity, duplicate-pet, overdue and unresolved-boundary safeguards. Unavailable cells are dark charcoal, labelled with reasons, and disabled; incomplete inputs stay neutral. Selecting an available cell fills house/room and dates, shows selection summary and rechecks before Add. Manual selection/capacity override are tucked into details. This is candidate-start-date availability, not an hourly occupancy map; caption explicitly explains that each cell checks the whole stay.

Modal accepts an optional class name for the wider scheduling dialog. Mobile uses an internally scrolling table with sticky room labels and precise datetime fields. Actual localhost Chrome opened the calendar-based dialog; automated desktop/mobile Chinese test confirms black disabled cells, selecting a valid room/date, adding a stay and week navigation. Build, four focused browser cases and all 14 browser cases pass on Node 24. Prototype-only, no production records/writes or deployment. Existing saved demo records and room WIP #41 preserved.

## Compact filters and familiar controls — 2026-11-15

Owner requested more compact filters, recognizable icons and the original tab appearance. Branch `polish/calendar-controls` starts from merged #42 (`6448ff9`, GitHub Verified). Desktop filters are one labelled row (83px panel at 1440px); tablet uses three columns and phones two columns with tighter spacing. Restored original rounded segmented-style date tabs while keeping ARIA/keyboard behavior. Replaced composite add icons with plus, placement removal with trash, normalized gear shape, added visible Add house label and grouped header actions in one row. Tooltips/accessibility names and all filter/placement behavior remain. Actual native localhost Chrome visually reviewed; desktop and Chinese mobile screenshots refreshed.

Production build passed; all 13 browser tests passed on Node 24, followed by three calendar/setup cases plus type check after final header grouping. Review/merge record: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/43 (implementation `65f29db`, GitHub Verified). Final hosted deployment remains deferred. Previous prototype PR #42 is merged and verified. Saved demo data and room WIP #41 are preserved.

## Calendar prototype review record — 2026-11-15

PR #42: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/42 is the authoritative review/merge record for the locally reviewed calendar prototype, placement controls, customer filter, date tabs and icon refinements. Implementation `c162c02fd80c6d4e2348d5e6127f264b9959f275` is GitHub Verified; carried planning commit `9c76bdb` is also Verified. Production build, API type check, 17 unit tests and all 13 browser tests passed. Hosted delivery remains deferred; this is dev-only preview UI, with production Houses navigation retained. Room WIP #41 remains untouched. Consult PR checks/state before continuing; routine merge is authorized after CI passes.

## Placement controls, customer filter and calendar tabs — 2026-11-15

Added in-memory prototype house/room creation and empty-only removal, timed pet placement/removal, optional per-placement usage override and explicit illustrative dog/cat/rabbit room usage rules. Existing sample stays use one labelled illustrative capacity unit; actual business values remain unset. Placement checks all overlapping intervals for peak concurrent weighted capacity, same-species occupancy, duplicate pet stays across houses and overdue unknown release; unconfigured rooms are disabled with reasons. Back-to-back stays are blocked pending turnover policy. Placement removal preserves the sample roster; in-care pets cannot be removed. Rooms with placements and houses with rooms cannot be removed; capacity edits cannot go below current peak assigned usage. No real booking/balance/handoff writes or room WIP imported. Local page state resets when leaving/reloading.

Latest owner refinement adds Customer filter (explicit sample families), combined/reset behavior, Day/Weeks/Month/Year ARIA tabs with arrow/Home/End keyboard navigation, and tooltip-labelled SVG icons for secondary add/settings/reset actions. Customer detail appears in stay dialog and pet-name tooltip. Actual native localhost Chrome shows new filter, tabs and icons; previously observed timed placement dialog too.

Production build and all 17 unit tests pass. Three focused browser cases pass: full create/configure/place/remove lifecycle with guards/disabled choices/Chinese mobile, customer+status filtering/reset and keyboard tabs, and existing saved-house dialog flow including retry and discard protection. Existing house browser test adapted to calendar entry/setup nesting. All 13 browser cases pass on the project-supported Node 24 runtime (Node 22 full-suite collection hit a module-loader error; rerun on Node 24 succeeded). No deployment; local frontend 4180/API8081/Auth9099/Firestore8085 remain separate from production. New files: calendar-assignment.tsx, calendar-placement.ts, calendar settings and calendar UI; tests/calendar-placement.test.mjs and tests/browser/calendar.spec.ts. Review/merge tracked in PR #42 (see entry above).

## Direct settings forms and calendar filters — 2026-11-15

Owner requested direct house/room settings in icon-opened modal, removing the secondary Manage saved houses hop, plus dedicated filters. Added `calendar-settings.tsx`: house name/address/timezone and room name/optional maximum weighted capacity are editable directly, with Apply to preview and discard protection. Values are explicit in-memory prototype settings only, reflected in calendar names/filter options; no real records mapped/written and no capacity enforcement/group defaults invented. Browser timezone still drives sample timeline and form says house timezone conversion is not connected. Existing saved-house management remains separate top-level management action.

Dedicated Filters section has house, house-scoped room, species, actual status/overdue and pet name; Clear filters resets all. Changing house resets room selection. Timeline scale moved beside date navigation. Build/type check and automated Chrome checks cover direct forms/apply/retained preview values, discard protection, combined filters/reset and Chinese mobile layout. Native actual localhost Chrome observed direct House settings form; subsequent click timed out, so do not overstate native walkthrough. Screenshots updated. No deployment.

## Contextual calendar settings icons — 2026-11-15

Added gear icons beside every sample house and room, with bilingual tooltips and accessible names identifying house/room. Room settings is a separate button from collapse. Icons open focused context dialogs; sample locations explicitly remain unlinked to saved records, room capacity/group controls remain WIP. Administrators can continue to Manage saved houses; no invented sample-to-real mapping or business writes. Added shared settings SVG icon. Build and automated desktop/mobile bilingual checks pass for both dialogs and room-collapse independence. Actual native localhost Chrome confirmed row icons and opened Room settings for Sample house A / Room 1. Screenshot `docs/screenshots/calendar-room-settings-mobile-zh.png`. No deployment.

## Calendar contains house setup — 2026-11-15

Owner approved replacing separate Houses navigation with House calendar, with Manage houses & rooms opening a focused setup dialog. Implemented in local dev UI: administrator Workspace now has Customers / House calendar prototype / My profile; calendar management dialog reuses existing house list/Add/Edit and server authorization. Room setup explicitly remains in progress; no PR #41 WIP imported. Saved house configuration remains distinct from fictional calendar rows. Direct prototype access offers Sign in to manage houses when no administrator claim is present. Existing production Houses navigation is retained until the dev-only calendar is ready for production, preserving access during deferred delivery.

Build passed. Automated local Chrome checks cover authenticated navigation, setup dialog, nested editor and cancel/discard protection, plus Chinese mobile layout. Actual native localhost Chrome clicked Workspace → House calendar → Manage houses & rooms and visibly confirmed preserved [TEST] Demo house, Add house and Edit house. No business writes. New screenshot `docs/screenshots/calendar-setup-mobile-zh.png`. No deployment.

## Calendar visual cleanup — 2026-11-15

Owner requested cleaner whole UI in the active house calendar prototype. Simplified header and prototype notice, tightened spacing/rows/controls, softened grid/status surfaces, removed repeated pet names inside bars and duplicate bottom Now badge. Bars show stay dates (overdue bars retain explicit warning); status remains beside pet names and detail dialog remains available. Preserved foreground continuous Now overlay/badge below dates. Build and automated Chrome desktop/mobile English/Chinese control/detail/filter checks pass; no runtime errors/page overflow. Actual native localhost Chrome accessibility preview confirms updated calendar. Screenshots updated. No deployment or merge yet.

## Now badge visibility — 2026-11-15

Moved top Now badge into the same foreground overlay as its line, with an opaque background and white outline. It stays below date numbers and above all timeline rows, avoiding separate header stacking that hid the earlier badge. Type check and local Chrome render check pass; desktop screenshot updated.

## Now label below dates — 2026-11-15

Owner requested preserving visible date labels. Added a separate strip below date numbers for the Now badge; continuous overlay begins below the dates so it cannot cross date text. Local-only prototype refinement.

## Now marker layering refinement — 2026-11-15

Owner requested Now line on top, then clarified remaining lines/headers were still above it. Calendar now uses one pointer-transparent overlay spanning the full grid (including house/room header rows), stacked above those rows and stay bars, with a Now label at the top axis. Type check passes. Local prototype only; no deployment.

## Local backend restarted — 2026-11-15

Owner requested starting backend. API now runs on 127.0.0.1:8081 with isolated demo configuration; `/health` returns `{"ok":true}`. Existing Firestore emulator on 8085 was left running with all records untouched. Started missing Auth emulator on 9099 and restored only the two documented demo identities (local-demo-admin/local-demo-customer) with their existing test roles; did not run the data/photo seeder. Current shell Node is 22.17.0, so API is running with `--experimental-strip-types` (normal project script assumes Node 24). No package/tooling changes. Local frontend remains localhost:4180. Owner may need to sign in again because restarted Auth emulator has new sessions. No production changes.

## House calendar UI entry — 2026-11-15

Added owner-requested dev-only **House calendar · Prototype / 房屋日历 · 原型** link in administrator Workspace, alongside Houses, plus bilingual **Back to workspace** link inside the calendar. Existing hash-departure unsaved-change confirmation applies. Production navigation stays unchanged while prototype is local-only. Build passes. Native Chrome now works through app accessibility (browser-tab host still unavailable); observed actual localhost calendar and used its Back to workspace link successfully. Existing local-admin session is currently denied with connection error because local Auth/API services are unavailable; could not yet click the administrator entry in an authenticated actual session. Do not reset/reseed saved emulator data to solve this. Required full walkthrough/PR merge remains pending. No deployment.

## House calendar UX prototype — 2026-11-15

Owner requested a house calendar prototype: House → Room → Pet rows with a horizontal date timeline, day/weeks/month/year scale, Now marker and actual check-in status. Implemented a dev-only `http://localhost:4180/#/house-calendar` route on `feat/calendar-balances`, with explicitly fictional inline sample stays, house/pet filters, collapsible rooms, date navigation, focused stay-detail dialog and English/Chinese responsive UI. Initials are used instead of inventing pet photos; no saved pet records or business configuration are created. No room WIP imported, business APIs called, attendance actions or balance/payment rules implemented. Browser-local timezone is explicitly labelled as sample timezone. Year view is an illustrative overview, not a booking engine.

Production build passes. Automated headless Chrome checks cover desktop/mobile, both languages, scale switching, period navigation/Today, pet search, house filtering, room collapse and stay detail dialog. Screenshots: `docs/screenshots/house-calendar-desktop.png` and `docs/screenshots/house-calendar-mobile-zh.png`. Native actual owner Chrome walkthrough remains blocked: CUA reports browser access host unavailable; Chrome DevTools also did not return promptly. Do not claim the required actual walkthrough is complete. Prototype remains unmerged and undeployed pending that walkthrough; no commit/PR created yet. Local Vite preview runs at localhost:4180; prototype needs no API or sign-in. Preserve unrelated `dist-dev/` and WIP PR #41.


## Clean calendar/balance branch created — 2026-11-15

Current branch: `feat/calendar-balances`, created from `origin/main` after requirements were consolidated. Only updated requirements, architecture, roadmap, owner guide and handoff are carried forward; no unfinished room API/UI/contracts/helpers are included. No calendar/balance implementation has started in this checkpoint.

Room WIP is safely committed/pushed on `feat/house-rooms-spaces` as `f42160ea9b6497d3646a093f3d6f9262fff7a04d` (GitHub Verified). PR #41 remains draft and is titled “WIP: room capacity and Houses layout”; do not merge or resume it until requested. WIP code is intentionally not claimed validated against latest requirements. The old local preview follows whichever branch is checked out, so it no longer displays the unmerged room revision. Saved demo data/photos and untracked `dist-dev/` are preserved; no reset or deployment performed.

Next: scope the first calendar/balance milestone using `docs/requirements.md`, distinguishing safe record/UI foundations from unresolved payment, day-counting, package activation and refund behavior. Keep the workstream split into focused feature PRs, with one final deployment after completion. SWC remains cancelled.

## Owner changes focus to calendar/balances; record requirements first — 2026-11-15

Owner explicitly says to treat current changes as WIP and start a new branch for calendar and balance management, then requires recording all requirements first. This supersedes the earlier instruction to finish PR #41 before starting another feature. Consolidated `docs/requirements.md` into confirmed requirements, proposed UX, current delivery instructions and unresolved decisions; updated architecture, delivery plan and owner guide. Latest room model includes maximum capacity, type/category/weight group consumption, per-pet admin override, one species at a time and non-overlapping species switches; no individual spaces. SWC is cancelled.

Preserve committed PR #41 and the intermediate uncommitted room revision on `feat/house-rooms-spaces`; mark it WIP/unmerged. It does not implement the latest group/override model, and its old tests are not current. New work must branch from main and carry only these planning documents, not room code. Preserve untracked `dist-dev/`, pending PR #24, local demo records/photos and any owner edits. No deployment or business-data reset is needed for this branch change. Exact WIP and new-branch commit references will be recorded after the checkpoint is created.

## Latest steering: room capacity; SWC cancelled — 2026-11-15

Owner explicitly dropped the SWC changes. No SWC packages, Vite plugins, build-script changes, or compiler PR were implemented; retain the existing Vite and tsc type-check workflow. Do not resume or schedule a SWC migration.

Active feature remains PR #41, now being revised from individual spaces to Houses/rooms in a left/right workspace. Latest confirmed rules: each room has maximum capacity; capacity consumed is configured by pet category/type/weight group, with an admin-set per-pet override. A room hosts only one species at a time and may switch species between non-overlapping stays. No individual spaces. These supersede earlier room/space and simple pet-count proposals below.

Current uncommitted code is an intermediate room-capacity revision (room maximum plus per-type costs), not the complete latest group/override model. Old tests/docs still require updating; do not claim the current revision is validated or complete. Preserve all saved local records and the 300 cloud-sourced pet photos. Continue locally, one feature PR at a time, with deployment deferred. Latest local preview was restored at localhost:4180, API8081, Auth9099, existing Firestore8085; seeder verified 300 photo-complete pets without remote writes.

## Room/space map ready for local walkthrough — 2026-11-15

PR #40 house management merged as GitHub-Verified `eed81685cca987db3482fe79c265d251af26ad30`, implementation `99864de` Verified, CI `43697139814` passed; no deployment. Current branch `feat/house-rooms-spaces` adds room/space configuration and a core House map entry, parent-scoped admin APIs, audited transaction/retry/version checks, explicit capacity/species/sharing/optional kg-lb limit and closure controls. No business configuration values seeded. Map is setup only; timed occupancy and booking compatibility enforcement remain later roadmap items.

Build/API check and 14 unit tests pass. Seven integration cases pass with a fresh per-run `integration-*` emulator database. Earlier failures were accumulated prior-run test fixtures matching searches, resolved by per-run DB names; default photo-filled owner demo stays separate. All twelve browser cases have passed: nine unchanged cases in full run plus corrected three targeted cases (layout, houses, workspace). Workspace dialog race was fixed by awaiting hash-departure dialogs explicitly rather than attaching two handlers before the first async dialog. Screenshot `docs/screenshots/house-map-mobile-zh.png` visually reviewed. Real native local walkthrough for this room/space feature is NOT done: CUA returns `cgWindowNotFound` for Chrome and browser access host unavailable, despite Chrome process running. Asked owner to open a Chrome window via pending async question. Do not claim actual walkthrough or merge until completed; prior house and photo features had actual walkthroughs.

Local frontend/API continue localhost:4180 / 127.0.0.1:8081 with isolated Auth9099/Firestore8085 and 300 photo-complete pets. `[TEST] Demo house` was created in the previous actual house walkthrough; preserve subsequent owner local edits. No remote writes/deployment in this feature. Draft PR #41 is open: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/41. Implementation `11314618355ea9eeaf7f65b613f6439f78300e3c` is GitHub Verified; CI `43738854061` passed. Keep it draft/unmerged while awaiting actual local review access. All code checks are complete; do not start another feature before finishing this PR. Unrelated `dist-dev/` and pending environment PR #24 remain untouched. User's original instruction to finish sequential PRs remains active; the current local review access issue and unanswered payment/business decisions must not be treated as feature completion.

## House management local feature — in progress 2026-11-15

Branch `feat/manage-houses` rebased on merged photo-fixture PR #39 (`c560d3b23d733098d3f0c1697e13c9d9cf8ea179`, implementation `68a5b41`, both GitHub Verified, CI `43696211139` passed). No deployment after owner's local-first instruction. Photo-fixture changes are merged and local preview remains 300 photo-complete pets/100 families; cloud source inventory unchanged.

House feature adds admin-only list/save API, stable records with transactional retries/version conflicts/actor history, bilingual add/edit dialogs and house filtering, optional address and validated named timezone. No archive/delete, rooms, capacity, pricing or booking policy assumed. Added API/transaction/browser coverage. Build, API check, 13 unit tests and six database/image integration tests pass. Ten of eleven final full browser cases passed; workspace case had a dialog handler race; its targeted rerun passed (5.6s). All eleven cases have passed on final code, with the one targeted rerun noted. House browser case passed including lost save response/retry, multiple-house filtering, draft retention and 320/400/1280px English/Chinese. Screenshot `docs/screenshots/houses-desktop-zh.png` is synthetic mocked data.

Actual native Chrome localhost:4180 walkthrough opened Houses and Add house, saved `[TEST] Demo house` with empty address and America/Los_Angeles in the isolated demo database and visibly confirmed it. Local-only fake location, not business facts. No production writes. App now runs from original workspace on local API 8081 and frontend 4180; previous photo worktree servers replaced. Emulators remain 9099/8085. Test-mode proxy now always targets the local API; integration tests use separate `integration-tests` emulator DB. Default demo database was reset/reseeded after earlier tests; preserve any subsequent owner local edits. House PR/CI/merge pending; no deployment permitted yet. Unrelated `dist-dev/` and PR #24 preserved. Stash `houses-before-local-photo-fixtures` retained as backup after conflict resolution; do not blindly reapply it.

## Photo-complete local fixtures — in progress 2026-11-15

Active worktree `/tmp/family-paws-local-fixtures`, branch `chore/local-pet-photo-fixtures`, follows PR #38 and takes priority over preserved house work. Added isolated local demo mode on localhost:4180 with API 127.0.0.1:8081, Auth 9099 and Firestore 8085. Seeder downloads/verifies 300 image objects from the private dev GCS manifest into a disposable local cache and creates 100 fake families/300 pets with a photo each, attribution and species labels. No remote writes or deployment. Fake Google emulator accounts local-admin@example.test and local-customer@example.test allow review. Local photo adapter is gated on exact demo emulator configuration; uploaded test images stay local. Production photo path is unchanged.

Actual native Chrome walkthrough signed into the Auth emulator, searched Family 001 and visibly confirmed dog/rabbit/cat photos with creator/source/license links. Eleven unit tests, five Firestore/image integration tests, and all ten browser tests passed. Integration data was cleared from the disposable demo Firestore after tests and the photo-only fixture set reseeded so owner preview is clean. Preserve local servers while owner reviews; do not redeploy. Customer/owner real-photo fallback decision still pending. PR, signed commit and CI merge pending. Updated delivery preferences and photo PR #38 verification are included below.

## Latest photo-completeness instruction — 2026-11-15

Owner says all pets must have photos. Ensure synthetic/local test fixtures use the cloud library and preserve existing saved images. Photo PR #38 delivered inventory and removed hardcoded fallback but did NOT assign library images to test pet records; this is outstanding. Asked whether real pets without photos should receive clearly labelled species samples or wait for actual photos; no answer yet. Do not infer species from names or overwrite user-uploaded images. Keep work local under the newest single-final-deployment instruction. Main workspace currently has uncommitted house API/contract work plus updated delivery/requirements docs; keep it intact.

## Delivery preference changed: local first, one final deployment — 2026-11-15

Owner explicitly requested local development and deployment only once all features are done. This overrides earlier deploy-after-each-feature guidance. Continue sequential feature PRs, local Chrome walkthroughs and validation/authorized merges; do not deploy intermediate PRs. Final integrated release gets Cloud Run/Firebase deployment and live checks. Use isolated local test data for upcoming business writes; the existing localhost relay forwards to production and must not be used for fixture writes. Updated AGENTS, owner guide and roadmap accordingly.

Photo work was already delivered before this instruction: PR #38 merged as GitHub-Verified `931752a7c669f1388eb5bbefa3e223c7e864eff6`, implementation `53e66d6` Verified, CI `43695169333` passed. Built merged main and deployed Firebase Hosting. All five hosted files match dist, anonymous customers API is 401, anonymous test-library object is 403, and live native Chrome verified Alex's two pet cards have neutral placeholders. 300 image objects and manifest are verified in the private development bucket; no pet/customer records changed. Ten unit tests and all ten browser tests passed. Photo worktree is detached at merged main; source assets remain `/tmp/family-paws-photo-assets`. Original workspace resumed `feat/manage-houses`, rebased on this release, with unfinished house API/contract changes; no house feature has been deployed. Old in-progress/pause notes below are historical.

## Test photo library and cloud-only pet images — in progress 2026-11-15

Owner steered sequential PR work to collecting hundreds of test photos, allowed datasets, confirmed supported species cat/dog/rabbit, and required no hardcoded pet photos. Existing unfinished house API work remains uncommitted on `feat/manage-houses` in the original workspace; preserve it. Photo change is isolated in `/tmp/family-paws-test-photo-library`, branch `chore/test-pet-photo-library`, based on merged docs PR #37 (`271212c`, GitHub Verified, CI passed). Only photo feature is active.

Uploaded 300 licensed Wikimedia photographs (100 per species, roughly 15 MB) to existing private Oregon development bucket `gs://niu-niu-family-paws-dev-pet-photos/test-library/v1/`. Every object has remote size/MD5 verification; manifest records source/creator/license, SHA-256 and generations. Immutable cloud manifest: `test-library/v1/manifests/6c52bb0d5b52722e2f9962bea9c49e8dfe82a542aa3606811bb8a2a1a3fe1086.json`. Repository inventory `docs/test-assets/pet-photos.json`; scripts/usage in `docs/test-photo-library.md`. No customer/pet records assigned or changed, no IAM/Auth changes, no public URLs. Attribution must follow images into future fixture UI. Source bytes/prepared/contact sheets live outside git in `/tmp/family-paws-photo-assets`.

Removed bundled Pexels sample and credit styling; pet cards use the existing authenticated GCS-backed API, with neutral bilingual placeholder when no photo is saved. Production build, API check, 9 existing unit tests and all 10 browser tests passed; new manifest integrity check is next. Actual signed-in localhost Chrome preview confirmed Alex's two photo-less test pets show placeholders. No business writes. Local preview on localhost:4177 plus API relay on 127.0.0.1:8080 uses production data; do not seed test-library assets there. PR/merge/deploy/live verification pending; do not call frontend delivered until completed.

## Sequential implementation authorized — 2026-11-15

Owner now says “Finish all PRs. 1 PR at a time.” This supersedes planning-only instructions. Finish validation/merge/deploy/live checks before next feature. Added read-only customer preview and separately scoped customer impersonation to roadmap. Do not invent unresolved package/payment/capacity rules. Documentation baseline is the first PR; preserve unrelated `dist-dev/` and pending PR #24.

## UX and PR plan refined — 2026-11-15

Owner emphasized simple, clean, intuitive UX and a core house map, then requested a revised PR plan. Updated requirements and `docs/booking-delivery-plan.md`: map is a main admin destination, planned occupancy/map release follows booking, actual handoffs are a separate feature PR, and task-based usability criteria apply throughout. Documentation edits only; no implementation or Git commits. Cancellation delivery must be available before exposing refund promises without an operational resolution path.

## Requirements and commit planning recorded — 2026-11-15

Owner requested planning first, no code, then asked to record requirements and plan commits. Updated `docs/requirements.md` with confirmed multi-house booking/package rules, weight approval, operational UX, proposals and explicit unresolved decisions. Added `docs/booking-delivery-plan.md` with incremental feature PRs and planned commit titles. No application code, business data, infrastructure, payments, deployment, or commits changed as part of recording this plan. Implementation remains paused pending owner instruction; do not treat the plan as resolved business facts. Preserve pending environment PR #24 and untracked `dist-dev/`. Latest confirmed addition: admin approves weight or verifies during drop-off; employee weight-verification authority is unresolved. Packages: 30 days, type/weight-band pricing, three months from first care use, configurable eligible months; holiday rate mechanism and refund details remain unresolved.

## Dialogs and icons delivered; localhost sign-in working — 2026-11-14

Owner now explicitly requires actual browser previews at localhost using running dev servers, rather than screenshot-only review. Recorded in AGENTS.md. The preview initially opened at `127.0.0.1:4177`, where real Google sign-in failed; switching to `http://localhost:4177/#/login` succeeded and displayed the real administrator directory/pets. Do not widen Auth domains or weaken protections to work around this. Vite/package dev defaults now use localhost except test mode, which retains 127.0.0.1 for isolated browser checks.

Running local preview: Vite session at localhost:4177 plus temporary `/tmp/family-paws-preview-proxy.mjs` API relay bound to 127.0.0.1:8080. This relay forwards API requests to production Hosting over TLS, including normal browser authorization; it logs no tokens/customer data. This is a local frontend with **live API/data**, not the separate development database. No agent business writes were made. Keep these servers available while the owner reviews; stop only after review/when requested. Do not store credentials. Pending environment PR #24 remains separate.

PR #35 merged as GitHub-Verified `9df89d8718b1015ad42e942267ae1b4c4945682e` (implementation `d4935e1` also Verified); CI `43689911403` passed. This release adds native modal customer/pet add/edit and Google-link panels, icon edit/link/close/sign-out controls with tooltips/accessibility names, focus trapping/return, close/Escape draft protection and busy-close prevention. Primary Save/Add actions stay text. Actual signed-in localhost CUA walkthrough opened customer edit, account linking and pet edit. No save or linking-code generation performed; Doudou had an individually saved photo from owner interaction, loaded through the existing private photo API. Local English pet editor was left open with no edits at the end of walkthrough. Production build and all 10 browser tests passed, including focus wrapping/return, Close/Escape draft protection, upload retries, linking and role revocation. Synthetic screenshots are in `docs/screenshots/*dialog*`. Rebuilt merged main and deployed Firebase Hosting. Live HTML matches dist; anonymous customer API remains 401. Native live administrator review confirmed icon buttons and Edit customer modal with first-field focus and clean close returning focus to its icon. No business records or linking codes written. Returned Chrome to the actual localhost:4177 preview, English/no drafts; dev server and local API relay remain running at owner request. Keep localhost as the browser origin for real Google sign-in. No API/IAM/database changes.

## Pexels pet-card sample — delivered 2026-11-14

Owner requested a real photograph from Pexels or Pinterest. Used Pexels photo 16440218 by Helena Jankovičová Kováčová after checking its license; credits/source are in `docs/photo-credits.md`. PR #33 merged as GitHub-Verified `91640fc8c47406fed7b3c02e2053a70b30031cbd` (implementation `6742156` also Verified), CI `43688445146` passed. The 63 KB local image is served through Hosting for pets without private uploads, with a bilingual Sample photo · Pexels credit. Existing uploaded photos take priority; private-photo errors still expose the original error/retry, not a misleading stock image. No business records/photos were uploaded or modified.

Rebuilt merged main and deployed Firebase Hosting. Live HTML and photo bytes match local dist/source; anonymous customer API remains 401. Signed-in native Chrome live tab showed Doudou with the stock photo and Pexels credit. A separate original tab had an open pet editor; preserved it and used a new tab for live verification. Local screenshot review and production build passed; nine full-run browser checks and both final photo/panel checks passed (mobile assertion now checks the visible stock image rather than the heading below the taller photo). Asset dimensions bounded to the card. No API/IAM/database changes.

Latest steering: remove visible Selected labels while preserving active highlighting; give each pet its own image and asked about storage. Existing private pet-photo upload already uses Google Cloud Storage bucket `niu-niu-family-paws-pet-photos`, linked to each stable pet record. Asked whether to save different Pexels samples or use photos of actual pets; awaiting owner answer. Do not overwrite pet photos or imply stock imagery depicts an actual pet without resolving this choice. Selection labels were removed in PR #34, merged as GitHub-Verified `fb39ac9186bc57b2667e25f2fbd4aa85ff21f8bc` after CI run `43688804253` passed, then rebuilt/deployed to Firebase Hosting. Live HTML matched dist and the actual localhost administrator preview confirmed no visible Selected labels. Preserve all real records and the separate pending environment PR #24.

## Routine reload controls removed — delivered 2026-11-14

Owner requested a simpler UI without reload buttons. PR #31 merged as GitHub-Verified `d793a28648c87f4908dec068e195534afe2dabc6` (implementation `26e503c` also Verified); CI run `43686841093` passed. Removed routine customer/pet/profile reload and account Refresh session controls. Initial reads, post-save list updates and access checks on tab return remain automatic. Recoverable loading/conflict errors expose Try again only when appropriate; uncertain saves retain their existing save-retry path and draft protection. Denied access retains contextual Try again. Bilingual error guidance/owner guide and synthetic screenshots updated. No new polling or data writes.

Production build and browser coverage passed, including automatic role refresh with preserved drafts, editing/linking/photos, bilingual responsive layout and simulated pet-load failure → Try again → successful recovery with retry control gone. Full suite passed before the final error-only visibility refinement; nine final full-run tests plus corrected focused panel test passed after refinement (the first failure simulation was consumed by StrictMode's duplicate read, fixed by holding failure until the retry). Local screenshots inspected; native local-preview navigation was interrupted by user interaction, so do not claim an interactive local walkthrough. Rebuilt merged main and deployed Firebase Hosting. Live HTML matches dist; anonymous customers remain 401. Native Chrome live reload confirmed no routine account/customer reload controls; selecting 林小雨 displayed saved Doudou with Add/Edit only, no Reload pets. English/no drafts; no business records written. No API/IAM/database changes; pending PR #24 remains separate.

## Clean customer workspace — delivered 2026-11-14

PR #29 merged as GitHub-Verified `192d816f89563aa5de33237cc7061f2532292cc9` (implementation `a82c230` also Verified). CI run `43686180169` passed. Compact administrator account controls, workspace tabs, shorter customer rows/action labels, shown-result count, a clearer selected-customer heading and smaller empty photo placeholders reduce clutter. Pet-name search remains under Find a pet. On phones, selection focuses/scrolls to pets; ← Customers returns to the list and selecting the same customer reopens the pet view. Customer/pet editing, linking, pagination, hover/active selection, bilingual support and drafts are preserved. Admin-only styling lives in `apps/web/src/workspace.css`; public and ordinary customer views retain their layout. Owner guide and new synthetic `clean-workspace-*` screenshots updated.

Production build and all 10 browser tests passed under Node 24, with subsequent targeted administrator/panel checks for final mobile navigation, collapsed pet search, same-customer return, both languages and 320/400/1280px. Reviewed local rendered screenshots in Chrome; initial phone email wrapping was corrected. Rebuilt merged main and deployed Firebase Hosting. Live HTML and the new portal CSS match dist exactly; anonymous customer API returns 401. Native Chrome live administrator view confirmed compact controls/tabs, result count, selecting Nature displays saved Niuniu, and Find a pet opens its search. English live view left with Nature selected and pet search expanded; no drafts or business writes. No API/IAM/database changes. Pending environment PR #24 remains separate; do not clean production samples or change real records as part of this release.

## Customer selection simplified — delivered 2026-11-14

PR #27 merged as GitHub-Verified `eaa5161cefb73ce7149c8b833db6160f6c85313e`; implementation commit `fb64ca7` was also GitHub Verified. CI run `43684190632` passed. Removed customer-row Manage pets buttons: click a customer row/name to see that customer's pets on the right. Hover highlights a row without changing selection; active selection has a stronger green background/left border and bilingual Selected badge. Keyboard name-button activation and independent Edit/link actions remain; pet-search selection and unsaved-edit protection are preserved. Owner guide and synthetic screenshots updated.

Production build, all 10 existing browser tests and expanded focused panel checks passed under Node 24. Focused coverage checks contact-area row clicks, hover without selection, independent Edit, both languages/320/400/1280px, correct pet ownership and dismissed/accepted draft discard. Local rendered screenshot reviewed in Chrome. Rebuilt merged main and deployed Firebase Hosting; live HTML exactly matches dist, anonymous customer API is 401. Native Chrome stable-site reload confirmed no Manage pets buttons; selecting Nature showed its saved Niuniu and active styling/Selected badge. No business data written. Live browser left English, Nature selected, no drafts. No API/IAM/database changes; pending environment PR #24 remains separate.

## Customer/pet panels delivered with verified signatures — 2026-11-14

PR #25 merged as GitHub-Verified squash `182cca78b541f37b8eea82e227b812cd42fab416` after all four PR commits were re-signed with the existing authorized SSH identity and GitHub confirmed `verified: true, reason: valid` for every commit. CI run `43683626321` passed. The earlier merge blocker was unsigned commits; no protection was bypassed. Auto-merge remains disabled in the repository.

Rebuilt merged main under Node 24 and deployed Firebase Hosting. Stable live URL: https://niu-niu-family-paws.web.app/#/login. Live HTML matches dist exactly; anonymous customer API remains 401. Native Chrome live administrator review showed the two panels and existing customer/pet records (Nature selected, saved Niuniu visible, no photo yet). No business records were written by the agent. User interaction may change saved data; preserve all real records. Browser left English on the stable live site. Prior preview/blocked notes below are historical. No API/IAM/database changes.

Owner requires verified signatures on every commit. `AGENTS.md` records this; repository-local Git config now sets SSH signing, `commit.gpgsign=true` and the existing `id_ed25519_naturetime10.pub` signing identity, already registered with GitHub. Verify GitHub status before merging. Do not commit private signing material. New machines must configure an authorized signing identity. Pending environment PR #24 remains a separate feature and may also need its commits re-signed before merge; consult its branch handoff and do not resume its infrastructure/cleanup as part of this delivery.

## Customer/pet panels hosted for review — 2026-11-14

User requested the customer list on the left and selected customer's pets on the right. PR #25: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/25, branch `feat/customer-pet-panels`, based on main independently of pending environment PR #24. Clicking a name or Manage pets highlights the selected customer and displays that customer's existing canonical pets/private photos on the right; pet search can also choose a customer. Panels stack below 800px. Draft confirmation, editing, linking, search and pagination remain. No real pet names/photos were supplied; do not invent them or replace test records with purported real data.

Hosted preview: https://niu-niu-family-paws--customer-panels-3d8i310f.web.app/#/login (expires November 21). This preview uses the **production API/data**, not the development database. Real Google administrator sign-in passed and selecting Alex showed both existing test pets through the API; no business records saved. Native Chrome left on this English preview with Alex selected and no drafts. Public HTML exactly matches dist; anonymous customer API returns 401. Production stable Hosting has not yet changed.

Production build, API typecheck, 9 unit tests, all 10 browser tests passed under Node 24. New coverage checks customer selection/correct pets, dismissed/accepted draft discard, both languages and 320/400/1280px overflow. Final card sizing adjustment was checked with the focused panel test. Screenshots in `docs/screenshots/customer-panels-desktop.png` and `customer-panels-mobile-zh.png` use isolated mocked synthetic records only. System Node is 22 and initially caused a Playwright module-loader error; use `npx --yes --package=node@24 -c '…'` for checks. Local emulators/servers stopped.

GitHub CI passed on implementation and handoff commits (runs `43683204165` and `43683279001`, including store integration tests). Normal squash merge of PR #25 was rejected: “the base branch policy prohibits the merge.” Auto-merge also rejected because the repository does not allow auto-merge. Connected `naturetime10` has push/triage but no admin/maintain permission. PR #25 remains OPEN/BLOCKED; an authorized repository owner must resolve policy/merge it. Do not bypass protections. Once merged, rebuild from main, deploy Firebase Hosting and verify the stable live result before calling this delivered. PR #24 and its environment state remain separate; its latest detailed handoff lives on `feat/isolated-test-environment` until merged. Preserve untracked ignored-on-that-branch `dist-dev/`; do not commit it here.

**Latest delivery — verified account linking (2026-10-24):** PR #22 merged as `a34d842`, Cloud Run revision `family-paws-api-00004-5m5` deployed, then Firebase Hosting deployed from main and live checks passed. Owner approved administrator one-time code → customer Google submission → administrator verification/approval. This links unclaimed existing customers to identities without another saved profile. No automatic merge. Stable customer/pet/photo/history references are preserved; approval adds canonical ownership/mapping transactionally. Codes are 128-bit, hash-only at rest, valid 24h, one claimant and 10/minute submission limit. Rotation/rejection/cancellation, stale-review/version protection, current target Auth status/email checks and actual/effective actor audits are included. No new IAM/service/billing setup. See `docs/account-linking.md` and owner guide.

Build/API checks, nine unit tests, four Firestore/image integration tests and all nine final browser tests passed; GitHub CI passed. Actual local API + isolated demo Auth/Firestore CUA walkthrough issued/submitted/reviewed/approved as verified Google demo identities, showed no original records before approval, then showed original customer/pet on customer re-login. Chinese 400px had no overflow. Screenshots `linking-review-zh.png` and `linking-original-pet-mobile-zh.png` contain only synthetic demo data, no usable codes. Local servers/emulators stopped after walkthrough. Browser extension now uses ID `1` (same profile/extension previously ID `2`). A hot-update/debugger-detach blank tab recovered in a new preview; recovered page had no captured errors.

Cloud Build `2a4022e5-bf39-41d8-ae8d-14161cee27ba` succeeded from source `4946a72` (same API/contract files as squash merge `a34d842`). Immutable image: `us-west1-docker.pkg.dev/niu-niu-family-paws/family-paws/api@sha256:e06a79e86aa98da7f3d16d6eeeec0bc03690a1709134704cc572f9ec80fc146f`. Preserve new revision `family-paws-api-00004-5m5` for linking endpoints; runtime service account, 512 MiB/request-based CPU, concurrency 4, zero-to-two scaling and private photo access remain unchanged. Hosting pins the new revision. Live HTML matched dist (200/no-cache), and unauthenticated account-link/profile requests returned 401/private-no-store.

Live existing administrator session created a clearly marked synthetic customer, generated a code and cancelled it successfully, verified English/Chinese and 400px/no overflow. No customer request or ownership approval was made in production; full approval was verified in isolated tests/local actual API. The sample's exact customer, one customer audit, current cancelled link, two link audits and hashed code lookup (six documents) were removed atomically with update-time preconditions. Existing real customer records were preserved. No Auth account/role changes, no photos uploaded. `docs/screenshots/linking-live-mobile-zh.png` contains only the cancelled sample panel, no code/account details. Temporary cleanup manifest `/tmp/family-paws-link-live-cleanup.json` is historical; do not rerun cleanup blindly. Live administrator tab `782393907` restored to English, no drafts/sample, marked deliverable. Stop after this feature. Remaining features include duplicate-profile reconciliation, employee workflows, scoped impersonation, balances/usage and reminders; resolve dependent business facts first.

**Latest delivery — confirm before discarding edits:** PR #20 merged as `31e47fe` and deployed from main to Firebase Hosting. In-app cancellation/replacement, profile reload, selecting another customer's pets, sign-out and portal hash departures now ask before discarding drafts. Dirty registrations are scoped to the affected form; global departures include hidden workspaces. Build, all eight expanded browser tests (including browser Back) and GitHub CI passed. Local CUA actual-API walkthrough with isolated demo Auth/Firestore verified Chinese profile-reload confirmation, Cancel preserving the exact input and OK restoring the empty saved profile. Screenshot `docs/screenshots/discard-preview-zh.jpg` contains only the native dialog. See `docs/discard-confirmation.md` and updated owner guide.

Live existing administrator session verified English cancellation confirmation and Cancel retaining the exact sample name. Changing the interface to Chinese retained the draft without a prompt; cancelling again showed Chinese confirmation. OK closed the editor and removed the unsaved notice. No production business record was written. Page restored to English with no drafts. Live HTML matches dist (200/no-cache); profile without a token remains 401/private-no-store. No backend/IAM/billing changes; preserve API revision `family-paws-api-00003-b8d`. Local demo servers/emulators stopped and temporary preview tab closed. CUA browser bindings reset during a pending dialog; browser ID 2 was then unavailable, so native Chrome controls completed the local/live walkthrough. Native binding `discardChrome` remains available, but re-read AX before acting. Stop after this delivered feature; service balances, linking and employee workflows still need decisions below.

**Latest delivery — page refresh warning:** PR #18 merged as `9791b4e` and Firebase Hosting deployed from merged main. Bilingual unsaved-change notices and native full-page departure warnings cover personal, customer and pet forms. Build, all eight browser tests and GitHub CI passed, including cancelled refresh/draft preservation, clean refresh after revert/cancel, and save retry warning cleanup. CUA walkthrough on isolated demo Auth/Firestore + actual local API verified English desktop, Chinese 400px/no overflow and successful profile save clearing the notice. Screenshot: `docs/screenshots/unsaved-preview-mobile-zh.png` (synthetic draft). See `docs/unsaved-page-warning.md` for scope/browser limitations: this is not autosave or an in-app discard confirmation.

Live existing administrator session verified the Chinese notice with an unsaved sample customer draft. Native Chrome toolbar refresh displayed its Chinese confirmation; cancelling retained the exact draft. Cancelling the editor then using native Cmd+R refreshed normally without a warning. Screenshot `docs/screenshots/unsaved-live-zh.png` crops to the synthetic unsaved form, excluding account information. No production business records were written. Live HTML matches dist, public response 200/no-cache, unauthenticated profile remains 401/private-no-store. CUA `tab.reload()` bypassed the prompt, so real interaction was verified with the native Chrome toolbar/keyboard. Local servers/emulators stopped, test tab closed, viewport reset, live administrator page restored to English with no drafts. No backend/IAM/billing change; preserve revision `family-paws-api-00003-b8d`. Stop after this delivery; future business features still require the unresolved facts below.

**Previous delivery:** UI/language refinement is live at https://niu-niu-family-paws.web.app. PR #16 merged as `5b8cbc1`, Firebase Hosting deployed, and live public/sign-in/administrator checks passed. Headers now have explicit English/简体中文 selection, controls/layout are consistent and copy reads naturally in both languages. Administrator personal workspace switching (#14), customer profiles and multiple pets/private optional photos (#12) remain live at `/#/login`. See `docs/ui-language-polish.md`, `docs/own-customer-workspace.md` and `docs/release-5.md`. Earlier preparation/blocker notes are historical.

**Workspace switch delivered:** PR #14 merged as `71eeacc` and deployed to Firebase Hosting. Administrators switch between Customer management and My profile & pets with shared canonical records, preserving drafts during switches/access refresh. Reload/sign-out/UID change resets the selection. Build, seven browser tests, GitHub CI, isolated actual-API walkthrough and real live administrator checks passed. No production records were saved and no backend/IAM/data changes were needed. See `docs/own-customer-workspace.md` and `docs/screenshots/workspace-live-zh.png`. Local real Google login showed a blank chooser; local walkthrough used isolated emulators, while live checks used the existing authorized session. Temporary local servers/test tabs stopped.

**Latest user request completed:** Make the UI clean and consistent, make language choice clearer and make both languages read naturally. Delivered as separate UI PR #16 after workspace PR #14, preserving existing business facts and Google Cloud workflows. Do not invent business content for future copy changes.

UI refinement delivery: PR #16 merged `5b8cbc129bde8e25694da008e7d1ef07d8b65169`; Hosting deployed from merged main. Shared `LanguageSelector` shows English/简体中文 and persists browser choice across routes/reloads. It does not change a saved profile preference. Revised natural copy, compact account summary, consistent controls/forms and responsive headers preserve prior workflows. Build, eight browser tests and GitHub CI passed; browser checks cover 320/400/1280px, both languages, draft preservation, profile-language independence and existing auth/profile/pet workflows. CUA preview reviewed public/sign-in phone and public desktop layouts; synthetic authenticated screenshots are from isolated tests with mocked business API responses.

Live public/sign-in Chinese choice survived reload, mobile had no overflow, FAQ/navigation worked, and the existing real administrator session verified the redesigned management/personal pages. An unsaved name survived UI language change while profile preference stayed unchanged; draft restored, no production writes. HTML matches build and retains no-cache/security headers; profile without token remains 401/private-no-store. Live public/sign-in console capture was empty. `docs/screenshots/ui-live-mobile-zh.png` excludes account details. No new backend/IAM/data/billing changes; keep pet-capable Cloud Run revision `family-paws-api-00003-b8d`. Temporary preview stopped, viewport reset, live public/admin pages left English. Fresh Google local sign-in had previously shown a blank chooser; do not report a new Google login as passed. Latest live verification used the existing authorized session.

Stop after handing back the UI/language release. Future features still include verified account linking, employee business workflows, authorized impersonation, package balances/usage and reminders. Resolve missing service/unit/timezone/consumption/expiry/sharing facts before dependent workflows. Business contact/rates/location/real photos and recovery/retention decisions remain unresolved. Continue one hosted feature per PR/release when asked.

## Pet feature preparation — 2026-10-22 (completed; historical notes)

Current branch `feat/pet-profiles` implements multiple pets and private photos as one feature; not yet delivered. Owner answered “add photo later”: names can be saved without a photo. See `docs/pet-profiles.md` for canonical data, permissions, upload limits and deployment checklist. Created the private Oregon bucket `niu-niu-family-paws-pet-photos`, runtime bucket-scoped custom create/get role, and deployed the pet-name collection-group index. Existing production frontend/API are unchanged at this stage. Continue this feature through validation, PR merge, Hosting deployment, live checks and cleanup; do not start another feature.

Pet continuation: draft PR #12, API source `55595a8`, build `99b9c2ab-c039-42d1-a286-42f026f36032` and revision `family-paws-api-00003-b8d` are ready. Cloud Run now has 512 MiB/concurrency 4 for bounded image processing, still request-based and zero-to-two instances. Production Hosting remains pinned to the previous API until deployment. Real customer/admin local walkthrough, private image read, search, shared edits, duplicate image save, bilingual mobile/desktop and audits passed. Tests: 8 unit, 3 Firestore, 6 browser. Two clearly marked synthetic pets and one synthetic owner profile/mapping remain for live verification; exact paths/current snapshots in `/tmp/family-paws-pets-sample.json`, test image `/tmp/family-paws-test-photo.png`. Preserve authentication accounts and all real data. Finish CI/merge/Hosting/live verification, then remove only these samples and their histories/photo object with exact preconditions.

**Previous delivery (2026-10-22):** Google customer profile registration and administrator customer contact management remain live. Profile PR #10 merged as `12df8c3`. Users save their own name/language; administrators search the same canonical records by name/contact email/verified Google email. Billing is enabled, with the owner-approved Oregon (`us-west1`) backend/database. See `docs/release-4.md`.

## User intent and working preferences

The user's partner is the business owner and does not know how to code. Read `docs/business-owner-guide.md`; accept plain-language requests in English or Simplified Chinese and handle the technical delivery. On 2026-10-19 the user explicitly authorized a sequence of feature PRs, automatic merge after validation, and continuation without repeated merge permission. Preview changes locally and walk the owner through them in the browser. Deploy and verify every feature on Google Cloud before calling it delivered. Ask only for necessary missing facts or required authorization; preserve all prior guidance.

Build Niu Niu Family Paws Sitting LLC's English/Simplified Chinese public website and pet service usage tracker. Deliver **one complete feature at a time**, with a **hosted, usable web app after each delivery**. User explicitly chose **Google Cloud**, not OpenAI Sites. Preserve all working features as the app grows. Do not start several partially finished features.

PR titles must be concise and clear. PR descriptions must use short, clear bullet points and include relevant validation. Add screenshots when useful for UI review. All changes must go through PRs into `main`.

User prefers autonomous work without repetitive command approval prompts. At their explicit request, global `/Users/fiona/.codex/config.toml` was updated to `approval_policy = "never"` and `sandbox_mode = "danger-full-access"`. Existing settings were preserved; backup is `/Users/fiona/.codex/config.toml.before-full-access`. A new session may pick these up; runtime/managed policies still take precedence. Do not promise that no authentication or mandatory confirmation will ever be required.

## Workspace and source state

- Workspace: `/Users/fiona/Projects/niu-niu-family-paws`.
- GitHub: https://github.com/Fifiloveniuniu/niu-niu-family-paws.
- GitHub account: `Fifiloveniuniu`.
- Remote now uses SSH: `git@github.com:Fifiloveniuniu/niu-niu-family-paws.git`.
- Administrator sign-in delivered through merged PR #2 (commit `cac35ec`). Check the current branch with git before work.
- Release 1 merged via PR #1 using squash (the repository disallows merge commits). `main` is protected. The user has authorized opening and merging PRs after validation, one feature/bug fix/change per PR.
- Release 1 source, configuration, documentation, and review screenshots are included on the feature branch.
- Do not commit to or push directly to `main`. Keep changes going through pull requests.
- `dist/`, `node_modules/`, Firebase debug logs, environment files, and credentials are ignored.

## Hosted website and Google Cloud

- **Live URL:** https://niu-niu-family-paws.web.app.
- Google Cloud project ID: **`niu-niu-family-paws`**.
- Google Cloud project number: **`775511787236`**.
- Firebase console: https://console.firebase.google.com/project/niu-niu-family-paws/overview.
- Firebase CLI signed in as **`niuniupetsitting@gmail.com`**. Sign-in completed successfully; do not request the old one-time code again.
- Firebase Terms were accepted with explicit user authorization using Chrome. Firebase was added to the existing correct Google Cloud project. Optional Google Analytics was disabled.
- `npx firebase deploy --only hosting --project niu-niu-family-paws --non-interactive` succeeded and returned the live URL.
- Live Hosting includes Release 2: administrator sign-in and protected dashboard at https://niu-niu-family-paws.web.app/#/admin. Firebase Authentication is now initialized and the web app registered (`1:775511787236:web:99044ab39950f128250ef1`). Google provider is enabled (verified through the Firebase API and a real local Google sign-in). No app database, backend API, or reminder infrastructure is deployed.
- Billing was checked via Cloud Billing API: no billing account attached (`billingEnabled: false`). Cloud Run needs billing before the business API can be deployed. No billing changes were made.
- Verify billing/regions before future services; no billing upgrade was performed as part of this work.

Setup history: before the user supplied the original project's number, an unused Google Cloud project **`niu-niu-family-paws-web`** was created under this account. It is not the target and has no website deployed; do not delete it without authorization. An unused private OpenAI Sites project was also created with ID `appgprj_6ad6a33472188191b6473395ca7b4421`, slug `niu-niu-family-paws`; nothing was deployed there. Its local `.openai/hosting.json` was removed when the user selected Google Cloud. Do not resume the Sites workflow or assume its credentials are available.

## Release 1 implementation

React 19 + TypeScript + Vite + i18next/react-i18next. Plain CSS currently provides the visual styling; Tailwind/Radix from the proposed stack have not been installed. No router or backend yet.

- Responsive public landing page with service information, about/planning guidance, FAQs, and contact section.
- English/Simplified Chinese language switch; preference saved in localStorage when available; document language follows selection.
- In-page navigation and accessible native FAQ disclosures.
- Original inline SVG dog illustration. This is not a real business photo.
- Green/cream/brown styling with serif headings.
- `scripts/prerender.mjs` uses Vite SSR and React server rendering to put English public content into built HTML, then `entry.tsx` hydrates. Saved Chinese preference applies after hydration to avoid mismatched initial markup.
- Firebase security headers include CSP, HSTS (provided by Hosting), nosniff, referrer policy, and frame denial.
- No dead portal/sign-in links, fake booking forms, payment flows, invented prices, or invented business contact details.

**Content still incomplete:** public contact email/phone, service location/timezone, confirmed service offerings, prices, package terms, business photos, official Chinese business name, and domain/branding assets. Owner has not supplied these. Current website explicitly marks contact and pricing as pending and does not accept bookings. Do not portray it as a fully finished business launch or invent missing details. The Google authentication email is not automatically approved public contact information.

## Commands and verification

Node.js was installed with Homebrew (v26.12.0 at setup); npm available. Firebase CLI is a local dev dependency. `gcloud` was not installed.

```sh
npm ci
npm run dev
npm run build
npm run preview
npm run deploy
```

Build: `tsc --noEmit && vite build && node scripts/prerender.mjs`.

Checks completed:

- Production build and prerender passed.
- `git diff --check` passed.
- `npm audit --omit=dev`: zero known production vulnerabilities at the time checked. Initial full install reported development-tool dependency vulnerabilities; these were not all resolved. Node 26 also produced an engine warning for Firebase's `superstatic` dependency (expects Node 20/22/24). Consider a supported Node LTS for reproducible tooling later.
- Chrome local production preview: language switch, persistence after refresh, section navigation, and FAQ expansion passed.
- Visual desktop and 400px mobile Chinese layout checked through Chrome device toolbar.
- Live HTTPS page returned HTTP 200 and expected security headers.
- Live English/Chinese switching, FAQ navigation, and expansion passed.
- Local preview server was stopped after verification. No server should be assumed running.
- Review screenshots: `docs/screenshots/public-desktop-en.png` and `docs/screenshots/public-mobile-zh.png`.
- Rechecked the live release with headless Chrome: Chinese persists after reload, FAQ expands, 400px layout has no horizontal overflow, and no page errors occurred. Hosted HTML exactly matches the current build.

UI tools: browser-provider inventory was empty and `iab` unavailable. Native Chrome via `cua.getApp('com.google.Chrome')` worked. The user sometimes operates Chrome concurrently: re-read UI state after a user-change error and do not reuse stale indices.

## GitHub SSH and signing — complete

- Existing local key pair: `/Users/fiona/.ssh/id_ed25519_niu_niu_family_paws` and `.pub`. Never read, publish, or commit the private key.
- Public key registered on GitHub for authentication, title `Niu Niu Family Paws (Mac)`, key ID `167003930`.
- Same public key registered for SSH signing, title `Niu Niu Family Paws (Mac signing)`, key ID `1256920`.
- Fingerprint: `SHA256:q3MEQm/iJYPUOIKAgr3eXWhB3qlE6pBiXZtNQ7w3DuI`.
- GitHub CLI authorization was refreshed with `admin:public_key` and `admin:ssh_signing_key`; completed successfully. Do not reuse old device codes.
- GitHub host keys fetched from GitHub HTTPS API and added to local `~/.ssh/known_hosts`.
- Repository-local configuration:
  - `user.name = Fifiloveniuniu`
  - `user.email = 345028173+Fifiloveniuniu@users.noreply.github.com`
  - `gpg.format = ssh`
  - `user.signingkey = /Users/fiona/.ssh/id_ed25519_niu_niu_family_paws.pub`
  - `commit.gpgsign = true`
  - `tag.gpgsign = true`
  - `core.sshCommand = ssh -i /Users/fiona/.ssh/id_ed25519_niu_niu_family_paws -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes`
- Verified: `ssh -T` authenticated as Fifiloveniuniu; `git ls-remote origin HEAD` succeeded; test message signature successfully created and verified in a temporary directory. No test commit was created.
- Existing historical commit `3985100` was unsigned; enabling signing does not rewrite history.

## GitHub branch protection — complete

Repository is public and user has admin permissions. GitHub classic branch protection for **`main`** was created and read back successfully:

- Pull requests required.
- Enforced for administrators too (`enforce_admins = true`).
- Force pushes blocked.
- Branch deletion blocked.
- Required approving reviews: **0**, so the sole owner can merge their own PRs.
- Stale reviews dismissed on new changes.
- No required status checks configured yet; the Validate workflow added in PR #2 runs the build and unit test on PRs and main.
- No rulesets were present when checked.

User has already been told this protection is live. Verify if needed; do not recreate unnecessarily.

## Product scope and sequence still ahead

Additional owner requirement on 2026-10-19: administrators can view, search, and edit customer and pet information. Search planned by customer name, Google login email, and pet name; show each customer's multiple pets clearly. Preserve server-enforced administrator authorization, verified account ownership, and an edit audit trail. Recorded in requirements.md; not implemented or deployed.

Additional owner requirement on 2026-10-19: each customer can have multiple pets, each with a name and photo. Recorded in requirements.md; not yet implemented or deployed. Pet records and uploaded photos must enforce owner access. Photo-required behavior has not been specified.

Owner update on 2026-10-19: customers should sign in using their own Google account and fill in their name and pet information. Recorded in requirements.md. Treat this as requested customer self-registration; preserve verified UID ownership and administrator authorization for linking pre-existing records. This feature is not implemented or deployed. Asked whether us-west1 is approved and the owner will associate a billing account; response pending. Existing uncommitted customer-management work must be preserved.

Original scope/architecture remain in `docs/requirements.md` and `docs/architecture.md`. Proposed backend: Node/TypeScript/Fastify REST API on Cloud Run, Firebase Authentication, Firestore, generated OpenAPI client. Business data accessed through the API with role/ownership enforcement; browser Firestore access denied by default. Deployment CI eventually uses Workload Identity Federation rather than long-lived service account keys.

Next priorities:

1. Administrator sign-in is complete; see `docs/release-2.md`. PR #2 implements sign-in; production Google sign-in was verified from the local preview and correctly denied an account without an administrator claim. Owner confirmed niuniupetsitting@gmail.com as administrator; role granted through trusted tooling and the local production dashboard verified in Chrome. Build, unit test, both emulator browser tests, and GitHub CI pass. PR #2 merged and Firebase Hosting deployment succeeded. Hosted HTML exactly matches the production build. Real live Google login as niuniupetsitting@gmail.com opens the Chinese administrator dashboard; English/Chinese dashboard and sign-out also verified locally.
2. Complete missing public business content when the user supplies it. Do not invent rates or contact details.
3. Next hosted feature: customer management. Blocked on Google Cloud billing (still disabled) and database region approval. Asked whether us-west1 is acceptable; no answer yet. Do not enable billing or select the database region as though approved.
4. Then customer management, pet management, service/package balances with audited allocations/adjustments, employee access, visit tracking, customer portal, and renewal reminders, one at a time.

Visit tracking must handle atomic balance deductions, retries/idempotency, concurrent updates, corrections with audit history, and business timezone. Keep balances separate by service/unit. Customers can view only their own records. Account linking uses verified identity and administrator authorization, never a self-entered name.

Reminders need configurable thresholds, customer language, outbox/Cloud Tasks delivery, reconciliation, retries and deduplication, and replenishment cycles. These are not implemented.

Unresolved rules: drop-off/pickup meaning, consumption timing, partial days, overnight/cancellation rules, package expiry, shared pet balances, onboarding/linking, reminder defaults, backup/retention and cloud billing/regions. Resolve as needed before dependent features.

Explicitly excluded: purchasing/payment history, income reporting, care notes, and a separate attendance page.

## Customer management draft progress — 2026-10-19

Draft PR: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/5 (branch `feat/customer-management`). Do not merge until the cloud prerequisites and live deployment path are ready. Local validation is recorded below; check GitHub CI status before proceeding.

Continued the existing `feat/customer-management` work, preserving earlier changes. Administrator customer create/edit and name/contact-email prefix search are implemented locally, with a Fastify API, generated OpenAPI types, Firestore transactional version checks/idempotent retries and audited edits, and deny-by-default database rules. This is **not deployed** and production Hosting has no API rewrite yet. Pet management/photos/customer self-registration remain subsequent releases.

Passed frontend build, API TypeScript check, 4 unit tests, Firestore emulator integration (concurrent updates, retry safety, audit history, bilingual search and pagination), and 3 Chrome/Auth emulator browser tests. Customer browser UI test mocks the API; database integration is separately exercised with the isolated demo Firestore emulator. Reviewed the 400px Chinese screenshot at `docs/screenshots/customers-mobile-zh-draft.png`. Java 21 is already installed under `/opt/homebrew/opt/openjdk@21/bin`; prefix PATH for database emulator tests. More detail: `docs/customer-management-draft.md`.

Rechecked Cloud Billing API: billing remains disabled. Firestore API reports disabled/not yet used. Asked owner to link billing and approve us-west1; no answer at the time of this note. Do not merge/deploy a broken customer UI while its API is unavailable. Next: resolve cloud prerequisites, provision backend safely, preview, finish PR validation, merge, deploy, and verify live.

## Shared sign-in delivered — 2026-10-19

Owner requested a clear, prominent single sign-in entry for customers, administrators, and employees. Delivered through PR #6 (https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/6), merged as `59dc3e6` and deployed to Firebase Hosting. The release workspace is `/Users/fiona/Projects/niu-niu-family-paws-login`. Customer-management PR #5 remains a draft blocked by cloud prerequisites. Adds one prominent header sign-in (owner requested removal of duplicate hero/footer entries) and shared `/#/login` (legacy `/#/admin` remains compatible). Verified accounts display administrator, staff (`employee: true`), or ordinary customer landing states. Claims are trusted assignments, not a user-selected role. Customer/staff business features are explicitly pending.

Further owner requirements: administrators may impersonate any customer/employee and also manage their own pets as a customer. Avoid duplicate person/contact/pet information across roles or impersonation. Recorded in requirements.md with server authorization, actual/effective actor audit, and visible impersonation/exit requirements. These business features are not implemented in the sign-in release.


Shared sign-in live verification: https://niu-niu-family-paws.web.app/#/login. Hosted HTML exactly matches the released production build. Real Google login as the approved administrator was verified from the local production preview. Live Chrome checks passed for exactly one homepage login link in English and Chinese, language persistence, 400px mobile overflow, FAQ expansion, shared login and legacy administrator routes, and no page errors. Two unit tests, three emulator browser tests, and PR #6 GitHub CI passed. Customer/staff pages explicitly describe their business features as pending. Administrator impersonation and own-pet context are requirements only.

Before resuming customer-management PR #5, merge the latest main into its branch and resolve portal/test/documentation conflicts while preserving the single shared login entry. Do not deploy that branch's older administrator-only portal over the shared login release. The main workspace remains on `feat/customer-management`; the separate release worktree avoids disturbing its unfinished business-data work.


HTML freshness fix: native Chrome exposed a cached pre-release homepage after the shared-login deploy; Hosting's default HTML response was `max-age=3600`. Follow-up configuration sets `Cache-Control: no-cache` on `/` and `/index.html` so future page loads revalidate against the current release. Existing cached responses may still require a one-time hard refresh. Hashed assets keep their existing behavior. Verify the response headers after deploying this configuration; this change does not alter application code.

Cache follow-up PR #8 (https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/8) merged as `eeaf830` and deployed to Firebase Hosting. Live `/` and `/index.html` now return `Cache-Control: no-cache`, exactly match the released HTML, and retain the security headers. The code delivery is PR #6; documentation PR #7 is also merged. The original customer-management draft remains unmerged; merge current main before implementing/deploying it.


## Customer-management continuation — 2026-10-19

Merged current `origin/main` (`eeaf830`) into the customer-management branch, resolving portal, stylesheet, browser-test, and handoff conflicts. Preserved shared customer/staff/admin sign-in, the single homepage sign-in entry, and HTML revalidation headers. The administrator dashboard includes the customer draft; customer/staff pending states remain intact. No production deployment or main merge was performed.

Validation after integration: frontend build, API TypeScript check, five unit tests, Firestore emulator integration, and all four Chrome/Auth emulator browser tests passed. Browser customer operations mock the API; Firestore integration is tested separately. Running the two emulator suites concurrently caused a shared emulator hub conflict; sequential rerun passed. Node runtime was v26.12.0 (project declares Node 24); CI uses Node 24.

Rechecked Cloud Billing API: `billingEnabled: false`. User said “continue” after discussing Cloud Run's free allowance; this does not resolve billing setup or region approval. Asked owner to link billing to `niu-niu-family-paws` and confirm `us-west1` (Oregon). Both remain pending. Continue only customer management; keep PR #5 draft until backend deployment and live validation are possible.


## Billing setup resolved — 2026-10-19

Google Cloud console initially showed a permissions error because it was signed in as a different Google account. Switched the billing tab to the existing project owner `niuniupetsitting@gmail.com`; project access then worked. Owner completed billing setup in the browser. Cloud Billing API now confirms `billingEnabled: true` for `niu-niu-family-paws`. No payment details, payment profile, or credentials are recorded here. Do not continue to describe billing as disabled.

Enabled Firestore, Cloud Run, Cloud Build, Artifact Registry, and IAM APIs for the customer-management backend; the enablement operation completed successfully. No database, repository, Cloud Run service, customer data, or additional IAM grants were created in this step. Region approval is still pending; asked explicitly whether `us-west1` (Oregon) is approved. Do not treat the earlier “continue” replies about billing terms as a database-region selection.

Customer-management PR #5 remains draft and is not deployed. Latest documentation-only commit before this note was `ec72a17`; GitHub validation passed. Continue only this feature, following the existing deployment and live-verification requirements.

## Customer-management cloud preparation — 2026-10-19

Owner explicitly approved `us-west1` (Oregon) after billing setup. Created the default Firestore database in Oregon with deletion protection, deployed deny-by-default rules, and deployed Cloud Run `family-paws-api` using a dedicated runtime identity. The service is healthy at `https://family-paws-api-2la63akoma-uw.a.run.app`. No service-account keys were generated. Runtime permissions: `roles/datastore.user` and custom role `familyPawsAuthReader` containing only `firebaseauth.users.get`. Cloud Run permits network invocation; every customer operation still verifies a Firebase token, current account status, verified email, and current administrator claim in the application.

Cloud Run scales from zero to two instances with request-based CPU, 256 MiB memory, concurrency 40, and a 30-second timeout. Private Artifact Registry repository `family-paws` and source bucket `niu-niu-family-paws-build-source` are in Oregon. Dedicated builder permissions are scoped to repository writes, bucket reads, and build logging. Source uploads expire after one day. Build `517d4220-bf0b-49fa-902d-63d9ce58367b` succeeded; deployed image digest is `sha256:27abef25ab612a93c3baf22195b9f2c72a974531cc5ce23594a87cdf49da6014` (API source `2b8bbdc`). See `cloudbuild.api.yaml` and the customer-management release-preparation document.

Real API checks passed: health 200, unauthenticated customer API 401, anonymous Firestore 403. Native Chrome Google sign-in from a local production preview succeeded as the approved administrator. Adding, editing, prefix search, empty search results, and persistence after reload all worked against the real Cloud Run/Firestore backend. The Chinese page fits 400px with no horizontal overflow. Audit history contains both versions and the actual administrator UID. A synthetic customer named `Release check — sample customer 已更新` remains for live verification; remove only that sample and its history afterward. Its exact document paths are saved temporarily in `/tmp/family-paws-sample.json` (no credentials).

Created Cloud Logging exclusion `family-paws-api-request-privacy` to avoid storing automatic request URLs containing customer search details. Safe application/system logs remain enabled. No automated backups or exports were configured; retention and recovery policy remain owner decisions, with no automatic deletion of customer/audit data.

Next: commit Hosting rewrite and build configuration, finish PR #5, merge, deploy Hosting, verify the real live workflow, clean up the synthetic sample, and record final delivery. Preserve shared login, public-page behavior, both languages, and phone layouts. The frontend is still the earlier live release until this step is completed.

## Customer contact management delivered — 2026-10-20

PR #5 passed GitHub validation, was marked ready, and merged as `065b09d06c059e63a2f68c660ceeb8796637f703`. Built from the merged main commit and successfully deployed Firebase Hosting with its Cloud Run rewrite and revision pin. Live URL: https://niu-niu-family-paws.web.app/#/login. Administrators can add/edit customer names, optional contact email/phone, preferred language, and search by name/contact-email prefix. Contact email is not a verified login identity; no account linking or email sending occurs.

After deployment, verified real live create/edit/search and persistence, actual administrator audit history, Chinese persistence after reload, 400px overflow, one homepage sign-in entry, section navigation, and expanded FAQ. Live HTML exactly matches `dist/index.html`; homepage is HTTP 200 with `Cache-Control: no-cache` and security headers. Hosted API rejects missing and invalid tokens with 401 and `private, no-store`. Anonymous Firestore access returns 403. Browser error logs were empty. The two synthetic customers and their four synthetic history entries were removed with exact-target/version checks. The live directory is empty and ready for real records. No real customer records were used or deleted.

Screenshot `docs/screenshots/customers-live-mobile-zh.png` shows only the live customer directory, without account details. The browser viewport was restored to desktop and the live page left in English, matching its original preference. Live browser tab `782393907` was marked as the deliverable. The temporary production preview on `localhost:4177` and development server on `127.0.0.1:4174` were stopped after verification, and the temporary production-preview tab was closed.

See `docs/release-3.md`, the updated owner guide, and `docs/customer-management-draft.md` for feature scope and infrastructure. Customer self-registration, pet names/photos, verified-login/pet search, balances, employee operations, impersonation, and reminders remain undelivered. Do not start another feature until this delivery has been handed back to the owner. Public contact/rates/photos and business rules remain unresolved. No automated backups/exports are configured; no customer/audit records expire automatically.

## Customer profile registration in progress — 2026-10-22

Owner asked to continue after the customer-contact delivery. Next single feature: Google users save their own name/language. Branch `feat/customer-profile`; not yet deployed. See `docs/customer-profile.md` for scope, ownership model, validation, and remaining deployment steps. Self-registration creates one canonical customer document and a UID reference transactionally. Administrator/staff roles reuse that profile; no role is granted and no old record is claimed by a matching name/email. Administrator edits preserve ownership/verified-email metadata, and customer edits preserve administrator-managed contact fields. Adds trusted Google-email prefix search to the administrator directory. Pet data/photos, account linking, and impersonation remain later features.

Passed frontend build, API typecheck, seven unit tests, two Firestore emulator integration cases, and five browser tests, including retries, concurrency, stale edits, authorization/owner injection, shared record ownership, Chinese mobile layout, and preservation of unsaved profile edits during access refresh. Browser tests mock the profile API; database logic is tested independently. Next: build/deploy backend, real local production walkthrough, PR/CI merge, Hosting deploy/live checks, exact cleanup of synthetic profile/mapping/history, and final documentation.

Customer profile PR: https://github.com/Fifiloveniuniu/niu-niu-family-paws/pull/10. API source `1eea684`, build `b3255756-9a41-4ce4-9da7-b3756c2f1e23`, image digest `sha256:8c3700d8c9b80335016b1cb246c0d0867542997afbf092cd6312c70849ea697d`, deployed revision `family-paws-api-00002-6x6`. Hosting is still pinned to Release 3's API until the frontend deploy. New backend preserves old frontend payloads. Do not later roll back to the original API that overwrites whole customer documents, because it does not preserve profile ownership/login metadata.

Real local production preview `http://localhost:4177/#/login` verified ordinary Google account registration/edit/reload/sign-out. An existing Google identity signed in normally without administrator claims and was used only to exercise a clearly named synthetic profile. One canonical mapping/customer was created, with two audited self edits. An administrator then found it by Google-email prefix and updated the same record; version 3 preserves ownership and login email, and history identifies the administrator actor. Administrator's own profile was uncreated at this stage (GET 204), confirming separate personal context. Temporary exact-target cleanup details were saved in `/tmp/family-paws-profile-sample.json` and preflight flags in `/tmp/family-paws-profile-preflight.json`, neither contains credentials. Authentication accounts must be preserved; only synthetic profiles/mappings/history are disposable.

## Customer profile registration delivered — 2026-10-22

PR #10 passed CI and merged as `12df8c3e238ca8197a3c50f4db8290ca87db9f3e`. Built from merged main and deployed Firebase Hosting successfully; its rewrite is pinned to the new Cloud Run revision `family-paws-api-00002-6x6`. Profile feature is live at https://niu-niu-family-paws.web.app/#/login. No new billing, region, IAM, database rules, or service-account keys were needed for this release.

Verified ordinary Google registration/edit/reload/sign-out with the real API locally, then real live administrator personal-profile registration/editing and automatic canonical directory refresh without losing the administrator role. Live Google-email prefix search returned the other registered customer without mixing it with the administrator's own profile. Name/language persisted after reload; English/Chinese and desktop/400px layouts passed. Hosted HTML exactly matches the production build; homepage 200, no-cache, and security headers retained. Missing/invalid tokens on both `/api/profile` and `/api/customers` return 401 with private/no-store; anonymous identity-map access returns 403. Console capture had no application-origin errors (an unrelated browser-extension error was observed).

Exact cleanup removed two synthetic profiles, two UID mappings, and five synthetic audit entries atomically with update-time preconditions. Login accounts and real customer records were preserved. The live administrator directory and personal profile are empty and ready for use. Temporary preview on port 4177 was stopped, its tab closed, and the live browser restored to desktop/English and marked as deliverable. `docs/screenshots/profile-live-mobile-zh.png` crops to the real form, excluding account details. Synthetic full-page mobile screenshot remains available for broader UI review.

Current scope and rollback boundary: `docs/customer-profile.md` and `docs/release-4.md`. Administrator/staff identities reuse the same canonical personal profile, but explicit context switching/impersonation and employee business workflows are still future features. Old administrator-created contacts are not linked by matching names/emails; linking remains administrator-authorized future work. Pet names/photos are the next planned feature, not started in this delivery. Business contact/rates/photos/rules and recovery/backup policy decisions remain unresolved. No automated deletion/backup/export policies were added.

## Pet profiles and private photos delivered — 2026-10-22

PR #12 passed CI and merged as `eeccb9bc3ab9c74e507e612b18c5ac0a358176a3`; Firebase Hosting deployed from merged main. Live: https://niu-niu-family-paws.web.app/#/login. Customers manage multiple independent pets, with a name sufficient to save and optional private photo upload/replacement later. Administrators choose Manage pets beside a customer, or search pet-name prefixes with canonical customer relationships, then edit the same records. Existing customer-name/Google-email search, profiles, roles, bilingual public site and mobile usability remain working. No deletion, reassignment or automatic account linking was added.

Canonical pet records/history: `customers/{customerId}/pets/{petId}`. Current owner/admin authorization applies to records AND photos. Private bucket `niu-niu-family-paws-pet-photos` is Oregon, with uniform access/public-access prevention and bucket-scoped runtime custom role `familyPawsPhotoAccess` (create/get only). JPEG/PNG/WebP uploads are limited to 3 MiB/16 MP and reencoded as metadata-free WebP within 1200×1200. Immutable content hashes/generation preconditions support safe retries. Historical/unreferenced images remain private; no automatic expiry/backup policy was invented. Bucket soft delete protects operator deletions for seven days.

Backend API source `55595a8`, Cloud Build `99b9c2ab-c039-42d1-a286-42f026f36032`, image digest `sha256:42c33563669c1ba1107a829f23c090703e130ceb62e046b6d6b7a20de0953992`, Cloud Run revision `family-paws-api-00003-b8d`, Hosting tag `fh-89991aa26bea0d7f`. Run now uses request-based CPU, 512 MiB/concurrency 4, still zero-to-two instances. Both `nameKeys` indexes are ready. Existing database/auth IAM and deny-by-default browser Firestore rules remain. No service-account keys were generated.

Validation passed: build/API typecheck, 8 unit, 3 Firestore integration and 6 browser tests plus GitHub CI. Real local AND hosted Google customer/admin workflows verified multiple pets, names before photos, later upload, private image display, identical image retry without extra audit, pet search, shared cross-role edits, reload persistence and sign-out. Live 400px Chinese has no overflow; English/Chinese/public navigation/FAQ/single sign-in remain. Live HTML matches build and retains no-cache/security headers. Missing/invalid business/photo tokens return 401/private-no-store; anonymous actual object/list access is 403. Live customer console capture was empty. Browser tests mock business APIs; database/image integration is separate.

Cleanup verified exactly 11 synthetic documents removed with update-time preconditions: one owner profile, its UID reference, two pets, seven audit entries. One exact test image was removed from active storage with its generation precondition (recoverable under seven-day bucket soft delete). Authentication accounts and real records preserved. No samples remain active. `docs/screenshots/pets-live-mobile-zh.png` contains sample pets/test artwork only, no account details. Temporary preview port 4177 stopped; test tabs closed; the live administrator page is left desktop/English and marked deliverable. See `docs/release-5.md`, `docs/pet-profiles.md`, and the updated owner guide.

Stop after handing back this single delivered feature. Next work may address verified account linking/roles or service package balances, one feature per PR/release. Service/balance workflows need unresolved service names/units, expiry/sharing/consumption/timezone rules before implementation. Employee operations, explicit role switching/impersonation, visit tracking and reminders remain undelivered. Public contact/rates/location/business photos and recovery/retention policies still need owner facts; never invent them. Keep the metadata-preserving pet-capable API if rolling back a frontend release.
