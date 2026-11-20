## Current executed validation — 2026-11-18

The completed delivery tree passes 74 unit tests, API typechecking, production build and formatting. Backend coverage is 48 distinct isolated headless Chrome journeys: the full run passed 46, with two new shared-fixture test conflicts corrected and all eight affected/dependent journeys passing together. The 17 selected shared-control/profile/routing journeys pass. CI re-runs the full backend suite before merge and explicitly installs Chrome.

A separate audit of the 119 Chrome tests in the older mocked UI suite stopped at six failures; 113 were not run. The initial failures use obsolete unauthenticated profile mocks (204 rather than the required 401/code response), obsolete navigation expectations, or expect a collapsed phone nav to be visible. These older mocks need migration; they are not counted in the passing real-backend results. WebKit was excluded to honor the requested headless Chrome workflow. Do not claim the entire historical suite passes.

## Latest owner confirmation — direct charges and discounted boarding days

## Appearance and component readability regression coverage

`appearance.spec.ts` checks all four app-family presets at 320px Chinese and 1280px English: source surface/button colors, bundled geometry, primary contrast, house/room and status distinction, shared booking calendars, invalid/storage-blocked preferences, reset/persistence, retired-preset migration, tab synchronization and public-site isolation/navigation/history. VS Code Dark additionally checks actual booking fields, selector popovers and timeline surfaces.

`theme-components.spec.ts` walks every preset through calendar controls, selectors, date popovers, Add balance/customer/price/house dialogs and My profile. Checks theme surfaces, menu/control geometry and page width, and saves screenshots. `readability.ts` checks actual rendered text/field values/placeholders against composited ancestor backgrounds (including CSS color-mix), with a 4.5:1 minimum for covered normal, secondary, selected and disabled text. Existing bilingual responsive layout/scroll suites remain required. All browser tests use isolated headless Chrome and emulator fixtures; no personal browser session is accessed. Selected checks do not certify all possible content states.


- Grooming charges the customer directly in USD; do not spend boarding-day balances on grooming.
- Boarding supports **direct customer payment** for the itemized stay, or use of **prepaid boarding days purchased at a discount**. A direct-paid stay must not also deduct prepaid days. A day-funded stay deducts its confirmed day usage when booked.
- Holiday additional fees remain separate credit-card charges on configured holiday dates, including for prepaid-day bookings.
- Discount rates, eligible package sizes/tiers and purchase terms must be configured from owner-approved facts; do not invent them. Retain purchase price, discount and day quantity for statements and admin-selected withdrawal valuation.
- Payment provider/timing and failure/refund rules for direct payments, day purchases and holiday card fees still require decisions. In particular, direct-paid cancellation refund destination and mixed day-plus-money payment for insufficient days are not yet specified.

Documentation only; no application/test implementation, commits, pushes or deployment.

## Latest owner confirmations — holiday card fees and employee permissions

- Same-date drop-off and pickup costs **one boarding day**. Monday-to-Tuesday remains two.
- A50% refund of3 deducted boarding days restores **1.5 boarding days**, without rounding that refund up to a whole day.
- Administrators configure holiday dates. The additional20% holiday fee applies only to holiday dates and is charged to the **customer’s credit card**, separately from boarding-day balance. This supersedes holiday surcharge deductions in boarding days and the earlier1.2-day examples. Round base boarding-day usage up once for the entire stay. A two-date stay deducts2 boarding days even if both dates are holidays, plus the itemized holiday card fee. Card-payment provider, collection timing, failure handling and holiday-fee refund terms still need decisions.
- Employees assigned to a house may verify pet weights and correct actual drop-off/pickup records for that house. Retain original values, corrected values and responsible employee in history; enforce assigned-house scope on the backend.
- Discard the **$95 X-Large Dog – Long Hair / Double Coat** bath row. The **$115** row remains; the separate$95 XL short-hair row is unchanged. Preserve info/parsed.json as the original transcription.

These are documentation requirements, not implemented or tested functionality. No code, commits, pushes or deployment.

# End-to-end user flows and test plan

Updated: 2026-11-18.

This is the complete intended test checklist for the current requirements, grouped by role and shared behavior. Tests should simulate people using the app, with real Firebase Authentication, API and Firestore persistence. A checklist entry is not a claim that its feature or test is complete.

**Delivery instruction:** keep current work local. Do not commit, push, merge or deploy unless the owner changes the latest instruction.

## Latest confirmed balance unit

Balance is **boarding days**, explicitly confirmed after the owner rejected USD and generic credits. Pricing, money collected and bank payouts remain USD. Earlier USD-wallet proposals/cases below are superseded and must not be implemented as a dollar wallet. Test separate USD itemization and day usage, fractional holiday/refund days, no double spend, day refunds and approved day-to-USD redemption. Monday-to-Tuesday is two billable days; cancellation notice uses calendar days. Boarding-day expiry and cash-redemption conversion remain to confirm. Documentation only; no coding.

## Coverage status

- **Covered:** an existing automated browser journey or backend test exercises the stated behavior. Where only the backend is covered, the row says so.
- **Partial:** part of the behavior is tested; the complete browser journey or its variants still need coverage.
- **Pending:** implement or extend the feature/test before calling it complete.
- **Blocked:** the expected business result depends on an unresolved rule. Keep the operation unavailable rather than manufacture a result.

Recorded passing runs: two real-backend Playwright journeys, one populated-local-app journey, six bilingual responsive date-picker tests, 63 unit tests and 11 Auth/Firestore integration suites. Some subsequent local edits, including the latest customer/type ordering correction and cancellation-policy draft work, still need a final combined rerun. These counts do not mean the whole checklist passes.

## 1. Authentication and role boundaries

| ID      | User flow and expected result                                                                                                                                                                                                            | Coverage                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| AUTH-01 | Sign in as an administrator; show Calendar / Balances / Customers / Pricing, with no Settings button in the app bar.                                                                                                                                                | Authenticated-fixture navigation covered; sign-in button/provider-popup journey pending.  |
| AUTH-02 | Sign in as a customer; show Calendar / Balances / Pets and derive their customer scope on the server.                                                                                                                                    | Covered, with additional calendar variants pending.                                       |
| AUTH-03 | Sign in as an employee; open operational arrivals/pickups rather than admin management.                                                                                                                                                  | Pending dedicated employee implementation and browser journey.                            |
| AUTH-04 | Refresh a signed-in page and open a saved deep link; wait for authentication before loading private records.                                                                                                                             | Covered for admin/customer core journeys.                                                 |
| AUTH-05 | Sign out or switch accounts; remove the previous person's records, photos and available actions.                                                                                                                                         | Partial; broader cross-role switching journey pending.                                    |
| AUTH-06 | Revoke administrator/employee access or disable an account; an old token must not retain permission.                                                                                                                                     | Admin revocation/disabled-account backend tests covered; employee variants pending.       |
| AUTH-07 | Request private data without a valid verified identity; reject it without disclosing records.                                                                                                                                            | Covered by backend tests.                                                                 |
| AUTH-08 | Refresh tokens and change language without losing a draft or changing the actual authenticated identity.                                                                                                                                 | Partial; existing draft/language regressions plus expanded role matrix pending.           |
| AUTH-09 | One Google identity can be admin/employee/customer and own pets; switching personal/operational/admin context must retain the actual identity and must not grant extra permissions.                                                      | Pending dedicated multi-role journey.                                                     |
| AUTH-10 | Open a forbidden deep link directly and use Back/Forward after switching accounts; no stale private screen or photo may flash before authorization completes.                                                                            | Partial; dedicated cross-role browser case pending.                                       |
| AUTH-11 | Sign out, switch role/customer context or lose access while a read/write is pending. A late result must never appear under the new identity/context; the original operation keeps its original actor/target.                             | Pending explicit two-context/delayed-response browser cases.                              |
| AUTH-12 | Click the app's Sign in/Google button, complete the emulator provider popup as a user, and return to the intended route with language and role correct. Verify actual Google sign-in separately in the required controlled manual smoke. | Pending interactive popup journey; direct SDK fixture sign-in is not equivalent coverage. |
| AUTH-13 | Cancel/close or encounter a failed/blocked provider popup, return focus to sign-in, and retry successfully. Do not create a profile, grant a role or expose data from an incomplete sign-in.                                             | Pending explicit popup recovery journey.                                                  |

## 2. Administrator flows

| ID       | User flow and expected result                                                                                                                                           | Coverage                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| ADMIN-01 | Open the customer directory, search and select a customer, then inspect their pets.                                                                                     | Partial; management components have existing tests, full canonical directory journey needs expansion. |
| ADMIN-02 | Create/edit a customer, save, reload and reopen the same record.                                                                                                        | Contact editing/reload covered; new-customer canonical browser case pending.                          |
| ADMIN-03 | Create/edit a pet's name, type, weight and private photo; verify persistence.                                                                                           | Type/weight and existing photo coverage present; combined create/upload journey needs expansion.      |
| ADMIN-04 | Select View as customer; Calendar / Balances / Pets all show only that customer's records. Exit returns to the current admin tab.                                       | Covered for core scoped data; broader navigation variants pending.                                    |
| ADMIN-05 | Act on behalf of a customer while retaining the actual administrator in audit history.                                                                                  | Backend covered; core browser adjustments/bookings covered.                                           |
| ADMIN-06 | Add boarding credits or correct a balance for any permitted customer's selected pet.                                                                                    | Covered, including persistence and server isolation.                                                  |
| ADMIN-07 | Create/edit/choose/archive a validity template; copying dates must not link existing accounts to future template edits.                                                 | Creation/use browser covered; archive/concurrency/snapshot isolation backend covered.                 |
| ADMIN-08 | Create/edit a booking through customer, type, pet, dates, available room and review. Reload and reopen it.                                                              | Covered for creation/editing; latest date-only-click progression has additional cases planned.        |
| ADMIN-09 | Record arrival and pickup; actual times remain separate from planned dates.                                                                                             | Covered in a real-backend browser journey.                                                            |
| ADMIN-10 | Cancel an unbilled staff plan; retain its history, release occupancy and leave manually credited days unchanged.                                                        | Covered in a real-backend browser journey and backend tests.                                          |
| ADMIN-11 | Open house/room gears on Calendar; edit and save the exact selected location.                                                                                           | Room gear/save covered; house gear browser variant pending.                                           |
| ADMIN-12 | Create houses/rooms, require an address and valid timezone, configure capacity and species consumption, then see them in Calendar.                                      | Backend and existing component tests covered; full real-backend UI creation journey pending.          |
| ADMIN-13 | Save a cancellation-policy draft and reload it; never publish it or activate deductions/refunds merely by saving a draft.                                               | Local persistence work in progress; dedicated tests pending.                                          |
| ADMIN-14 | Configure employee access and verify employees receive only their allowed operations/data.                                                                              | Pending. No real employee role should be granted silently.                                            |
| ADMIN-15 | Approve/verify a pet's entered weight, recording who verified it and when; distinguish entered and verified values in the UI/history.                                   | Pending implementation and employee/admin permission cases.                                           |
| ADMIN-16 | Configure type/category/weight capacity groups and explicit per-pet overrides; display which rule supplies the booking's saved capacity consumption.                    | Pending; group definitions, boundaries and verification treatment need confirmation.                  |
| ADMIN-17 | Preview future bookings affected by a capacity/rule/closure change; reject or require the approved conflict-resolution workflow instead of silently invalidating stays. | Existing simple capacity-reduction protection is covered; full preview/change policy pending.         |
| ADMIN-18 | Remove/archive only an eligible house or room; protect occupied locations and retain referenced booking/audit history.                                                  | Pending production removal/history policy.                                                            |
| ADMIN-19 | Review a dynamic house map for a selected time, combined/individual-house occupancy and room timelines; keyboard/touch alternatives work without dragging.              | Pending map/overview journey.                                                                         |
| ADMIN-20 | Distinguish a read-only customer preview from acting on behalf of a customer; only authorized acting operations write records and retain the actual actor.              | Pending distinct preview-mode behavior/tests.                                                         |

## 3. Customer flows

| ID          | User flow and expected result                                                                                                                 | Coverage                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| CUSTOMER-01 | Register/edit the customer's own profile, refresh and retain the correct canonical record.                                                    | Existing profile tests; full updated workspace onboarding journey needs expansion.       |
| CUSTOMER-02 | Add/edit the customer's own pets and view their private photos.                                                                               | Existing pet API/component coverage; complete canonical browser journey needs expansion. |
| CUSTOMER-03 | View only their own pets, bookings, balances and recorded statements across the three tabs.                                                   | Own pets/balances and booking read isolation covered; expanded calendar journey pending. |
| CUSTOMER-04 | Search/filter within their own pets; switching tabs and reloading preserve customer/pet context.                                              | Partial.                                                                                 |
| CUSTOMER-05 | Check whole-stay room availability suitable for their pet without seeing another customer's pets, contacts or assignments.                    | Backend availability/privacy covered; dedicated customer browser journey pending.        |
| CUSTOMER-06 | Review the pet, house, address, timezone, stay dates and their own balance before submission.                                                 | Admin review covered; customer-specific browser assertions pending.                      |
| CUSTOMER-07 | Request another customer's ID, forge query parameters or open another customer's booking/photo URL; receive no private data.                  | Covered by real HTTP/backend tests and browser forged-scope check.                       |
| CUSTOMER-08 | Request account linking; records stay private until authorized approval; duplicate identities are not automatically merged.                   | Existing linking tests; updated workspace browser journey needs expansion.               |
| CUSTOMER-09 | Request paid booking with insufficient/unconfigured coverage; fail safely without spending days or reserving unsupported financial state.     | Fail-closed backend behavior exists; working paid booking is blocked by rules below.     |
| CUSTOMER-10 | Once billing is configured, book, cancel and extend with the exact approved credit/payment/expiry/refund results.                             | Blocked; not currently a working paid workflow.                                          |
| CUSTOMER-11 | Open each pet's visit history and the customer's combined timeline, including upcoming and past visits; ownership and filters remain correct. | Partial; explicit historical/upcoming browser assertions pending.                        |
| CUSTOMER-12 | Start a booking that needs credit, go to the approved package/payment flow, then return with the original pet, dates and room intent intact.  | Blocked until payment/booking lifecycle is configured.                                   |
| CUSTOMER-13 | Use the Only my pets filter while a multi-role owner is in an administrator/personal workspace; never infer ownership from names or email.    | Pending canonical browser journey.                                                       |

## 4. Employee flows

Employee drop-off and pickup are required features. Passing the administrator handoff journey does **not** count as testing the employee role.

| ID          | User flow and expected result                                                                                                                  | Coverage                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| EMPLOYEE-01 | Sign in as an employee; see the authorized operational calendar/queue.                                                                         | Pending.                                                             |
| EMPLOYEE-02 | Review expected arrivals, pets in care, expected pickups and overdue pets with clear house/timezone context.                                   | Pending employee UI; admin status behavior is covered separately.    |
| EMPLOYEE-03 | Choose a booking, record actual drop-off time, save and reload; status becomes in care.                                                        | Pending employee journey/authorization.                              |
| EMPLOYEE-04 | Choose a pet in care, record actual pickup time, save and reload; status becomes completed and occupancy is released.                          | Pending employee journey/authorization.                              |
| EMPLOYEE-05 | Enter an earlier actual time when recording a delayed handoff; preserve planned times and the responsible employee in history.                 | Pending employee journey; actual-time API behavior exists for admin. |
| EMPLOYEE-06 | Reject a future handoff time, pickup before actual arrival and an incompatible status transition.                                              | Admin/backend cases covered; employee variants pending.              |
| EMPLOYEE-07 | Double-click or retry after a lost response; record a handoff once, with no duplicate history.                                                 | Backend receipts covered; employee browser retry case pending.       |
| EMPLOYEE-08 | Attempt to edit guest details, planned booking dates, prices, balances, customer profiles or admin settings; reject unauthorized actions.      | Pending dedicated employee matrix.                                   |
| EMPLOYEE-09 | Lose employee access while signed in; subsequent reads/writes must stop even with the old token.                                               | Pending employee variant.                                            |
| EMPLOYEE-10 | Attempt a correction of an already-recorded historical handoff; enforce the approved correction permission and retain history.                 | Assigned-house corrections authorized; implementation/browser coverage pending.                  |
| EMPLOYEE-11 | Verify an allowed pet weight at drop-off only if that permission is granted; retain entered value, verified value, actor and date as required. | Pending permission decision/implementation.                          |
| EMPLOYEE-12 | Inspect a private pet photo only for an authorized operational visit; reject another house/customer's direct photo URL when out of scope.      | Pending employee house-scope decision and API/browser coverage.      |

## 5. Shared calendar flows

| ID     | User flow and expected result                                                                                                                                                | Coverage                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| CAL-01 | Open a populated calendar; show House → Room → Pet rows, single continuous dividers and a visible Now marker for the displayed period.                                       | Populated local browser covered; explicit divider geometry variants pending.        |
| CAL-02 | Switch Day / Weeks / Month / Year; display the appropriate saved stays without changing their instants.                                                                      | Expanded browser cases pending.                                                     |
| CAL-03 | Use Today, previous, next and the custom date filter; cover month/year boundaries and leap days.                                                                             | Date-control tests covered; calendar navigation journey pending.                    |
| CAL-04 | Filter by house, room, customer, pet type, pet name and booking status; combine filters and clear them.                                                                      | Partial; complete combination/reset journey pending.                                |
| CAL-05 | Show pet-type icons and names in the type filter.                                                                                                                            | Covered in real-backend browser journey.                                            |
| CAL-06 | Show planned, in-care, picked-up, cancelled and overdue states with readable, restrained colors.                                                                             | Populated local/admin/backend coverage; dedicated status-filter assertions pending. |
| CAL-07 | Hover, focus or tap a pet avatar; inspect its large photo, owner, weight, balance, coverage and room. Close with Escape/outside click.                                       | Core popup covered; full touch/keyboard variants pending.                           |
| CAL-08 | Open a house address, including a legacy house missing an address; show saved details or N/A.                                                                                | Address dialog covered; legacy address validation in backend/component tests.       |
| CAL-09 | Use house/room settings icons and return to the same calendar context.                                                                                                       | Room journey covered; house variant pending.                                        |
| CAL-10 | Change the clock timezone; house booking times and financial rules remain unchanged.                                                                                         | Underlying zone tests covered; complete browser assertion pending.                  |
| CAL-11 | Show actual occupancy for overdue pets until recorded pickup; never advertise the room as free merely because planned pickup passed.                                         | Backend and populated local calendar covered.                                       |
| CAL-12 | Scroll the timeline on a phone; keep labels readable and avoid page-level horizontal overflow.                                                                               | Covered on Chinese phone layout; broader view/role matrix pending.                  |
| CAL-13 | Refresh/copy a calendar URL; preserve lang query, date, view, filters and customer scope.                                                                                    | Partial; language/deep-link tests exist, full combined case pending.                |
| CAL-14 | Switch a room's species between non-overlapping stays; reject overlap while preserving the configured turnover/boundary rule.                                                | Core species/turnover backend coverage; browser boundary cases pending.             |
| CAL-15 | Inspect arrivals, pickups, in-care pets, unassigned requests and conflicts where supported by the approved lifecycle; counts and drill-downs agree with saved records.       | Partial; requests/unassigned behavior depends on lifecycle decisions.               |
| CAL-16 | Remove a timed placement without deleting the pet profile; preserve visit history and any required financial review.                                                         | Staff cancellation preserves records; other movement/removal policies pending.      |
| CAL-17 | Review an explainable placement suggestion before any room move; no automatic reassignment occurs without an approved policy.                                                | Pending optimization/suggestion scope and move policy.                              |
| CAL-18 | Leave Calendar open across planned arrival/pickup or local midnight; refresh status/Now indicators without reloading. Resume a background tab and recheck current occupancy. | Timer foundations exist; deterministic browser-clock/resume assertions pending.     |
| CAL-19 | Change a house timezone after bookings exist. Preserve saved booking instants/timezone history and clearly distinguish new settings from existing booking terms.             | Pending explicit timezone-edit journey and approved change policy where applicable. |

## 6. Booking modal and availability flows

| ID      | User flow and expected result                                                                                                                                                                                      | Coverage                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| BOOK-01 | Keep visual order Customer → Pet type → Pet → Dates, while allowing type selection before choosing a customer.                                                                                                     | Implemented locally; final ordering-specific regression still needed.                                   |
| BOOK-02 | Open customer and pet autocompletes using their arrow buttons; empty search lists permitted choices and typing narrows them.                                                                                       | Covered, including 100 customer options and matching pets.                                              |
| BOOK-03 | Show type icon/name only in the type selector; pet choices show avatar/name without repeated type or dot. Selected pet input shows the avatar with clear text spacing.                                             | Core assertions covered; latest layout/style needs final combined rerun.                                |
| BOOK-04 | Change customer/type and clear an incompatible pet selection; never submit an old pet under the new customer.                                                                                                      | Partial; more interaction permutations pending.                                                         |
| BOOK-05 | Click an arrival/pickup day; immediately fill complete date/time, preserving an existing time or displaying the current local time for an empty field. No extra time-required prompt for a day click.              | Six date-control cases pass; end-to-end Next-enabled assertion is being expanded.                       |
| BOOK-06 | Adjust hours/minutes, apply, reopen and preserve the chosen value.                                                                                                                                                 | Covered by date-picker tests.                                                                           |
| BOOK-07 | Enable Choose a room when customer/pet and an ordered complete stay are valid. Reject impossible dates and pickup at/before arrival.                                                                               | Core validation covered; explicit click-only regression pending.                                        |
| BOOK-08 | Resolve house-local times correctly across browser zones; reject nonexistent DST times and explicitly disambiguate repeated times.                                                                                 | Unit/timezone browser foundation covered; complete booking variants pending.                            |
| BOOK-09 | Show green selectable free intervals and gray unavailable intervals for the whole requested stay.                                                                                                                  | Covered in real-backend and populated local journeys.                                                   |
| BOOK-10 | Select an available span/room and review the saved house, room, address, timezone, pet, dates and own balance.                                                                                                     | Covered.                                                                                                |
| BOOK-11 | Reject capacity overflow, overlapping incompatible species, duplicate pet placement and overdue occupancy, including cross-house pet conflicts.                                                                    | Backend/integration covered; selected browser rejection cases still to add.                             |
| BOOK-12 | Recheck availability on save; two concurrent customers cannot both consume the same last capacity.                                                                                                                 | Backend integration covered; two-browser-context case pending.                                          |
| BOOK-13 | Save/reload/edit the same canonical booking; guest is immutable, closed history is retained, in-care edits are restricted.                                                                                         | Main browser and backend covered.                                                                       |
| BOOK-14 | Cancel/back/close/Escape with a draft; warn before discarding, preserve recoverable errors, clear the warning only after a confirmed save.                                                                         | Underlying draft tests and confirmed-save journeys covered; expanded wizard error cases pending.        |
| BOOK-15 | Keep the modal nearly full-screen with viewport clearance, fixed actions, scrollable content and unclipped field borders.                                                                                          | Core geometry/responsive coverage exists; final updated visual regression pending.                      |
| BOOK-16 | Preserve the chosen duration and revalidate the whole stay when selecting a different available span; partial-day blocked intervals remain continuous and explained.                                               | Backend/earlier picker coverage exists; final canonical browser variant pending.                        |
| BOOK-17 | A guest scheduled in another house cannot be double-placed; two different pets under one customer must still remain independent.                                                                                   | Canonical-pair backend coverage; two-context browser assertion pending.                                 |
| BOOK-18 | Closed booking edits and unauthorized in-care changes are rejected without rewriting previous guest/location/actual-time history.                                                                                  | Backend covered; full UI restriction assertions pending.                                                |
| BOOK-19 | Navigate from details to room selection to Review. No booking write occurs until the explicit final Save booking action; Enter on a dropdown/date control must not accidentally submit the wizard.                 | A review-click regression was fixed; dedicated request-count/keyboard assertions pending.               |
| BOOK-20 | Race an edit/cancellation against check-in, and two staff members against the same handoff/version. Exactly one incompatible transition wins; the other receives a recoverable conflict without rewriting history. | Version/transaction foundations covered; explicit race matrix and two-browser-context journeys pending. |

## 7. Balances, templates and statements

| ID     | User flow and expected result                                                                                                                                                                 | Coverage                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| BAL-01 | Select customer/pet in one clear filter area; preserve scope between balances, calendar and pet details.                                                                                      | Partial; core scoping is covered.                                                                |
| BAL-02 | Add or correct boarding days, review the resulting balance and save/reload it on the selected pet only.                                                                                       | Covered.                                                                                         |
| BAL-03 | Prevent negative totals, non-integer days, invalid coverage dates and unauthorized customer adjustments.                                                                                      | Backend covered; more UI validation cases pending.                                               |
| BAL-04 | Create/edit/archive validity templates, reuse dates and leave already-saved balances unchanged when a template changes.                                                                       | Browser create/use and backend archive/race/snapshot coverage.                                   |
| BAL-05 | Keep immutable recorded activity with date, pet, delta, reason and balance after the event.                                                                                                   | Covered.                                                                                         |
| BAL-06 | Filter recorded activity by customer, pet, date and kind before pagination.                                                                                                                   | Real HTTP covered; complete browser filter combinations pending.                                 |
| BAL-07 | Open statement details and paginate without duplicate/missing records.                                                                                                                        | Backend pagination covered; detailed browser journey pending.                                    |
| BAL-08 | Export the full filtered statement as CSV, including pages not yet loaded; escape spreadsheet formulas safely.                                                                                | Browser export and unit/backend coverage.                                                        |
| BAL-09 | Concurrent adjustments and identical retries produce the correct total and exactly one event per operation.                                                                                   | Backend integration covered; lost-response browser scenario pending.                             |
| BAL-10 | Booking/handoff/cancellation of an explicitly unbilled staff plan does not manufacture payment, deduction or refund events.                                                                   | Covered.                                                                                         |
| BAL-11 | Calculate available/reserved/spent USD, booking deductions, cancellation balance refunds and bank-withdrawal holds according to configured rules.                                             | Blocked; not claimed complete.                                                                   |
| BAL-12 | Require the reviewed validity range to cover the entire stay and extension; never borrow another pet's credit or silently combine date-range and eligible-month policies.                     | Per-pet/manual range foundations covered; financial enforcement blocked by charging rules.       |
| BAL-13 | Present a 30-day package, its applicable type/weight band, activation and expiry without starting three-month validity at purchase or booking creation.                                       | Blocked by exact first-use/expiry rules; explicit 30-day assertion pending.                      |
| BAL-14 | Keep purchased/confirmed terms and ledger history stable when prices or templates later change; apply only the approved effective-date policy.                                                | Template snapshot isolation covered; package/rate versioning pending.                            |
| BAL-15 | Export/reopen CSV containing Chinese names, commas, quotes and line breaks. Verify all filtered pages, recorded running balances and inclusive local-date end boundaries, including DST days. | CSV/pagination foundations covered; complete browser round-trip and date-boundary cases pending. |

## 8. Business information, pricing and policy

Source: [info/parsed.json](../info/parsed.json), supplied by the owner. Preserve its provenance and uncertainty. Later owner replies confirm USD, a USD balance, deduction at booking, admin override priority, zero standard refund under seven days/no-show, manual admin bank payout now, all dates billable and20% balance surcharge on holiday dates only.

| ID      | User flow and expected result                                                                                                                                                                                    | Coverage                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| RULE-01 | Use the supplied boarding, dog bath, dog grooming, cat bath/add-on and academy information without inventing prices or missing course details.                                                                   | Pending integration and tests.                                                                                                            |
| RULE-02 | Preserve printed USD amounts/ranges and pound units; use the owner-confirmed USD currency rather than the transcription's older null currency_code.                                                              | Pending.                                                                                                                                  |
| RULE-03 | Prorate numeric boarding price ranges by weight within the selected band; retain overlapping/gapped boundaries and conflicting bath categories for review.                                                       | Pending.                                                                                                                                  |
| RULE-04 | Preserve the stated long-weekend 20% holiday rate and package-only holiday policy; do not invent holiday dates or charging mechanics.                                                                            | Pending configuration/interpretation.                                                                                                     |
| RULE-05 | Save/reload versioned cancellation-policy drafts with focused editing, safe retries and actual-actor history.                                                                                                    | Implementation in progress; dedicated tests pending.                                                                                      |
| RULE-06 | A policy draft never overwrites approved public terms or activates billing/refunds.                                                                                                                              | Required invariant; dedicated test pending.                                                                                               |
| RULE-07 | Apply approved package purchase, first-use activation, three-month expiry, administrator-confirmed funding and billable-day rules. An online payment provider is a later phase.                                  | Blocked by remaining business decisions.                                                                                                  |
| RULE-08 | Preview/confirm paid cancellation or extension atomically with the exact approved balance, capacity and holiday effects.                                                                                         | Blocked by remaining business decisions.                                                                                                  |
| RULE-09 | Validate admin-edited price bands, holidays, closures, cancellation rules and capacity rules for gaps/overlaps/contradictions; preview before applying and audit actor/version/effective date.                   | Pending rule editors and effective-date decisions.                                                                                        |
| RULE-10 | Show an extension quote, confirm sufficient valid credit and capacity, then update all accepted changes atomically. If unavailable, insufficient or interrupted, the original booking remains intact.            | Blocked by extension/charging rules; explicit rollback cases required.                                                                    |
| RULE-11 | Test full/half cancellation outcomes at the approved14-/7-day boundaries, zero standard refunds under seven days or for no-shows, USD balance restoration, admin overrides, rounding and returned-credit expiry. | Zero under-seven-day/no-show and balance-first refunds confirmed; exact notice-day calculation/rounding and expiry details remain open.   |
| RULE-12 | Apply the20% USD-balance surcharge only on configured holiday dates; show package-only holiday wording, test mixed holiday/non-holiday stays and prevent duplicate surcharge stacking.                           | USD balance and holiday-date-only application confirmed; actual dates and remaining overlap/eligibility details still need configuration. |
| RULE-13 | Display the supplied WeChat handle and approved academy information accurately; do not invent course duration, fee, certifying body, contact handle or testimonials.                                             | Pending source-content integration/test.                                                                                                  |
| RULE-14 | Customer-facing public cancellation information is reachable from Calendar/Balances and remains separate from the administrator draft.                                                                           | Existing public pricing section/link; dedicated page and complete contextual-link journey pending.                                        |

## 9. Shared UI, navigation and accessibility

| ID    | User flow and expected result                                                                                                                                                                                                         | Coverage                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| UI-01 | Keep the entire app area below navigation white; use status/selection color sparingly and maintain readable contrast.                                                                                                                 | Core computed-background and local visual checks covered.                                    |
| UI-02 | Avoid duplicate headings, table captions, repeated pet types and redundant action/filter rows. Keep hidden labels accessible.                                                                                                         | Local fixes present; updated screenshots/semantic checks need final rerun.                   |
| UI-03 | All selectors/date controls are custom, have matching light-green field borders, borderless spaced items and non-red hover. Only one opens at once.                                                                                   | Existing shared-control tests plus core real-backend checks.                                 |
| UI-04 | Autocomplete arrow buttons toggle choices; keyboard arrows/Enter/Escape/Tab work and focus returns appropriately.                                                                                                                     | Core covered; full keyboard matrix pending.                                                  |
| UI-05 | Selected avatars/icons never overlap input text; disabled controls cannot be changed or submitted.                                                                                                                                    | Geometry assertions added; final combined rerun pending.                                     |
| UI-06 | Preserve language in ?lang=en/zh through links, tab switches, refresh, deep links and browser history.                                                                                                                                | Existing language tests; expanded role matrix pending.                                       |
| UI-07 | Run core journeys in English and Simplified Chinese on desktop and phone layouts, without clipped borders or page overflow.                                                                                                           | Date controls and selected local/core layouts covered; full role-by-language matrix pending. |
| UI-08 | Protect unsaved customer/profile/modal edits during context changes, navigation, refresh and recovery from errors.                                                                                                                    | Partial.                                                                                     |
| UI-09 | Explicitly assert removed UI stays absent: app hc-title, Visit site, duplicated My profile heading, Required days, booking capacity-override/manual-selection controls, separate eligible-month selector and daycare balance options. | Pending consolidated absence-regression assertions.                                          |
| UI-10 | Add/edit-pet and other focused modals retain viewport clearance; outlines/borders fit at 320px width and short phone heights, with reachable fixed actions and internal scrolling.                                                    | Earlier geometry coverage exists; updated all-modal matrix pending.                          |
| UI-11 | Opening a language/account menu, autocomplete or date picker closes every other dropdown; keyboard focus and modal focus trapping stay correct.                                                                                       | Shared exclusivity foundation covered; mixed-menu/modal browser matrix pending.              |
| UI-12 | All marketing/app copy comes from language resources with matching keys; adding a future locale does not require embedding translated strings in components.                                                                          | Resource parity/inline-copy guards exist; representative third-locale smoke pending.         |
| UI-13 | Secondary icons have tooltips and accessible names; information shown on hover is also available by focus/tap, with Reduced Motion respected where applicable.                                                                        | Partial; complete accessibility interaction pass pending.                                    |
| UI-14 | Use browser zoom/large text and short viewports. Labels, dropdown arrows, selected avatars and primary actions remain readable/reachable without overlapping or hiding content.                                                       | Pending dedicated zoom/large-text journey.                                                   |
| UI-15 | Open records with unset values or missing translation data. Show approved fallback text/empty values; never render raw translation keys, undefined, null or NaN as user-facing data.                                                  | Individual fallback fixes exist; consolidated regression pending.                            |

## 10. Reliability, security and local data

| ID      | User flow and expected result                                                                                                                                                                                            | Coverage                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| SAFE-01 | Every read/write enforces current authentication and record ownership on the backend. Browser filters alone do not authorize access.                                                                                     | Admin/customer backend coverage; employee matrix pending.                                              |
| SAFE-02 | Same pet UUID under different customers and same room UUID under different houses remain independent.                                                                                                                    | Backend integration covered.                                                                           |
| SAFE-03 | Retry an operation after a response is lost: return the original result, with no double credit/booking/handoff.                                                                                                          | Backend receipts covered; browser network-interruption case pending.                                   |
| SAFE-04 | Stale edits retain user input and require review instead of overwriting a newer version.                                                                                                                                 | Backend/component coverage; expanded real UI case pending.                                             |
| SAFE-05 | Removing optional pet metadata does not prevent an authorized recorded pickup from releasing occupancy.                                                                                                                  | Backend integration covered.                                                                           |
| SAFE-06 | Unconfigured legacy houses/rooms display N/A/setup guidance and cannot be booked; availability remains readable.                                                                                                         | Legacy API regression added; final combined rerun pending.                                             |
| SAFE-07 | Do not expose internal receipts, ownership fields or private audit identities through customer DTOs.                                                                                                                     | Backend integration covered.                                                                           |
| SAFE-08 | Photo-rich navigation has a separate verified-user request budget; one user cannot consume another user's budget.                                                                                                        | Unit test covered.                                                                                     |
| DATA-01 | Seed labeled sample customers/pets, credits, templates, locations and booking states in demo-niu-niu only.                                                                                                               | Local script run successfully.                                                                         |
| DATA-02 | Rerun seeding without overwriting owner edits, photos, existing credits/bookings or duplicating operations.                                                                                                              | Repeated seed run reported zero new records/changes.                                                   |
| DATA-03 | Keep a separate empty Practice room available for booking tests.                                                                                                                                                         | Populated local browser covered.                                                                       |
| DATA-04 | Run destructive/write E2E tests only in isolated integration-* databases; keep owner demo records untouched.                                                                                                             | Real-backend harness uses a unique named database.                                                     |
| DATA-05 | Verify the populated owner preview using a separate browser context without changing an existing open draft.                                                                                                             | Local browser journey covered.                                                                         |
| SAFE-09 | Upload/replace a private photo, reject invalid/oversized images, preserve uploaded photos and required stock-photo attribution, and revoke inaccessible cached URLs after account changes.                               | Existing image/store tests; updated role/replace/cache browser matrix pending.                         |
| SAFE-10 | Verify actor/customer/pet/service/time/consumed-unit audit references on financial operations; no role change or credential mutation is possible through business forms.                                                 | Manual operation actor/target coverage exists; financial unit references blocked until implemented.    |
| SAFE-11 | Empty, loading, offline, permission and server-error states remain understandable; recover without cross-scope stale data, losing drafts or submitting twice.                                                            | Partial; complete network/role-transition browser scenarios pending.                                   |
| DATA-06 | Seed distinct admin/customer/employee and multi-role fixtures with allowed/forbidden targets, plus valid, expired, missing-metadata, occupied and empty cases. Never promote an arbitrary matching email to a real role. | Admin/customer/sample occupancy exist; employee/multi-role fixtures pending.                           |
| DATA-07 | Keep sample/test photos cloud-sourced and photo-complete in the owner demo, retain licensing metadata, and do not ship fictional records as approved production data.                                                    | Owner demo library exists; automated audit assertions pending.                                         |
| DATA-08 | Isolate test outputs and clean up only exact test-owned records/identities; fixture resets and test retries must not erase owner edits or affect another suite.                                                          | Separate artifact directories and named DB isolation exist; explicit cleanup/retry regression pending. |
| SAFE-12 | Delay/reorder successive filter and customer-switch responses; only the newest permitted request may update the current view. Abort older requests without replacing the new data with an error or stale record.         | Cancellation/generation guards exist; explicit browser response-reordering case pending.               |
| SAFE-13 | Submit boundary/invalid numeric and date inputs, including non-finite values and values outside schema limits. Reject them consistently without corrupting saved data or exposing internal errors.                       | Some backend validation cases exist; complete field-boundary matrix pending.                           |
| SAFE-14 | Run the production build and test-only setup guards. Demo identities, fixture endpoints and emulator writes must not silently target production; missing/mismatched emulator configuration must fail closed.             | Existing explicit guards; consolidated production-separation regression pending.                       |
| DATA-09 | Run every journey alone, in a different order and on retry. No case may depend on another case's credit, role, booking, clock or selected language.                                                                      | Some fixtures were made self-contained; complete independence/retry run pending.                       |
| DATA-10 | Restart only the frontend/API and verify saved emulator records remain readable. Do not restart/clear the owner's emulator merely to test this.                                                                          | Reload coverage exists; explicit dev-server restart smoke pending.                                     |
| DATA-11 | Use isolated headless Chrome locally and in CI. Never attach to, inspect or debug the owner's personal Chrome session or reuse its tabs/drafts.                                                            | Visible local run passed; automated configuration/context-isolation assertions pending.                |

## Test execution and artifacts

Latest owner preference (2026-11-18): all three configurations use isolated headless Chrome. Do not access or debug the owner’s personal Chrome session. This supersedes earlier visible-window defaults. Tests use disposable browser profiles and separate contexts.

- [tests/backend-browser/workspace.spec.ts](../tests/backend-browser/workspace.spec.ts): real API/Auth/Firestore core admin/customer journey, handoffs and cancellation.
- [tests/local-browser/sample-workspace.spec.ts](../tests/local-browser/sample-workspace.spec.ts): actual localhost:4180 populated sample app, white content, controls, available practice space and Chinese phone layout.
- [tests/browser/custom-dates.spec.ts](../tests/browser/custom-dates.spec.ts): six shared date-picker/keyboard cases across English/Chinese and 390/1440 widths.
- [tests/workspace-api.integration.mjs](../tests/workspace-api.integration.mjs): real authenticated HTTP persistence, ownership, current roles, pagination and configuration cases.
- [tests/customer-store.integration.mjs](../tests/customer-store.integration.mjs): isolated Firestore workflows and concurrency.
- [playwright.backend.config.ts](../playwright.backend.config.ts) and [playwright.local.config.ts](../playwright.local.config.ts): separate output directories so concurrent suites do not delete one another's artifacts.

Run the backend browser harness with Auth/Firestore emulators available:

```sh
npx playwright test --config playwright.backend.config.ts
```

For a fresh emulator lifecycle, `npm run test:backend-browser` starts the required test emulators. Do not start competing emulator processes on ports already in use.

Run the populated local walkthrough only with the demo frontend/API/emulators already running:

```sh
npx playwright test --config playwright.local.config.ts
```

Local preview: http://localhost:4180/app/calendar/?lang=en . Use localhost for sign-in. Business data is in the local Firestore emulator on8085; Auth is on9099; the API is on8081. Records are currently emulator-memory data unless exported. Private demo photos are cached in the system temporary directory under family-paws-local-photo-cache. Automated write tests use separate named databases.

## Audit and scope notes

The follow-up audit added explicit coverage for multi-role identities, weight verification, capacity groups/overrides, location removal/history, dynamic occupancy maps, placement moves/suggestions, per-pet historical calendars, purchase-and-return, failed-extension rollback, exact package/refund boundaries, source contact/course facts, private-photo replacement and the earlier UI removals. These are requirements to verify, not newly completed features.

Latest owner instructions override historical proposals: primary navigation is Calendar / Balances / Customers (Pets in a customer context), Settings is secondary, language uses query parameters, Customer remains visually above Pet type, type can be chosen before customer, and Add booking pet options show avatar/name without repeating type. Per-pet capacity overrides belong in authorized configuration if implemented; they must not reappear as manual overrides in the Add booking dialog.

Separate workstreams tracked in requirements.md—renewal reminders, duplicate-profile reconciliation, retention/backups/recovery and unresolved public branding/contact facts—are not silently marked delivered by this test plan. Define their approved scope and expectations before extending the suite. General income reporting and care notes are not added to this request.

## Additional edge-case audit

A second audit made the following cases explicit rather than relying on broad wording: pending-operation account switches, timer/background-tab transitions, house-timezone edits, no-save-before-confirmation, competing handoffs/edit/cancellation, Unicode CSV/local-day boundaries, zoom/large text, raw-value fallbacks, out-of-order responses, numeric/schema boundaries, production/test separation, test independence, dev-server restart persistence and visible local execution. These entries remain pending unless a specific passing test is identified.

## Interactive sign-in audit

Authenticated test fixtures prove post-login behavior, not the complete sign-in-button/provider-popup flow. AUTH-12/AUTH-13 explicitly cover that distinction. Automated emulator-popup journeys and the real-provider manual smoke must be reported separately; neither may be claimed merely because a test called signInWithCredential.

## Historical USD-wallet test proposals — superseded by boarding days

- USD-01: enter/display exact USD cents, including amounts such as$0.01 and$10.25; reject excess decimal places and non-finite/unsafe input.
- USD-02: preserve legacy day-credit records separately; no dollar balance may be inferred by renaming a days field.
- USD-03: atomically deduct the confirmed booking quote and capacity; insufficient balance or capacity failure changes neither record.
- USD-04: test concurrent booking deductions and withdrawal holds against the same wallet; available money cannot be spent twice.
- USD-05: refund a qualifying cancellation to USD balance once; under-seven-day/no-show standard refund is zero; audit explicit administrator overrides.
- USD-06: request a bank withdrawal, reserve the money, pay manually as admin, record completion once and retain the external payment reference/status.
- USD-07: reject/cancel an unpaid withdrawal and release its hold once; prevent a paid withdrawal from being cancelled/restored or paid twice.
- USD-08: reject unauthorized withdrawal approvals and other customers' withdrawal reads/writes; changing a pending amount requires a fresh reviewed operation.
- USD-09: price a mixed stay with20% surcharge on holiday dates only; ordinary dates are still billable at normal rates.
- USD-10: render owner-source USD pricing on the marketing site and remove daycare from service navigation, content and app workflows.

These are newly confirmed requirements, not passing tests yet. Remaining uncertainty must be described per case rather than continuing to label currency, deduction timing, zero under-seven-day refund, manual payout or holiday-date-only application unresolved.

## Itemized service quotes and weight proration — latest owner clarification

Specification: [booking-and-billing-requirements.md](booking-and-billing-requirements.md). The owner requested documentation updates only; the following cases are planned, not implemented or passing:

- QUOTE-01: accept supplied pet weight/unit and booking dates, select the correct approved boarding band and show dated itemized USD charges.
- QUOTE-02: prorate8–15lb from$52 to$58; test endpoints and midpoint11.5lb/$55 within the chosen band, plus fractional weights and the agreed cent-rounding rule.
- QUOTE-03: test every other printed numeric boarding range, fixed-price rows, explicit kg/lb conversion and unresolved/out-of-range boundary handling without extrapolation.
- QUOTE-04: include20% only on holiday dates, apply audited admin overrides with priority, show the complete total and deduct exactly that confirmed quote once.
- QUOTE-05: select a grooming store, appointment and service; itemize the applicable pet/weight/coat category, base price and selected add-ons.
- QUOTE-06: reject unavailable appointment resources/slots or incompatible/unconfigured service categories without reserving a slot or spending balance.
- QUOTE-07: reprice when weight, dates, service or add-ons change; require a fresh review when the server quote differs, preserving confirmed historical terms.
- QUOTE-08: exclude the owner-discarded$95 XL long-hair/double-coat bath row and retain$115; do not apply boarding proration to unrelated categorical service prices.

## Boarding-day balance tests — current required model

- DAYS-01: show/store boarding days separately from USD prices, with no generic-credit or dollar-wallet relabeling.
- DAYS-02: quote Monday-to-Tuesday as two billable days, calculate itemized USD charges and atomically deduct the correct day usage at booking.
- DAYS-03: charge20% only for configured holiday dates to the customer’s credit card, separately from day balances. Two holiday dates deduct2 boarding days plus the card fee; ordinary dates receive no holiday fee.
- DAYS-04: show ordinary/holiday day quantities, weight-prorated USD rates, any admin override, USD total and remaining days before confirmation.
- DAYS-05: restore the correct day quantity once for qualifying refunds; zero standard restoration for no-show/under-seven-day cancellation; use calendar-day notice.
- DAYS-06: reserve days for a bank redemption request; use the approved USD valuation, let admin record payment, and prevent double redemption or concurrent booking use.
- DAYS-07: release an unpaid cancelled/rejected redemption's reserved days once; do not restore already-paid redemptions.
- DAYS-08: preserve existing day ledgers and history, including when fractional-day support is added. Do not apply a dollar conversion or expiry by inference.
- DAYS-09: use separate, approved payment handling for grooming appointments; selecting grooming must not silently spend boarding days.
- DAYS-10: apply the final explicitly confirmed boarding-day expiry policy; the prior USD non-expiry statement is not sufficient to choose one.

These current cases replace conflicting USD-wallet assumptions; none is declared implemented/passing by this documentation update.

## Completion criteria

A group is complete only when its required journeys are implemented, pass against the real backend, preserve state after reload, and pass the required role/language/layout variants. API tests support browser journeys; they do not replace testing the UI. Document unresolved business expectations explicitly. An unavailable paid-booking control is a safe pending state, not proof of a working paid-booking flow.

No new commits, pushes, merges or deployment are authorized by this test plan.

## Additional planned cases — employee house scope and latest billing decisions

These cases are planned, not implemented or passing.

- HOUSE-EMP-01: an assigned employee can see the assigned house calendar and record actual drop-off/pickup with employee identity and history.
- HOUSE-EMP-02: another house is absent from employee operational views; direct API requests, changed house/room/booking IDs and private pet-info/photo requests cannot bypass house scope.
- HOUSE-EMP-03: assignment changes take effect on subsequent requests; stale tabs cannot complete an unauthorized handoff. An employee with no assignments has no house operations. Preserve independent customer/admin roles where applicable.
- HOUSE-EMP-04: house assignment grants no admin balance adjustments, customer impersonation, withdrawal approval or payout authority.
- ROUND-01: shared weight boundaries select the next higher bucket; test just below, exactly at and just above each defined boundary without inventing gap/out-of-range prices.
- ROUND-02: round base boarding-day usage up once for the entire stay; whole-day totals remain unchanged. Two holiday dates deduct2 days; holiday card fees do not inflate day usage.
- ROUND-03: floor exact-decimal USD amounts to cents, including a prorated amount with more than two decimal places; confirm itemized/total reconciliation after the rounding stage is decided.
- WITHDRAW-01: unused boarding days can be requested for withdrawal; no payment before admin approval. Approved valuation and manual payment are audited and cannot spend held days twice. Rejecting an unpaid request releases its hold once.

## Withdrawal valuation — latest owner decision

- WITHDRAW-02 (planned): administrator can choose original purchase price or deducted booking price as the withdrawal/refund payout basis. Verify the approved USD amount, source reference and selected basis are retained in history and survive reload; customer requests cannot select an unauthorized payout amount. Do not substitute current prices. Cover each basis, exact cent flooring and duplicate approval/payment retries. Multiple-rate allocation requires an approved rule before asserting an expected amount.

This documentation update does not implement or validate payout functionality.

## Newly confirmed flow cases — planned

- SAME-DAY-01: same-date drop-off/pickup deducts1 day; Monday-to-Tuesday deducts2.
- HALF-REFUND-01: eligible50% cancellation of a3-day charge restores1.5 days exactly once; whole-stay charge rounding must not round the refund up.
- HOLIDAY-CARD-01: admin configures holidays; mixed stays show20% card fees only on holiday dates and ordinary boarding-day deductions. Verify provider success/failure/retry and cancellation outcomes after those rules are confirmed; no double charge or falsely completed payment.
- EMPLOYEE-WEIGHT-01: assigned employee verifies weight and corrects a handoff, retaining original/corrected values and actor after reload. Unassigned employee is denied by backend.
- BATH-PRICE-01: XL long-hair/double-coat bath uses115USD; discarded95USD choice is absent. XL short-hair remains95USD.

## Payment options — planned coverage

- PAY-OPTION-01: grooming produces an itemized direct USD charge without changing boarding-day balances; verify payment success/failure/retry once provider rules are configured.
- PAY-OPTION-02: direct-paid boarding charges its USD quote without deducting prepaid days; prepaid-day boarding deducts days once and charges the holiday card fee separately where applicable. Preserve payment method and totals after reload.
- PAY-OPTION-03: purchase an approved discounted boarding-day package; retain USD purchase amount, discount/rate and day quantity, add days once after successful payment, and add no days for failed payment. Duplicate callbacks/retries cannot duplicate days or charges.
- PAY-OPTION-04: cancellation and admin-selected withdrawal valuation retain original payment/purchase references. Assert direct-payment refund destinations and insufficient-day mixed-payment behavior only after owner rules are confirmed.

These cases are planned and do not indicate completed payment integration.

## Fixed-price package savings — planned coverage

- PACKAGE-SAVE-01: show a30-day package’s configured fixed USD price and both dollar/percentage savings against30 days at the applicable regular pet rate. Use clearly synthetic fixtures, not invented business prices.
- PACKAGE-SAVE-02: changing the applicable pet/rate/category refreshes the comparison; missing/zero reference rates do not show fabricated savings or divide by zero. Respect USD flooring and the eventual percentage display precision.
- PACKAGE-SAVE-03: preserve purchased day quantity, fixed price and reference calculation after later price/weight edits; exclude separately charged holiday fees from unapproved savings claims.

These cases remain planned, not implemented or passing.

## Mixed boarding-day balance and card — planned coverage

- SPLIT-PAY-01: sufficient days cover ordinary boarding usage; card charges only any applicable holiday fee. No day balance supports all-card booking; insufficient days support balance plus card without requiring a package purchase.
- SPLIT-PAY-02: review shows covered/uncovered days, itemized card remainder and holiday fee, and post-booking balance; persisted booking/statement shows both payment portions without charging covered usage twice.
- SPLIT-PAY-03: decline, timeout, authentication challenge, retry, duplicate callbacks and concurrent balance/capacity changes cannot double charge/deduct or confirm an unpaid remainder. Reconcile provider success with interrupted booking persistence using the approved payment lifecycle.
- SPLIT-PAY-04: test fractional balances and dates with different rates after allocation rules are defined; test cancellation/partial refunds against original day/card portions after refund allocation is defined. Do not invent these financial rules in fixtures.

These are requirements for future executable tests, not completed integration.

## Pagination — planned coverage

- PAGE-01: navigate first/next/previous/last where supported and change page size on customers, pets and growing history/payment lists; verify correct ranges, disabled boundary controls and stable ordering.
- PAGE-02: apply search/filter/sort across the full permitted dataset, including a match beyond the first page; reset to the first page when criteria change and preserve criteria during page navigation.
- PAGE-03: verify backend authorization on every page for admin, customer and house-assigned employee; altered/reused cursors cannot expose another scope.
- PAGE-04: cover empty/single/partial/exact-size pages, loading, failed-page retry, stale responses, deleted records and dataset changes without showing another query’s results.
- PAGE-05: use keyboard and mobile controls in both languages; export all permitted filtered statement rows across pages and discover autocomplete matches beyond the initial page.

Planned requirements only; these are not declared implemented or passing.

## Balance pagination and admin Pricing — planned coverage

- BAL-PAGE-01: traverse first/next/previous/last balance and statement pages without duplicate/missing rows under stable ordering; show clear empty/loading/error states and prevent unavailable navigation. Use enough isolated fixtures for multiple pages.
- BAL-PAGE-02: apply customer/pet/date filters across the full dataset before pagination; retain filters between pages and reset to first page on filter changes. Backend cursors and direct requests must preserve customer ownership and impersonation scope.
- BAL-PAGE-03: handle balance additions/adjustments between page requests without stale-page errors; verify English/Chinese, keyboard and mobile usability, and export scope independently of the visible page.
- PRICING-01: admin can open Pricing and edit approved boarding rates, fixed-price day packages, grooming/add-on prices and holiday pricing/configuration. Validate missing/conflicting inputs, show calculated package savings, save/reload and retain actor/version history.
- PRICING-02: customers/employees cannot access admin price editing through navigation, deep links or direct API calls; switching roles/impersonation cannot retain unauthorized controls.
- PRICING-03: price edits do not mutate historical purchases/bookings/statements; new quotes use applicable current rules and stale quotes are rechecked before confirmation. Verify the discarded95USD XL long-hair bath rate cannot reappear as active pricing.

All cases are planned; none is declared implemented/passing by this documentation change.

## Navigation cleanup — planned coverage

- NAV-SETTINGS-01: no Settings button appears in desktop or mobile app navigation for admin, customer or employee contexts, in English or Chinese. Admin retains Calendar / Balances / Customers / Pricing; customer context retains Calendar / Balances / Pets. Required management workflows remain reachable from relevant feature pages, and My profile remains an account action.

Planned requirement only; no UI implementation or passing browser test is claimed.

## My profile role display — planned coverage

- PROFILE-ROLE-01: My profile displays correct backend-authorized role labels for admin, employee, customer and multi-role users in English and Chinese, with readable mobile layout. Roles are not editable through ordinary profile inputs or forged save requests.
- PROFILE-ROLE-02: current role changes are reflected after refresh/re-authentication as appropriate; impersonation clearly distinguishes actual user identity/roles from effective customer context.

These cases are planned, not implemented or passing.

## Material Design consistency — planned review and coverage

- DESIGN-01: review typography, spacing, alignment, hierarchy and consistent Material-style controls across calendar, booking, balances/pagination, customers/pets, Pricing, My profile and marketing. Remove repeated information; preserve explicit owner styling and navigation requirements.
- DESIGN-02: verify focus, hover, selection, disabled, loading, error and empty states; keyboard/touch operation, readable contrast, reduced motion and English/Chinese at desktop/mobile sizes. Automated checks support an actual localhost browser walkthrough; screenshots alone do not establish flow usability.
- DESIGN-03: verify white app content, matching light-green input borders, borderless dropdown items, non-red hover, dropdown exclusivity, readable single-border calendar grids and unclipped spacious booking dialogs.

These are planned checks, not completed visual validation.


## Executable local additions — 2026-11-18

- `tests/backend-browser/profile-roles.spec.ts`: actual emulator-backed Admin + Employee + Customer profile labels in English/Chinese during customer context, desktop/phone visibility, customer-only roles and backend admin denial, and unavailable role verification without blocking profile editing. This does not cover employee house assignment/operations or interactive Google popup completion.
- `tests/backend-browser/navigation.spec.ts`: Settings absent from the app header; Calendar location management and Balances cancellation editor remain reachable; Chinese phone management action stays accessible. Pricing tab/price editing remains pending.
- `tests/identity-api.test.mjs`: authenticated, private/noncached, read-only current-role response; caller-selected context is rejected and changed verified claims are reflected.
- `tests/browser/profile.spec.ts`: existing mocked profile save, draft retention, uncertain-save retry and mobile logout regression now uses the current API connection probe and profile route.

Validation scope: 64 unit tests, frontend production build and API TypeScript check. All six backend/browser journeys and the mocked profile journey passed in headed Chrome locally. Separate owner walkthrough is outstanding because both browser-control connections were unavailable. No commit, PR, push or deployment.


## Expanded local implementation — 2026-11-18

See [pricing, pagination and operations](pricing-and-operations.md) for the implementation boundary.

- Real-backend browser coverage now includes admin pricing/package savings/holidays, English/Chinese source pricing without daycare, customer/pet/balance/history pagination, complete filtered CSV exports, pet deep-link discovery, and employee assigned-house arrivals/pickups/weight verification/corrections with financial denials.
- Pricing integration tests verify immutable history, actual actors, concurrency conflicts and exact retry behavior. Employee integration tests verify original/changed values, private photo scope, unassigned-house denial, and denial of old-operation replay after assignment removal.
- The disposable browser fixture uses different canonical pets for employee verification and the original workspace regression, preventing cross-test weight changes from corrupting unrelated expected values. New pagination test pets receive private photos.
- All runs now use headless Chrome with temporary profiles. Earlier statements about headed defaults are historical and superseded by the latest owner instruction.
- Paid booking, purchase/deduction/refund/withdrawal execution, and expiry policy are not counted as implemented or passing. The admin assignment dialog for already-approved employees is now implemented and covered, including revocation and rejection of ordinary customer accounts. They depend on the decisions listed in the implementation note.

Final executed validation for this continuation: Node24.22.3 production build/API check,68 unit tests,13 Auth/Firestore integration tests,13 real-backend headless Chrome journeys and17 shared UI/profile/routing headless Chrome journeys all pass. The broader historical checklist is not thereby declared complete. No personal browser was accessed after the owner prohibited it; no commit, PR or deployment.

Employee-assignment additions: `employee-assignments.spec.ts` covers exact approved-user lookup, removing/restoring house access, employee-visible revocation, ordinary-customer rejection and Chinese phone dialog layout. Unit/integration coverage checks current administrator authorization, role-injection rejection, versions, immutable audit history, idempotency, competing writes and rechecking the target employee role. No real user or assignment is changed by these isolated tests.

Final expanded validation after assignment management and independent administrator fixtures: Node 24.22.3 production build and API check; **69 unit tests, 14 integration tests, 14 real-backend headless Chrome journeys and 17 shared UI/profile/routing journeys all pass**. Price/operations/assignment Chinese phone screenshots were reviewed. All Playwright runs use disposable headless Chrome profiles, never the owner’s personal browser. No commit, PR, push, merge or deployment.


Modal-scroll follow-up: five headless browser journeys cover modal-only wheel/touch scrolling, backdrop/boundary containment, nested-modal lock lifetime, and photo-viewer scroll-position restoration. Audit separately reproduced customer-selection loss and stale public-price fallback; those defects remain open, as does archived-package comparison blocking rate archival. The broader checklist must not be inferred complete from the passing selected runs.

Modal-scroll combined regression result:19 backend/emulator browser journeys plus 17 shared UI/profile/routing journeys pass in isolated headless Chrome (36 total), including all5 new scrolling cases. Production build and formatting checks pass. The three separately reproduced audit defects remain open; this result does not cover or fix them.


## Booking dialog scroll and progress regression — 2026-11-18

`tests/backend-browser/booking-layout.spec.ts` covers 390px English/Chinese phones and 1280px desktop. A test-only expanded availability response makes the room calendar taller than the viewport without saving invented rooms. Verify one dialog vertical scroll owner, a sticky title and step bar, no calendar vertical scroll range, aligned numbered markers and absolutely positioned connectors, distinct completed/current/upcoming colors, transition to review with scroll reset, and background scroll locking. Horizontal calendar panning remains available. Reviewed captured Chinese-phone and English-desktop screenshots. All 22 backend browser journeys and 17 selected date/dropdown/profile/routing journeys pass. The full legacy UI suite was not validated: older admin tests return 204 to the unauthenticated profile connection probe, which requires 401; those unrelated mocks were left unchanged. All runs use isolated headless Chrome. No owner browser session, commits, PRs or deployment.


## Shared Material UI and calendar coverage — 2026-11-18

`material-ui.spec.ts` walks English/Chinese phone and desktop pages with the real local backend. Opens booking, balance, validity-template management, customer, pet, pricing, holiday, house, employee-access, room and cancellation dialogs. Checks viewport containment, minimum label size, 4.5:1 primary text contrast, 44px close targets, action reachability, Escape and focus restoration; captures rendered pages/dialogs for inspection. Includes public routes, profile and operations after their content loads. The fresh fixture's prefilled profile is left without saving when navigating away.

`booking-layout.spec.ts` extends availability only in the test response to exercise long calendars and unavailable intervals outside both ends of the week. Checks shared axes and tracks align, spans stay inside the visible interval, adjacent rooms do not repeat their house heading, the entire modal scrolls vertically while its header stays fixed, and all four main-calendar views remain readable. The fall-back day includes 25 distinct hour ticks with GMT-7/GMT-8 labels on the repeated hour. `timeline-layout.test.mjs` covers boundary clipping, absent/invalid intervals, 23/25-hour days and unique local dates.

Validation: 27 backend journeys plus 17 selected shared-control/profile/routing journeys pass in isolated headless Chrome (44 distinct journeys); 73 unit tests and production build pass. The eight visual/calendar journeys are rechecked after the final typography adjustment. The older full legacy suite remains outside this validation; see the existing stale admin API-mock finding. No owner browser, commits, PRs or deployment.


## Booking overlap and clipping regression — 2026-11-18

Expanded `booking-layout.spec.ts` to 320/390/768/1280px, English/Chinese, long house/room names and five-minute stays. Verify labels fit inside growing rows, status and requested-stay lanes do not intersect, house labels fit their viewport, and horizontal panning does not let a request bar cover the sticky room column (actual hit testing). Intervals use a visible legend plus complete accessible names/tooltips rather than squeezing text into short bars. Inspect both initial and horizontally panned screenshots. Also checks wrapped step labels retain aligned markers at 320px. All 15 focused headless Chrome journeys pass (eight layout/view cases, five scroll cases, two saved-workspace workflows); production build and formatting pass. No owner browser, commits, PRs or deployment.


## Unified forest/sage palette — 2026-11-18

The four Material UI walkthroughs now check that both enabled and disabled primary actions actually render with the shared primary/on-primary or disabled/on-disabled roles, without faded labels. Existing contrast assertions cover those real colors. Dropdown hover expectations use the shared soft-sage role; invalid-date feedback has an explicit red-color regression check. All 31 backend journeys plus 17 selected shared UI/profile/routing journeys pass in isolated headless Chrome (48 distinct journeys). Build, changed-file formatting and whitespace checks pass; inspected English desktop and Chinese phone dialog/calendar screenshots. Layout and scroll regressions remain covered. No owner browser, commits, PRs or deployment.


## Warm palette and location hierarchy — 2026-11-18

The shared Material roles now use terracotta/peach/cream and warm neutrals, with independent green availability/completion. The existing color-pair and contrast assertions cover enabled/disabled actions and green availability versus requested-stay selection. House/room layout tests additionally assert localized kind captions, stronger/larger house titles, different house/room fills and room indentation in all four main-calendar views. Long-name and narrow-screen coverage still checks containment, no lane overlap and sticky-column hit testing after panning. Directory refresh now checks the intentional House prefix. All 31 backend journeys and 17 selected control/profile/routing journeys pass (48 distinct cases), along with production build, formatting and whitespace checks. Actual Chinese-phone/English-desktop screenshots were inspected. No owner browser, commits, PRs or deployment.


## Local workspace polish validation — 2026-11-19

79 units, 17 named Auth/Firestore integrations, API type check, build and formatting pass. New chart journeys seed explicitly labelled isolated customer/pet/credit/stay records, exercise nonzero aggregate graphs, keyboard/data-table access, exact Pricing tab-style reuse, icon names and grouped/collapsible filters in English desktop and Chinese phone. Shared fixture customer count is dynamic so complete-picker assertions remain exact after test-created customers. Theme icon checks locate Add booking semantically after its calendar-toolbar move.

The 64-journey broad Chrome run passed 54, with six interrupted/time-sensitive journeys and four obsolete toolbar selectors failing. All 10 pass on focused recheck after the selector correction. This covers every current backend journey across the combined runs, rather than claiming one uninterrupted green run. Actual read-only localhost:4180 Chrome walkthroughs cover Metrics/Activity/Calendar/Customers in both languages/sizes; screenshots are in docs/review/workspace-polish-2026-11-19. No owner records were changed. No commits, pushes, PRs or deployment. Automatic booking charges/refunds remain unimplemented and are not claimed by the existing unbilled-plan cancellation tests.


Calendar delivery follow-up: first CI passed 61/62 journeys but exposed a pet hover card reopening after Escape. Explicit dismissal now persists until a fresh interaction. Two bilingual regression journeys pass five repeated runs each; real populated localhost checks and both complete saved-workspace journeys pass. PR #166's revised CI passes all 64 journeys. With the two new Metrics chart journeys, the combined suite contains 66; consult the Metrics PR's final CI for its full-run result.


Final integrated local validation passes **all 66 backend Chrome journeys in one uninterrupted 3.8-minute run** after the hover dismissal fix and Metrics chart integration. This supersedes the earlier interrupted-run coverage notes for the current source. The final Metrics PR's full CI remains required before merge.


## Dashboard consistency and presentation samples — 2026-11-19

81 units, build/API/format checks and a stable 70-journey local Chrome run pass. After compact date presets and category table headings, all six final dashboard journeys pass (four themes, English/Chinese, 320px/390px/1440px). These check coherent sample totals, visible source/selection states, no Metrics API reads or business writes in samples, exact category headings, saved-record restoration, revenue remaining unavailable for genuine records, readable contrast and equal card widths. Sample unit tests verify additive totals, stable snapshots and no recorded future receipts/handoffs. The combined current suite has 72 journeys; final PR CI must run all of them before merge. Read-only populated localhost walkthroughs verify default demo samples and switching to actual records on desktop and phones, including 320px. Screenshots: docs/review/dashboard-cleanup-2026-11-19. No default-database resets, financial activation or deployment.
