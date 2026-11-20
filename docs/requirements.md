## Current owner requirements — calendar, pets, pricing and Spanish, 2026-11-20

- Share Previous / Today / Next, date heading, day/weeks/month/year views and display timezone controls between the main and Add booking calendars. Display timezone changes must not change entered stay times.
- In Add booking, remove available-space shading and its legend entry. Keep unavailable ranges and requested stay. An unavailable room shows neither Choose nor Requested stay. Label room-selection actions Choose.
- Show an itemized normal-day, holiday-day, separate holiday surcharge and total cost estimate at Review, using configured rates and house-local inclusive calendar dates. Missing rates remain unavailable. This presentation does not activate payments, balance deductions or unresolved mixed-payment rules.
- Calendars show status/holiday annotations and a live Now marker. Their date/time axis remains sticky and aligned while scrolling the calendar.
- Customer view (including administrator view-as) shows other customers' occupied rooms/time ranges as Busy, without exposing their identities, pets or booking details.
- Activity includes booking and cancellation records alongside balance changes, newest first with deterministic backend pagination. Existing unbilled bookings must never look like day deductions or refunds. Preserve historical activity and retry behavior.
- Customer hover corners match selected-row corners. Pet names/photos open an information dialog with information, bookings, balance and activity. Show species icons and use matching administrator/customer pet-row geometry.
- Pricing edits group language labels clearly. Public pricing has readable, aligned amounts and responsive sections. Preserve supplied prices and existing saved labels.
- Support English, Simplified Chinese and Spanish across app/marketing content, language menus, forms, validation, tooltips and price labels. Translate supplied descriptions, preserve custom business labels until a translation is supplied, and retain existing profile-language compatibility.
- Use recognizable icons wherever useful, retain clear primary-action text, and provide accessible names/tooltips for icon-only controls. Preserve responsive layouts, existing features and Google Cloud hosting.

## Shared form polish, aligned actions and customer context — 2026-11-20

Remove the extra content-area border in Add balance, Add/Edit customer and Add price dialogs using the shared dialog/form styling. Use meaningful icons alongside action labels where possible. Enabled buttons/controls need reasonable theme-aware hover feedback; language-menu surfaces, selection and hover must match the chosen app theme. Leave space between customer-row hover backgrounds and dividers. Align customer search controls with Add customer, and group Pricing actions with Add price rightmost. Administrator customer view needs a persistent banner naming the customer and a clear return-to-admin action, including on failed reads, without changing actual identity or permissions.

## Retire management pages and compact Calendar — 2026-11-20

Remove capacity text from calendar rows while retaining capacity rules and room editing. Order time controls as Previous/Today/Next, date heading, view choices, timezone.

Remove House operations and Calendar settings/location pages and both Calendar toolbar links. Redirect their old URLs to Calendar, retain cancellation configuration and house/room row editing, and preserve stored records/backend authorization. Employee-only accounts retain personal profile access. Make Calendar filters compact on desktop/phone. Timezone remains a presentation control outside filters, with no visible label and an accessible name. Keep navigation/date heading/timezone/view choices together, with Add booking separate; remove the current-date input.

## Shared controls, readable tabs and saved Metrics — 2026-11-19

Use the same components for the same functions across pages. Calendar, Pricing, Balances/Activity and Metrics period presets share segmented-control behavior and styling. Selected Apple controls are red with white text; Microsoft Light uses blue with white text. Inactive labels are bold. Preserve tab semantics for page panels and pressed-button semantics for reporting-range filters. The English page/navigation name is Metrics (Chinese 指标).

Remove Metrics' saved/sample switch. Populate the local demo database with labeled fictional records instead and read them through the regular aggregate API. Preserve existing records and never seed production. Do not fabricate revenue or financial workflows to match an old presentation sample. Calendar timezone controls display, stays outside collapsible record filters, and has its label to the left. Group navigation, date heading, timezone and view choices together; put booking and management actions separately. Keep one desktop toolbar row, allow phone wrapping, remove the current-date input, and render a smaller complete settings icon with a 44px target. All Playwright validation runs headlessly.

## Dashboard consistency and realistic preview values — 2026-11-19

Use consistent snapshot/chart cards, filter controls, spacing, typography and responsive graph labels throughout Metrics. Every chart needs a meaningful reporting-period total and readable point details. Local previews should have realistic, coherent, explicitly labeled sample values across all charts, with saved records available separately. Do not represent synthetic values as business records, prices or received revenue. Production continues to use recorded aggregates. No business-data reset or financial workflow activation is authorized by presentation sampling.

## Current requested workspace changes — 2026-11-19

The owner requests Metrics as the first tab with revenue, balance, bookings, customers and service-usage graphs; Pricing-style Balances/Activity tabs, compact icon actions, centered button contents, separated/grouped calendar filters, and clearer Activity. These are implemented locally pending final validation. Existing timezone cleanup/date/Now behavior, house Add room +, tighter settings/+ spacing and compact Customers remain required. Latest delivery instruction authorizes focused signed commits and PRs; deployment remains deferred.

Automatic booking deductions and cancellation restoration are requested but **not yet implemented**. Retain explicitly unbilled staff plans until the relevant outstanding financial facts are supplied. Day deduction at confirmation and normal/refund day quantities are already confirmed; remaining returned-day validity, payment lifecycle, mixed allocation and package-expiry facts must not be invented. Revenue charts must explicitly show unavailable until recorded payments exist. Current balance totals are snapshots; net-change graphs must not be presented as historical stock or spendable-day totals.

## Workspace usability and business metrics — 2026-11-18

Owner request: replace the house address icon with + for Add room, make Balances/Activity intuitive, provide a Business metrics tab, and make Customers clean and compact. House names retain address access. Balances and Activity have separate retained-filter views and per-pet history shortcuts. Customers retains search, contact edits, linking, view-as, pagination and pet deep links in a compact master/detail presentation. Business metrics is administrator-only, uses complete backend aggregates and separates planned/actual handoffs and period/current totals. Revenue remains unavailable until payments are configured; no new financial rules are implied. English/Chinese and mobile/desktop are required throughout. See the current handoff for sequential PR and deployment status.

# Product requirements

## Current owner theme direction — familiar apps, complete components, readable text

Use named presets matching familiar apps' colors and component styling: Google (default), Apple, Microsoft Light and Microsoft Dark. Curate away extra editor/terminal options and replace the invented palette collection and separate Soft/Clean switch. Apply each theme consistently to every app component family, including typography, surfaces, borders, geometry, focus, hover/selected/disabled/validation states, calendars, forms, dropdowns, tables, dialogs and feedback. Text and content must remain very readable; verify contrast and wrapping on mobile/desktop and both languages. Keep the shared house/room hierarchy, modal scrolling and existing business workflows. Marketing keeps its original colors and has no theme control. This clarification supersedes earlier palette/style suggestions below.


## Crafted theme direction — implemented locally

Refine every app palette and style as a complete visual composition, drawing on strong product design and editor/terminal theme references (VS Code, Sublime Text, JetBrains and terminal themes). Coordinate neutral surfaces, contrast, interaction accents, parent/child hierarchy, borders and depth. Provide palette previews that demonstrate actual component relationships. Soft/Clean must differ in elevation and borders as well as corners. Keep the existing warm default, white work areas, bilingual usability and independent status colors. Marketing retains its previous colors and no theme control.

## Appearance customization — implemented locally

Appearance controls and preferences apply only to `/app/` routes. Public marketing navigation has no theme button and retains the original forest/porcelain colors and shapes. Route changes remove app appearance attributes on public pages and restore the saved choice when returning to the app; storage events never recolor public pages.

Provide bilingual browser-local Appearance controls for changing colors and component styles. Warm/Soft remains the default; offer Warm, Blue, Forest and Iris colors with Soft/Clean corners, immediate preview, persistence across pages/reloads, tab synchronization and reset. Explain when unavailable browser storage makes changes session-only. Preserve accessible status colors and visually distinct house/room identities in every preset. This is a personal browser preference, not an account or organization branding setting.


## Latest owner design direction — clean, clear Material Design

Use **Material Design** as the shared UI standard across the app and marketing site, while preserving the owner’s explicit requirements and brand style. This is a visual/interaction requirement, not authorization to replace the technology stack or add a component library.

- Use consistent typography, spacing, alignment, component sizing and clear visual hierarchy. Keep labels, instructions and primary actions concise; remove repeated information and unnecessary decoration.
- Apply consistent Material-style fields, custom dropdowns/autocomplete, date pickers, buttons, tabs, dialogs, tables, pagination, tooltips and feedback. Keep controls recognizable, with visible focus, selected, disabled, loading, validation and empty states.
- Preserve white app content below navigation, consistent warm neutral input borders matching search fields, terracotta focus and peach selection, borderless spaced dropdown items, non-red dropdown hover, and only one open dropdown. The owner’s latest 2026-11-18 warm-style instruction supersedes the earlier cool Google-blue and light-green color choices. Use color consistently and maintain readable contrast.
- Make houses and rooms visually distinct in both calendars and location management: stronger full-width parent house headers, lighter indented room rows, recognizable roof/door icons and bilingual type captions. Do not rely on color alone.
- Maintain compact readable calendar grids with single continuous borders, clear dates/statuses/availability and accessible pet details. Keep booking dialogs spacious and readable with viewport clearance and unclipped fields.
- Preserve responsive desktop/mobile layouts, keyboard and touch usability, accessible names, readable text sizing and bilingual English/Simplified Chinese content without clipping. Use restrained motion and respect reduced-motion preferences.
- Review complete user flows, not isolated components, so navigation, forms, pricing, balances, calendar and profile feel consistent and easy to understand. Material defaults must not reintroduce removed Settings navigation, duplicate headers or unwanted booking fields.

Documentation only; implementation and visual/browser validation remain future work. No code, commits, pushes or deployment.


## Latest owner requirement — roles on My profile

My profile must show the signed-in user’s assigned role or roles (Admin, Employee, Customer), using clear localized labels in English and Simplified Chinese. Show all applicable roles for a multi-role identity, based on trusted backend authorization data rather than a user-editable profile field. Viewing a role must not allow self-promotion. During impersonation, distinguish the actual signed-in user’s roles from the customer context so the profile does not misrepresent identity or authority.

Documentation only; no application/test implementation, commits, pushes or deployment.


## Latest owner navigation clarification — remove Settings button

Remove the **Settings button from the app navigation bar**. Admin primary tabs are Calendar / Balances / Customers / Pricing; customer-context tabs remain Calendar / Balances / Pets. This supersedes earlier instructions to show Settings in navigation. Keep existing required management workflows reachable through their relevant feature pages; removing this button does not remove those requirements. My profile remains a secondary account action.

Documentation only; no application code, commits, pushes or deployment.


## Latest owner requirements — balance pagination and admin Pricing tab

- Add **pagination to the Balances page** for growing balance records and statement/history lists. Apply customer/pet/date filters before pagination, retain filters while changing pages, and reset to the first page when filters change. Use stable ordering and backend pagination so the UI does not need to download every record. Handle empty results, first/last pages and loading/errors clearly.
- Add an **admin-only Pricing tab** alongside Calendar, Balances and Customers. Keep customer-context navigation Calendar / Balances / Pets; do not expose admin price editing to customers or employees. Enforce administrator authorization on the backend.
- Pricing provides a focused place to manage boarding weight-band rates, fixed-price boarding-day packages and their derived USD/percentage savings, grooming/service/add-on prices, and holiday surcharge pricing. Admins also configure holiday dates. Preserve owner-approved facts, required validation and audited changes; do not invent missing rates.
- Price changes must not silently rewrite purchased packages, confirmed bookings, payment allocations or historical statements. Recheck current quotes before new booking/purchase confirmation. Effective-date and treatment of existing unconfirmed quotes remain to be specified.

Documentation only; no application/test code, commits, pushes or deployment.


## Latest owner requirement — pagination

- Paginate growing record lists, including customers, pets, balance/statement history, booking history and administrative payment/withdrawal lists. Calendar date navigation remains separate from record-list pagination.
- Provide clear page navigation and range/count information where available, with a consistent page-size control and accessible labels in English and Simplified Chinese. Actual page-size defaults are implementation choices, not business facts.
- Apply search, filters, sort and role/customer/assigned-house authorization **before** pagination on the backend; do not download every record merely to paginate in the browser. Use deterministic ordering and stable continuation/cursor handling.
- Preserve active filters, sort and page size while navigating; changing search/filter/sort resets to the first page. Handle loading, errors, empty results and deleted/moved records without misleading stale rows or duplicate/missing results in an unchanged dataset.
- Pagination must not limit complete filtered statement exports or autocomplete discovery: exports cover the permitted filtered dataset, and autocomplete must allow discovery beyond its first result page.

Documentation only; no code, commits, pushes or deployment.


## Latest owner confirmation — balance plus card payment

- A customer can pay for a boarding booking using their available **boarding-day balance**, then pay the uncovered portion by **card** when that balance is insufficient. This is supported mixed payment, not a requirement to buy another package. Direct all-card booking remains supported.
- Show total boarding-day usage, days covered by balance, uncovered usage, itemized USD card amount, separate holiday card fee and expected remaining day balance before confirmation. Do not charge the card for the portion already covered by days.
- Holiday additional fees remain card charges even when the available day balance covers the full ordinary stay. Grooming remains directly charged.
- Record both payment portions and preserve original rates, day deductions and card-payment references. Prevent duplicate card charges, duplicate deductions and booking confirmation with an unpaid remainder. Coordinate capacity, balance reservation and payment success; failed payment must not leave a confirmed unpaid booking or permanently consume days.
- Exact allocation of available days across differently priced dates, fractional-day shortfalls, mixed-payment cancellation/refund allocation and provider/payment timing still need approved rules. Do not assume which dates a day balance covers or silently convert one day to a fixed dollar value.

Documentation only; no code, commits, pushes or deployment.


## Latest owner clarification — fixed-price boarding-day packages

- Package discounts use a **fixed purchase price for a defined number of boarding days**, such as a30-day package; they are not primarily entered as a percentage discount. Actual package prices remain owner-configured.
- Present package day quantity, fixed USD price, and savings as both a **USD amount** and a **percentage**, compared with the equivalent regular boarding price for the same pet/pricing category.
- Calculation: regular equivalent total = package day quantity × applicable regular daily rate; USD savings = regular equivalent total − fixed package price; savings percentage = USD savings ÷ regular equivalent total ×100. Do not invent rates or compute a percentage with a zero/missing comparison price.
- Preserve the package price and comparison-rate inputs used at purchase. Holiday card fees remain separately itemized and must not be represented as included package savings without an approved rule.
- USD amounts follow the confirmed cent-flooring rule. Savings-percentage display precision and package eligibility/price tables still need specification.

Documentation only; no code, commits, pushes or deployment.


## Latest owner confirmation — direct charges and discounted boarding days

- Grooming charges the customer directly in USD; do not spend boarding-day balances on grooming.
- Boarding supports **direct customer payment** for the itemized stay, or use of **prepaid boarding days purchased at a discount**. A direct-paid stay must not also deduct prepaid days. A day-funded stay deducts its confirmed day usage when booked.
- Holiday additional fees remain separate credit-card charges on configured holiday dates, including for prepaid-day bookings.
- Fixed package prices, eligible day quantities/tiers and purchase terms must be configured from owner-approved facts; do not invent them. Show derived USD and percentage savings against equivalent regular boarding pricing. Retain purchase price, discount and day quantity for statements and admin-selected withdrawal valuation.
- Payment provider/timing and failure/refund rules for direct payments, day purchases and holiday card fees still require decisions. Mixed day-plus-card payment for insufficient days is confirmed; direct-paid cancellation refund destination and mixed-payment refund allocation remain unspecified.

Documentation only; no application/test implementation, commits, pushes or deployment.


## Latest owner confirmations — holiday card fees and employee permissions

- Same-date drop-off and pickup costs **one boarding day**. Monday-to-Tuesday remains two.
- A50% refund of3 deducted boarding days restores **1.5 boarding days**, without rounding that refund up to a whole day.
- Administrators configure holiday dates. The additional20% holiday fee applies only to holiday dates and is charged to the **customer’s credit card**, separately from boarding-day balance. This supersedes holiday surcharge deductions in boarding days and the earlier1.2-day examples. Round base boarding-day usage up once for the entire stay. A two-date stay deducts2 boarding days even if both dates are holidays, plus the itemized holiday card fee. Card-payment provider, collection timing, failure handling and holiday-fee refund terms still need decisions.
- Employees assigned to a house may verify pet weights and correct actual drop-off/pickup records for that house. Retain original values, corrected values and responsible employee in history; enforce assigned-house scope on the backend.
- Discard the **$95 X-Large Dog – Long Hair / Double Coat** bath row. The **$115** row remains; the separate$95 XL short-hair row is unchanged. Preserve info/parsed.json as the original transcription.

These are documentation requirements, not implemented or tested functionality. No code, commits, pushes or deployment.


## Latest owner decisions — 2026-11-18 (takes precedence)

- Employees are assigned to houses. Scope employee calendar/operational access and actual drop-off/pickup to assigned houses, with backend enforcement. House assignments do not grant administrator financial permissions. Assignment management and correction/weight-verification permissions remain unspecified.
- Weight boundaries use the next higher bucket (the shared8lb boundary selects8–15lb). Do not invent rates for gaps/out-of-range weights.
- Sum boarding-day usage for the entire stay, including holiday adjustments, then round up once to a whole day; never round each day separately. Floor USD amounts to the nearest cent. Partial-refund rounding and USD flooring stage remain to be confirmed.
- Unused boarding-day balances are withdrawable with administrator approval. Admin pays externally for now. For withdrawal/refund payout valuation, admin chooses the original purchase price or deducted booking price; retain the selected basis and calculation in history. Multi-rate allocation remains unspecified.
- Boarding-day expiry is still unconfirmed. Balance is boarding days, while prices/payments/payouts are USD.

Documentation only; no application/test implementation, commits, pushes or deployment. See [consolidated requirements](booking-and-billing-requirements.md).


Canonical requirements, consolidated from owner instructions through 2026-11-16. Later explicit owner decisions supersede earlier proposals in historical handoff entries. “Confirmed” describes requested behavior, not implementation status. Do not invent unresolved business rules or treat example numbers as real rates/capacities.

## Current focus and delivery

- Preserve the current house/room implementation as **WIP**. PR #41 is draft and must not be merged as completed work.
- Start a clean branch from main for **calendar and balance management**, without importing unfinished room code. Record requirements before implementing.
- Develop and validate locally, one focused feature/PR at a time. Deploy once all requested features are complete; no intermediate deployments.
- Use Google Cloud: Firebase Hosting, Firebase Authentication, Cloud Run API and Firestore; private pet photos use Google Cloud Storage. Do not switch to Sites hosting.
- Target main through PRs, never direct pushes. Use authorized signed commits and confirm GitHub verification before merging. Owner has authorized routine validated merges.
- Actual localhost Chrome walkthroughs are required, alongside relevant tests. Keep English/Simplified Chinese, phone/desktop usability, existing records and working features.
- SWC migration was cancelled. Keep the existing Vite and tsc checks.

## 1. Roles, accounts and privacy — confirmed

- One shared Google sign-in supports administrator, employee and customer roles; one identity can have multiple roles and own pets.
- Customers access only their own profile, pets, packages/balances, bookings, calendars and history. They cannot edit roles or balances.
- Employees access necessary operational information and record actual handoffs. Employees are assigned to houses; some operational permissions remain undecided.
- Administrators manage customers, pets, houses, rooms, business rules, balances and operations across houses.
- Enforce current roles and record ownership on the server, including image reads. UI visibility is not authorization.
- Maintain one canonical customer/person and stable pet records. No automatic merging/linking by editable name/email.
- Preserve existing administrator-managed contacts, self-registration, explicit personal/admin workspaces, private optional photo upload and administrator-approved Google-account linking.
- Changes/corrections retain appropriate history and responsible actors. Never store credentials or customer secrets in project documentation.

## 2. Pets, photos and weight — confirmed

- A customer may have multiple pets. Supported species: **dog, cat and rabbit**.
- Each pet has its own name, profile, calendar and visit history; maintain stable ownership/reference IDs. Use the pet’s saved profile photo rather than a first-letter avatar in the calendar, scheduling and balance views; preserve private access and neutral no-photo fallbacks.
- Admin approves a pet’s weight or verifies it during drop-off; retain verification actor/date and distinguish entered from verified weight.
- All test pets must have photos. Use cloud-sourced photos, not bundled/hardcoded pet images; preserve existing uploaded photos.
- Downloaded test library: 300 licensed photos, 100 per species, in the private development GCS bucket. Local demo has 100 fake families and 300 photo-complete pets. Retain attribution/source/license metadata and label samples as test photos.
- Do not misrepresent stock photos as real pets or overwrite real photos. Policy for real pets with missing photos is unresolved. Earlier “name sufficient, photo later” behavior remains until a replacement policy is approved.

## 3. Houses, rooms and capacity — confirmed latest model

- Manage multiple houses, each with its own rooms, required address and timezone. Legacy houses missing an address must be visibly flagged for completion; Calendar provides a saved-address view. Provide create/remove house and add/remove room actions; permanent deletion/history semantics still require a production policy. Prototype removal is limited to empty locations.
- **No individual spaces/slots as managed entities.** Earlier House → Room → Space proposals are superseded by **House → Room**.
- Houses UI is split: house/room selection on the left; selected room’s details and capacity rules on the right. Stack sensibly on phones.
- Each room has a **maximum capacity**, not just a fixed pet count.
- Admin configures capacity consumed by pet **category/type/weight group**.
- Admin may set a **custom capacity for an individual pet**, overriding its applicable group rule. Show whether group rule or override applies.
- Each room hosts **one species at a time**. Pets of different species cannot have overlapping occupancy in the same room even when capacity remains.
- A room can switch species between **non-overlapping stays**; it is not permanently assigned to a species.
- Total concurrent pet capacity usage cannot exceed the room’s maximum.
- Admin adjusts applicable constraints/closures through UI. Show affected future bookings before changes that would cause conflicts; exact change policy remains unresolved.
- Provide a dynamic house map for a selected date/time, plus room timelines, to inspect occupancy and help optimize placements. No required dragging; provide tap/click/keyboard actions and mobile room-list access.
- Distinguish planned occupancy from actual presence. Keep overdue pets visibly in care until pickup is recorded.
- Actual business addresses, room capacities and capacity group values remain unconfigured. Owner-supplied poster prices/ranges and policies are recorded in info/parsed.json; currency code, conflicting rows and charging mechanics still need resolution. Do not treat fictional sample values as approved business rules.

## 4. Customer calendars, timeline and availability — confirmed

- Every pet has a calendar. Each customer also sees a combined timeline of their own pets, with pet filtering and upcoming/past visits.
- Customer chooses the pet, service/house as applicable, and planned drop-off and pickup dates/times.
- Customer can see availability suitable for the pet for the **whole requested period**. Do not expose other customers’ pets or private internal assignments.
- Review booking details, required days, applicable holiday charges, package coverage and balance before submission.
- Customer must prepay sufficient valid boarding balance before booking. A boarding booking costs balance; cancelling restores the amount determined automatically by cancellation date/policy. Avoid spending the same balance or reserving the same capacity twice. Exact refund cutoffs/unit details require the decisions below.
- Maintain booking status and history; exact approval/hold lifecycle remains undecided.
- Keep selected booking details when a package purchase is needed.
- Do not advertise a working paid booking/refund flow before its dependencies and approved rules are implemented.

## Latest balance clarification — takes precedence

Owner explicitly confirmed **boarding days** after rejecting USD and generic credits. Pricing remains USD. Deduct boarding days when booked; qualifying cancellation restores days; manual bank redemption converts days to USD under a rule still to be defined. Never interpret days as dollars or generic grooming credits. The20% holiday-day adjustment implies fractional boarding-day usage, with precision to specify. Monday-to-Tuesday counts as two billable days and cancellation notice uses calendar days. The prior “USD never expire” statement does not decide expiry for boarding days; confirm its relationship to earlier first-use/validity rules. Documentation only; no coding.

## Latest financial decisions — 2026-11-18 (override earlier unresolved notes)

Full consolidated specification and all supplied poster tables: [booking-and-billing-requirements.md](booking-and-billing-requirements.md). Latest owner instruction is documentation only; do not code.


- **Updated:** pricing is USD; customer/pet balance is boarding days. Earlier USD-wallet wording is superseded. Preserve day records and represent monetary quotes/payouts separately.
- Deduct the calculated boarding-day charge atomically **when the booking is confirmed**, alongside its itemized USD quote. Explicit administrator overrides take precedence over ordinary configured rules and must be audited.
- Every calendar date throughout the year is billable; do not exclude weekends/months. How partial/same-day stays become billable units is still awaiting confirmation.
- Cancellation refunds generally restore boarding days to balance. No-shows and notice under seven days receive no standard refund. Existing confirmed headlines remain full refund at14 days and half at7 days; exact notice-day calculation still needs confirmation.
- Customers may request redemption of boarding days into a USD bank payment; conversion needs definition. For the current phase, an administrator pays externally and records the result; payment-provider integration is later. Reserve requested money to prevent simultaneous booking spend, and restore it if a request is rejected/cancelled without payment.
- The poster's20% holiday surcharge is charged to boarding-day balance and applies **only to holiday dates**, not every date in a stay. Admin-configured actual holiday dates remain necessary.
- Use the owner-supplied prices in info/parsed.json and reflect them on the marketing site. USD is now confirmed even though the original transcription's currency_code is null. Prorate numeric boarding price ranges by pet weight within the selected band. Preserve overlapping weight boundaries/conflicting categorical rows for review; do not silently resolve them.
- Remove daycare as a service; retain pet boarding. This does not remove separately requested grooming, drop-in visits, dog walking or academy content.

## 5. Packages, prices and balances — confirmed

- Packages contain **30 days**.
- Prices depend on pet type and the supplied weight bands. Latest clarification: numeric boarding price ranges are prorated by weight within the band; do not multiply the band price directly by weight.
- Customers prepay days before booking. Actual payment method/confirmation remains undecided.
- Packages last **three months from first use**, not purchase or booking creation. First use refers to the first day of care covered by the package; exact activation/expiry boundaries still need decisions.
- Latest owner simplification: balance setup uses one explicit valid-from/valid-through date range and reusable named policy templates. Remove the separate eligible-month selector/check; do not combine overlapping month and date policies. January–September was an earlier example, not a default.
- The reviewed validity range must cover the whole stay, including extensions.
- Display remaining days, activation/expiry, date coverage, price/weight band and relevant terms clearly.
- Only boarding balance is supported. Remove daycare from balance management and stay scheduling. Use Add balance, not Set up balance. Preserve per-pet isolation.
- Admin manages package prices, terms and balance adjustments in the UI. Preserve adjustment history.
- Customer balance management/validation is per pet and service. Adjustment reasons are optional. Show credit adjustments/history and coverage status in the scheduling review, without borrowing another pet or service’s days. Automatic counting and reservation/consumption rules remain unresolved; the current booking dialog omits manual required-day and capacity-override inputs (owner direction, 2026-11-18). It saves a local schedule after time/room-capacity checks, displays N/A for uncalculated day usage, and does not deduct or reserve balance days. Previously reviewed planning allocations remain readable.
- Provide a Transactions / Statement page with customer/pet/date/activity filters, per-entry balance after the change, detail dialogs and filtered CSV export. Show only recorded activity; no invented booking charges/refunds.
- Balance operations and usage must be atomic, concurrent-safe and idempotent. Usage references customer, pet, service/date, consumed units and recording actor.

Proposed UX, not a resolved deduction policy: show **available**, **reserved for upcoming stays**, and **used** days. Preserve historical purchase/booking terms by default; effective dates and retroactive changes need approval.

## 6. Holiday rates — confirmed

- Holiday dates have holiday rates.
- Admin configures holiday dates, applicable scope and rate rules through the UI.
- Identify holiday dates and explain charges before a booking or extension is confirmed.
- Surcharge mechanism, actual dates/rates, overlapping holidays and package interaction remain unresolved.

## 7. Cancellations and refunds — confirmed policy, unresolved details

- Provide a dedicated Cancellation policy page and a separate Transactions / Statement page with navigation from the calendar and balance management. Policy edits use a focused dialog; unresolved rules stay unconfigured, and no draft activates financial operations.

- Cancellation 14 days ahead receives a **full refund**.
- Cancellation seven days ahead receives a **half refund**.
- Show exact deadline and refund consequences before the customer confirms cancellation.
- Retain cancelled visit history and release its reserved capacity consistently with the approved lifecycle.

Proposed cutoff interpretation, awaiting confirmation: at least 14 days before scheduled drop-off → full; seven to fewer than 14 days → half. Do not invent the under-seven-day/no-show policy or whether refunds return money or package days.

## 8. Extensions — confirmed

- Customer can extend sitting time if suitable room capacity is available for the additional period.
- Respect one-species occupancy, capacity group/override usage, package validity and holiday rules.
- Show additional days/charges and require sufficient prepayment before acceptance.
- Leave the original booking intact if an extension fails or is unavailable.
- Update accepted time/capacity/balance changes together; approval and cancellation treatment for extension days remain undecided.

## 9. Employee handoffs — confirmed

- Employee records **actual** drop-off and pickup times, separately from planned customer times.
- Record responsible employee; retain correction history.
- Proposed convenient UI: today’s expected arrivals, pets in care and expected pickups, with clear Record arrival / Record pickup actions and default current time.
- Support recording an earlier actual time when a handoff is entered later, subject to approved correction permissions.
- Show overdue pickups and distinguish actual occupancy from schedule predictions.
- No separate attendance page is required; handoff details appear in relevant visit/operational views.

## 10. Admin overview and placement — confirmed

- House calendar UX: House → Room → Pet hierarchy, one row per pet, horizontal timeline with day/weeks/month/year tabs, visible Now marker and actual check-in status. Prototype with clearly labelled fictional data before connecting business workflows.

- Provide combined all-house and individual-house overviews.
- Show arrivals, pickups, pets in care, capacity, requests requiring action, unassigned pets and conflicts as applicable to the approved lifecycle.
- Calendar/timeline supports reviewing all bookings, with a dedicated Filters section for house, room, customer, pet type, pet name and status, plus clear/reset. House/room gear icons open their editable settings directly in focused dialogs.
- Add pet uses a room/date calendar for scheduling. Shade unavailable room/time ranges gray as continuous timeline bands, including partial days, with explanations, and recheck the entire requested stay before accepting.
- Add/remove timed pet placements from rooms. Select the pet and complete stay period first, then disable unsuitable houses/rooms and explain availability conflicts. Removing a placement must not delete the pet profile. Inspect occupancy over time; schedule moves only under approved policies.
- Placement optimization is requested. Explainable admin-reviewed suggestions are a proposed later implementation, not an approved automatic-movement policy.

## 11. Admin settings and customer preview — confirmed

- Configure business rules in UI rather than code: package prices/weight bands, validity templates, holidays, cancellation/refund rules, booking/extension rules, room capacities and pet capacity groups/overrides, applicable constraints, and employee access.
- Validate contradictory ranges/rules and show a clear preview before applying changes. Record who changed rules and when.
- Admin can confirm a customer’s view. Plan read-only preview separately from acting on behalf of a customer.
- Acting as a customer requires server-authorized scoped impersonation, a persistent target banner and obvious exit, current admin-access checks, and actual-admin/effective-customer audit identities.
- No exposure of passwords, Google-credential changes or silent role grants.

## 12. UX requirements

Latest approved clean design (2026-11-16; supersedes earlier navigation proposals):
- Four destinations: Calendar, Customers, Balances, Settings. Compact sidebar on desktop, bottom navigation on phones; account menu and language selector in the header.
- Calendar is the visual standard for the entire app. Keep the marketing design distinct, while sharing branding, sign-in and language preference.
- Calendar has a compact filter section and one primary scheduling action. Remove its global Boarding balances button; preserve pet-specific shortcuts. Stay details use a side panel on desktop, with accessible mobile/keyboard behavior.
- Customers has customer/pet filters and an Only my pets ownership filter, customer list at left, selected details and pet cards at right; phone list/detail navigation and focused editing dialogs.
- Balances uses one shared customer/pet filter section, balance summary followed directly by statement; preserve context, details and CSV export. Do not add a separate Statement destination.
- Settings groups locations, timezones, policy and account preferences. My profile belongs to the account menu; My pets belongs to Customers. Saved house-local timezones remain authoritative; preview timezone preferences must not alter financial or booking rules.
- Contextual links preserve canonical customer/pet selection. Current fictional planning records may link only through the explicit isolated-demo fixture mapping; never infer identity from editable names or claim real financial integration.
- Public cancellation policy belongs on the marketing site with contextual app links. Publish known approved terms with unresolved details explicit; never publish an administrator's temporary policy draft as approved policy.


- Keep common tasks intuitive, with plain English/Chinese, clear primary actions, sensible non-business defaults and contextual details.
- Use focused dialogs for edits and linking; recognizable secondary icons need tooltips and accessible names.
- Preserve entered information through recoverable errors and uncertain-save retries; warn before discarding drafts.
- Make times/house context, price/day calculations, balance changes and refund outcomes clear before confirmation.
- Do not require hover or dragging. Use readable layouts and touch-friendly controls on phones.
- Latest administrator navigation (2026-11-16): **Calendar / Customers / Balances / Settings**, ordered by importance, with no ampersands in tab names. Calendar is the administrator entry view. Customers includes pets; Balances contains Overview and Statement views. Settings contains the cancellation-policy entry; remove Houses and rooms from Settings while retaining its Calendar management action. Personal profile is a secondary account link. Integrate the existing local pages without claiming sample planning data is a real saved booking/balance system.
- Suggested customer navigation: My pets / Calendar / Packages. Latest approved admin navigation: **House calendar** is the daily destination; **Manage houses & rooms** opens setup in a focused dialog, replacing the separate Houses tab. Room setup remains WIP until implemented and validated.

## 13. Existing separate workstreams

- Low-balance renewal reminders: configurable admin thresholds, bilingual pet/service/balance details and renewal instructions. Defaults, per-customer overrides, cycle/reset/deduplication, email provider and outbox recovery policy need decisions.
- Duplicate profile reconciliation without automatic merging.
- Data retention, backups and recovery policy.
- Approved public contact details/location, official Chinese business name, real photos and branding.
- General payment history, income reporting and care notes have not been requested as part of this scope.

## Decisions still required before dependent workflows

| Area | Open decisions |
| --- | --- |
| Calendar/day usage | Services and units; how daytime, overnight and partial stays consume days; business timezone facts and date/time boundaries; transport versus on-site handoff |
| Booking lifecycle | Approval versus automatic confirmation; request holds/expiry; when days and room capacity are reserved, consumed or released; waitlisting/alternatives if desired |
| Payment | Online provider versus externally collected/admin-confirmed payment; currency, provider access/billing and payment/refund confirmation |
| Packages | Sharing across pets/services/houses; allocation between packages; fractional days; exact three-calendar-month expiry; future-booking activation when first visit changes/cancels; actual versus planned date differences |
| Weight/pricing | Actual weight bands/prices and units; who enters/measures weight; employee verification authority; use of unverified weight; changes in weight band and price adjustments |
| Capacity groups | Category definitions, group values and weight boundaries; precedence/overlap/gaps between groups; group selection versus automatic matching; override effective dates; which weight verification state applies |
| Room scheduling | Back-to-back boundary handling, cleaning/turnover buffers, permitted room moves, closures and changes affecting existing confirmed stays; how early arrival/late pickup affects conflicts |
| Holidays | Actual dates/rates, house/service scope, money versus extra-day charging, overlaps and multi-rate stays |
| Refunds | Confirm 14-/7-day boundary interpretation; exact hours versus calendar days; refund money versus days; under-seven-day/no-show policy; rounding; returned-day expiry; holiday/extension refunds |
| Actual handoffs | Correction permissions; early/late fees or extra-day use; review of unexpected occupancy |
| Rule changes | Effective dates, purchased/confirmed terms, retroactive application and conflict resolution |
| Missing photos | Labelled species samples versus actual owner photos for real pets; whether photo becomes mandatory for new real pets |

Unknown values must stay unconfigured or explicitly pending, not be silently replaced by illustrative numbers. Calendar/balance development can proceed on independent UI and record foundations, but financially consequential booking, deduction and refund behavior must wait for the relevant approved rules.


## Public marketing direction — 2026-11-16

Latest owner direction supersedes earlier entrance-only animation: use scroll-linked object positions across the public page. Moving backward restores earlier poses; stopping scroll holds the pose. Natural wheel/touch/keyboard scrolling and reduced motion must remain usable. Aim for a clean, cute, professional illustrated art direction with a coordinated palette and messaging about clarity, care, trust and the care experience.

Home introduces the brand/experience and links to distinct detailed Services, About and FAQ content; do not repeat their sections/paragraphs on Home. Keep home navigation anchors working. Customer testimonials and real customer experiences require approved source wording and attribution; never invent them. None have been supplied in this session, so testimonial publication remains pending.


## Cinematic story clarification — 2026-11-16

Owner cited Make Your Money Matter and the earlier Apple Mac Pro product site, then explicitly selected **Long cinematic scroll story** when distinguishing it from an endless looping page. Home should progress through connected full-screen chapters with reversible scroll-driven artwork and restrained copy. Do not repeat the page indefinitely or clone its content. Preserve distinct detailed pages, direct section URLs, native scrolling, bilingual layouts and reduced-motion/static access.


## Persistent public navigation — 2026-11-16

Keep the compact marketing navbar visible throughout the public site. Cinematic scenes fill the available screen below it, with short-screen/static access preserved. Explicit navigation jumps immediately without replaying intervening chapters; Home restores document top. Allow fuller scroll-linked artwork motion while keeping copy readable, reversible animation and the current palette (owner reverted the proposed color change).


## Animated marketing navigation clarification — 2026-11-16

Latest direction replaces instant-only clicks: navbar and right-side chapter/next controls animate briefly to their destination, without a long replay of intervening chapters. Navbar indicates the actually visible section during manual scroll too. Keep the header visible; avoid red backgrounds (services now uses neutral cream). Reduced motion uses direct jumps. Retain accelerating reversible scroll-linked artwork.


## Integrated continuous artwork — 2026-11-16

Treat the marketing chapters as one continuous illustrated piece. Allow shapes inside SVGs/icons to change with scroll, with shared artwork that carries through scene boundaries. Retain readability, full-screen composition below the visible navbar, brief animated navigation, active-section indication, neutral service background, exact reversible motion and static/reduced-motion access.


## Natural movement and shape resizing — 2026-11-16

Latest owner direction supersedes opacity-based scene changes: use movement into/out of the viewport, including offscreen side exits where appropriate. Calm the shared sun/flower so they do not bounce between sides. Include scroll-linked shape resizing, keeping everything smooth, natural and reversible. Preserve animated navbar/chapter navigation, active-section indication, sticky header, neutral backgrounds, readable text and reduced-motion/static access.


## Purposeful scale and sun movement — 2026-11-16

Owner clarification: shapes resize when needed by the composition; the sun should move. Use one continuous, gentle sun journey rather than repeated chapter zigzags. Avoid automatic ornament growth for its own sake; adapt their size for screen fit while retaining useful perspective/exit resizing and movement-only scene changes.


## Marketing page navigation clarification — 2026-11-17

Latest owner direction: main navbar items open their dedicated pages in order Home / Services / About us / FAQs. Navbar active state belongs to the current page and must not change or move as Home scrolls. Home owns the cinematic scroll story and separate chapter controls; order its Services introduction before About to match the navigation. Page entry remains aligned to the top, with restrained movement-only animation and reduced-motion access. Preserve existing Home section deep links and detailed content.

## Latest service/quotation clarification — 2026-11-18

Users supply pet weight and booking dates for an automatic itemized boarding quote, or select a service and grooming-store appointment for an itemized service/add-on quote. Printed boarding ranges are prorated by weight (for example8–15lb maps proportionally from$52 to$58 within that band). Currency/balance are USD. See the consolidated booking/billing specification for full source tables, latest rules and remaining boundary/rounding questions. Owner requested Markdown updates only—no coding.
