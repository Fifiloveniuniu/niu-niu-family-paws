# Product requirements

## Roles

- Administrator: manage all business records, employee access, balances, and reminder thresholds.
- Employee: view necessary customer/pet information and record drop-off/pickup events. No administrative account management.
- Customer: view only their own pets, balances, and service dates. Cannot edit balances or roles.

Customer records exist independently of login accounts. Account linking must use verified identity and administrator-controlled authorization, not a self-entered customer name.

## Customer self-registration — owner requested 2026-10-19

Customers sign in with their own Google account, then enter their name and their own pet information. A new self-registered profile belongs to the verified Firebase Authentication UID; the server derives ownership from the verified token, never a client-supplied owner identifier. A name is profile information, not proof of identity or permission to access an existing customer record. Linking an existing administrator-created record still requires administrator authorization. Customers must only access their own records and cannot change roles or service balances.

Each customer can have multiple pets. Each pet has its own name and photo, entered/uploaded by the customer. Store each pet as a separate record linked to its owner, with its own stable identifier; names are not unique identifiers. Enforce ownership for photo upload and access as well as pet records. Do not expose customer-uploaded photos publicly by default. Owner confirmed on 2026-10-22: photos can be added later; a name is sufficient to save a pet.

## Administrator customer and pet management — owner requested 2026-10-19

Administrators can view, search, and edit customer information and the information for all pets belonging to each customer, including pet names and photos. Provide search by customer name, customer Google login email, and pet name. Search results must show the customer/pet relationship clearly, including customers with multiple pets. Enforce administrator authorization on the server for cross-customer reads, searches, and edits. Editing profile information must not silently change the verified login identity or record ownership. Balance adjustments remain a separate authorized workflow. Preserve an audit trail for administrator edits.

## Service usage

Keep balances separate by service and unit (for example daycare days versus boarding nights). Each usage record identifies the customer, pet, service date, units consumed, and recording employee. Drop-off and pickup belong to the same visit. Corrections preserve an audit trail.

There is no separate attendance page; relevant service dates and drop-off/pickup information appear in existing views.

## Renewal reminders

Administrator-configured remaining-day thresholds are required. Proposed behavior: a global default with per-customer overrides and an option to disable reminders. Check eligibility following usage, balance changes, and threshold changes. Avoid repeating reminders for the same balance cycle; successful replenishment starts a new cycle. Define edge cases before implementation.

Emails include pet/service details, remaining days, and renewal contact instructions in English or Simplified Chinese. Package purchasing/prepayment is now requested below; a general payment-history or income-reporting feature is not implied.

## Decisions still needed

- Company location/timezone, official Chinese name, contact details, domain, and branding assets.
- Whether drop-off/pickup means customer handoff at the business or employee transport.
- When a visit consumes days; overnight and partial-day rules; cancellation details listed below.
- Exact three-month expiry calculation and whether pets can share a balance; activation and eligible-month requirements are confirmed below.
- Reconciliation of existing duplicate profiles (no automatic merge).
- Reminder defaults, replenishment behavior, and email provider/domain verification.
- Data retention, backup policy, and available Google Cloud billing/credits.

Do not treat these unresolved business rules as approved behavior.

## Shared sign-in, multiple roles, and administrator impersonation — 2026-10-19

Use one prominent bilingual sign-in entry for customers, employees, and administrators. A verified Google identity may have multiple authorized roles; do not force a person into mutually exclusive administrator/employee/customer accounts. An administrator can also own pets and use customer workflows for their own pets.

Avoid duplicate information: one canonical person/profile per verified identity, with role assignments referencing it. Customer/employee views reuse profile information and pets rather than copying records. Each pet has one stable record. Do not automatically merge people on matching names or editable contact email; linking pre-existing records still requires administrator authorization and verified identity. Account linking must preserve history and references.

Administrators may impersonate any customer or employee for their business workflows. Implement this only with server-authorized, scoped impersonation sessions; never grant the browser permission by selecting an account ID or modifying another account's claims. Every operation must retain the actual administrator actor and the effective customer/employee identity in its audit record. Display a persistent, prominent impersonation banner with the target identity and an exit action. Leaving impersonation returns to administrator context. Revoked administrator access must terminate impersonation authority. Impersonation must not expose passwords, allow changing another person's Google credentials, or silently grant roles. Switching to the administrator's own customer context uses that same person's existing profile and pets.

Delivered before the current account-linking release: shared sign-in, administrator customer-contact editing, UID-owned customer name/language registration, multiple pet profiles and private optional photos. Administrators can switch between customer management and their own profile/pets; staff also retain their own personal profile/pet panel. Customer/pet profiles share canonical records with administrator management, including customer-name/Google-email and pet-name search. Public and portal headers provide explicit English/简体中文 selection, independent of saved profile-language preferences. Employee business workflows and authorized impersonation remain subsequent features.

Owner approved account linking on 2026-10-22: administrator generates a one-time code, customer submits it after their Google sign-in, administrator verifies and approves. Link only an unclaimed existing customer to an identity without a separate saved profile; preserve all original customer/pet/photo/history references. Never automatically merge duplicates. See `docs/account-linking.md` and the session handoff for delivery status.

## Booking, packages, and multi-house UX — owner planning, 2026-11-15

Status: requirements recorded; implementation has not started. Owner initially requested planning before coding and subsequently authorized finishing the PRs sequentially on 2026-11-15. This section supersedes earlier statements that package expiry or package purchasing are outside scope. See [delivery plan](booking-delivery-plan.md) for proposed commits/PRs. Proposed UX and open decisions below are not approved business rules.

### Confirmed: customers, pets, and weight

- Customers see their own combined timeline and availability; every pet has its own calendar.
- Customers specify planned drop-off and pickup dates/times and choose a house.
- Pricing depends on pet type (such as dog/cat) and weight range, not exact-weight multiplication.
- An administrator approves weight or verifies it during drop-off. Preserve entered versus verified weight and verification actor/time.
- Preserve canonical customer/pet records, existing photos, ownership, and bilingual mobile/desktop workflows.

### Confirmed: prepaid packages and holidays

- Sell 30-day packages; customers prepay for sufficient days before booking.
- Package validity is three months from first use, rather than purchase. First use means the first day of care covered by the package, not the date a future booking is made.
- Packages have configurable eligible service months (January–September is an example, not an approved universal schedule). Both expiry and eligible-month restrictions apply.
- Holiday dates have holiday rates.
- Administrators configure pricing and business rules through the UI, without code changes.
- Show applicable terms, weight band, price, balance, activation/expiry, eligible months, and holiday charges before commitment.

### Confirmed: bookings, extensions, and cancellations

- Check suitable capacity throughout a requested stay.
- Customers can extend sitting time when suitable slots are available; check package eligibility and required additional prepayment.
- Customers can cancel 14 days ahead for a full refund and seven days ahead for a half refund. Exact boundaries and refund form remain unresolved; do not silently choose them.
- Show cancellation consequences before confirmation and preserve visit history.

### Confirmed: houses, spaces, and admin overview

- Support multiple houses, each containing rooms with slots/spaces.
- Admins adjust room/space constraints in the UI; availability and placement must respect them.
- Admins have a combined overview and can focus on an individual house.
- Provide a dynamic house map at a selected date/time to inspect occupancy and help optimize placement.
- Overview covers arrivals, pickups, pets in care, capacity, requests, unassigned pets, and conflicts as applicable to the approved workflow.

### Confirmed: actual handoffs

- Employees record actual drop-off and pickup times separately from customer-scheduled times.
- Retain the responsible actor and correction history.
- Actual presence must remain visible when a pickup is late; elapsed scheduled time is not proof of departure.

### Proposed UX and safeguards to review

- Customer navigation: My timeline, Book a stay, My packages, My pets, My profile.
- Admin navigation: Overview, Bookings, House map/timeline, Customers/pets, Settings.
- Available/reserved/used package balances, with atomic reservation to prevent spending the same days twice.
- House selector, time controls, space timeline beside the map, and mobile room-list alternative.
- Focused booking/assignment/edit dialogs; explain unavailable dates and preserve original bookings when an extension fails.
- Admin approval for initial bookings/extensions; timed space moves and explainable placement suggestions.
- Preview affected bookings before publishing rule changes; retain historical prices/terms and audit changes. Existing purchases/confirmed bookings retain agreed terms by default, subject to owner approval.

### Decisions required before dependent implementation

1. Services and units; day/night/partial-day counting; timezone and daylight-saving boundaries; early arrival/late pickup charging.
2. Weight units/bands/prices; who enters/measures weight; whether employees can verify or only admins; whether unverified weight permits purchase/booking; changes in weight band and settlement of price differences.
3. Payment method/provider, payment confirmation, currency, refunds, and any provider/billing access. No payment provider selected.
4. Package sharing across pets/services/houses; allocation between multiple packages; fractional balances; exact three-calendar-month expiry and eligible-month boundary behavior. How projected activation changes when the earliest future visit is moved/cancelled; whether activation uses actual or scheduled care date when they differ.
5. Holiday dates/rate mechanism (money surcharge, extra prepaid days, or another model), overlapping holidays, and application to stays spanning rate periods.
6. Cancellation: confirm at-least-14-days full / 7-to-under-14-days half interpretation; exact-hour versus calendar-day cutoff; under-seven-day/no-show policy; money versus days; rounding; returned-day expiry; holidays and extensions.
7. Booking/extension approval, pending-request holds and their expiry, balance reservation/consumption/release, alternative availability, and concurrent-request behavior.
8. House facts/timezones, spaces/capacities, suitability and compatibility constraints, closures/buffers, moves during stays, and whether a move can satisfy extension availability. No actual address, capacity, or constraint values supplied.
9. Employee access by house, verification authority, correction permissions, and operational handling of unexpected presence/capacity conflicts.
10. Rule effective dates and treatment of existing purchases/bookings. Admin configuration must expose approved options, not invent defaults for unresolved rules.

Existing separate workstreams remain renewal reminders, audited balance adjustments, scoped admin impersonation, duplicate-profile reconciliation, and backup/retention policy. They are not automatically part of the booking deliveries.

### UX clarification — 2026-11-15

Owner explicitly requires the simplest, cleanest, easy-to-use and intuitive UX, including a core house map. Planned customer navigation is My pets / Calendar / Packages; admin navigation is Overview / Calendar / House map, with management/settings secondary. The map defaults to now, supports house/time selection, room/space occupancy and linked timeline, click/tap actions and mobile room-list access. No required dragging or hover. Actual-task browser walkthroughs must check clarity and minimize unnecessary steps before each UI release. See delivery plan for acceptance criteria.

### Customer preview and execution authorization — 2026-11-15

Owner requested admin impersonation or confirmation of customer view. Plan a read-only customer preview first, then separately scoped acting-on-behalf workflows with server checks, persistent identity banner/exit, current admin revocation checks, and actual/effective actor history. No credential exposure or role changes. Owner subsequently authorized finishing all PRs one at a time; prior planning-only status is superseded. Unresolved business decisions still require owner input.
