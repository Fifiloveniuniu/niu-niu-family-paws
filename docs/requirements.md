# Product requirements

Canonical requirements, consolidated from owner instructions through 2026-11-15. Later explicit owner decisions supersede earlier proposals in historical handoff entries. “Confirmed” describes requested behavior, not implementation status. Do not invent unresolved business rules or treat example numbers as real rates/capacities.

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
- Employees access necessary operational information and record actual handoffs. Employee house scope and some permissions remain undecided.
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

- Manage multiple houses, each with its own rooms, address and timezone. Provide create/remove house and add/remove room actions; permanent deletion/history semantics still require a production policy. Prototype removal is limited to empty locations.
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
- No actual business addresses, room capacities, capacity group values or pricing have been supplied. Do not seed example values as approved business rules.

## 4. Customer calendars, timeline and availability — confirmed

- Every pet has a calendar. Each customer also sees a combined timeline of their own pets, with pet filtering and upcoming/past visits.
- Customer chooses the pet, service/house as applicable, and planned drop-off and pickup dates/times.
- Customer can see availability suitable for the pet for the **whole requested period**. Do not expose other customers’ pets or private internal assignments.
- Review booking details, required days, applicable holiday charges, package coverage and balance before submission.
- Customer must prepay sufficient valid days before booking. Avoid spending the same days or reserving the same capacity twice.
- Maintain booking status and history; exact approval/hold lifecycle remains undecided.
- Keep selected booking details when a package purchase is needed.
- Do not advertise a working paid booking/refund flow before its dependencies and approved rules are implemented.

## 5. Packages, prices and balances — confirmed

- Packages contain **30 days**.
- Package prices depend on **pet type and weight range**, not a per-exact-weight multiplication.
- Customers prepay days before booking. Actual payment method/confirmation remains undecided.
- Packages last **three months from first use**, not purchase or booking creation. First use refers to the first day of care covered by the package; exact activation/expiry boundaries still need decisions.
- Packages are usable only in configured service months. January–September is an example, not a universal approved calendar.
- Both the expiry rule and eligible-month rule apply to each covered service date, including extensions.
- Display remaining days, activation/expiry, eligible months, price/weight band and relevant terms clearly.
- Keep service/unit balances separate where relevant (for example daycare days versus boarding nights).
- Admin manages package prices, terms and balance adjustments in the UI. Preserve adjustment history.
- Customer balance management/validation is per pet and service. Show credit adjustments/history and coverage status in the scheduling review, without borrowing another pet or service’s days. Automatic counting and reservation/consumption rules remain unresolved; the current local prototype uses explicit staff-reviewed days and planning-only allocations.
- Balance operations and usage must be atomic, concurrent-safe and idempotent. Usage references customer, pet, service/date, consumed units and recording actor.

Proposed UX, not a resolved deduction policy: show **available**, **reserved for upcoming stays**, and **used** days. Preserve historical purchase/booking terms by default; effective dates and retroactive changes need approval.

## 6. Holiday rates — confirmed

- Holiday dates have holiday rates.
- Admin configures holiday dates, applicable scope and rate rules through the UI.
- Identify holiday dates and explain charges before a booking or extension is confirmed.
- Surcharge mechanism, actual dates/rates, overlapping holidays and package interaction remain unresolved.

## 7. Cancellations and refunds — confirmed policy, unresolved details

- Cancellation 14 days ahead receives a **full refund**.
- Cancellation seven days ahead receives a **half refund**.
- Show exact deadline and refund consequences before the customer confirms cancellation.
- Retain cancelled visit history and release its reserved capacity consistently with the approved lifecycle.

Proposed cutoff interpretation, awaiting confirmation: at least 14 days before scheduled drop-off → full; seven to fewer than 14 days → half. Do not invent the under-seven-day/no-show policy or whether refunds return money or package days.

## 8. Extensions — confirmed

- Customer can extend sitting time if suitable room capacity is available for the additional period.
- Respect one-species occupancy, capacity group/override usage, package validity/eligible months and holiday rules.
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

- Configure business rules in UI rather than code: package prices/weight bands, eligible months/validity, holidays, cancellation/refund rules, booking/extension rules, room capacities and pet capacity groups/overrides, applicable constraints, and employee access.
- Validate contradictory ranges/rules and show a clear preview before applying changes. Record who changed rules and when.
- Admin can confirm a customer’s view. Plan read-only preview separately from acting on behalf of a customer.
- Acting as a customer requires server-authorized scoped impersonation, a persistent target banner and obvious exit, current admin-access checks, and actual-admin/effective-customer audit identities.
- No exposure of passwords, Google-credential changes or silent role grants.

## 12. UX requirements

- Keep common tasks intuitive, with plain English/Chinese, clear primary actions, sensible non-business defaults and contextual details.
- Use focused dialogs for edits and linking; recognizable secondary icons need tooltips and accessible names.
- Preserve entered information through recoverable errors and uncertain-save retries; warn before discarding drafts.
- Make times/house context, price/day calculations, balance changes and refund outcomes clear before confirmation.
- Do not require hover or dragging. Use readable layouts and touch-friendly controls on phones.
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
