# Current implementation request — 2026-11-18

Current local implementation status is recorded in [the handoff](session-handoff.md) and [pricing, pagination and operations](pricing-and-operations.md). Latest owner instruction authorizes finishing the work, grouping changes into signed PRs and merging them after validation. E2e tests must use isolated headless Chrome; never access or debug the owner’s personal Chrome session. Historical “documentation only” paragraphs below record earlier turns and do not undo the later implementation request. Financial decisions still block dependent execution.


## Latest owner design direction — clean, clear Material Design

Use **Material Design** as the shared UI standard across the app and marketing site, while preserving the owner’s explicit requirements and brand style. This is a visual/interaction requirement, not authorization to replace the technology stack or add a component library.

- Use consistent typography, spacing, alignment, component sizing and clear visual hierarchy. Keep labels, instructions and primary actions concise; remove repeated information and unnecessary decoration.
- Apply consistent Material-style fields, custom dropdowns/autocomplete, date pickers, buttons, tabs, dialogs, tables, pagination, tooltips and feedback. Keep controls recognizable, with visible focus, selected, disabled, loading, validation and empty states.
- Preserve white app content below navigation, light-green input borders matching search fields, borderless spaced dropdown items, non-red dropdown hover, and only one open dropdown. Use color consistently and maintain readable contrast.
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


Latest explicit owner requests supersede prior UI drafts. Deliver focused signed/verified PRs, optionally stacked with `gh stack`; validate and merge sequentially. Develop locally and deploy only when the whole requested set is ready. Do not push/create PRs between09:00–17:00 PST. Preserve unrelated local assets and handoff history.

## Requested changes

- Extract all marketing/app translations into shared resources; make future languages possible without embedding copy in components. Language belongs in URL **query parameters** (latest instruction), preserving shared links, filters, drafts, refresh and navigation.
- Shared custom dropdowns/date-time pickers, one open at a time, with spaced borderless items, sage hover, and field borders matching pet search. Unset values show N/A or remain empty.
- Keep the compact, readable Calendar, single continuous borders, clock timezone selector, short right-aligned actions, avatar info popups and near-full-screen booking dialog with viewport clearance. Field borders/outlines must not clip.
- Order administrator navigation Calendar / Balances / Customers. For a customer context, use Calendar / Balances / Pets and scope all three to that customer. Keep Settings secondary.
- Add booking asks customer first, then pet, then dates. Customer and pet fields are searchable autocomplete inputs; empty queries show the full permitted list. Pet options show type icon, avatar and name.
- The room calendar must show directly selectable available spans alongside unavailable spans. Preserve capacity/species/time checks. Keep an explicitly isolated empty practice room available for local booking tests; do not invent approved business configuration.
- Houses require an address; provide an address view from Calendar and a way to complete legacy missing addresses.
- Administrators can view-as any customer for booking/balance checks, add/adjust balances for any customer's pet, edit customer/pet information and edit bookings. Retain actual administrator identity and audit history, show context/exit controls, and enforce permissions on the server.
- Make Calendar, Customers/Pets and Balances persisted, integrated and production-ready, including retry-safe/versioned operations, authoritative availability/capacity checks, per-pet credit isolation, real backend E2E coverage and customer isolation.
- Do not reintroduce Required days or the capacity override/manual-selection controls. Preserve existing working Google sign-in, private photos and approved account linking.

## Financial decisions still awaiting the owner

Questions were sent through the conversation's input control. Do not infer answers from elapsed time or UI requests.

- How to count billable days, including partial/same-day stays and timezone boundaries; when credit is reserved/deducted.
- Whether prepaid balances are administrator-confirmed external payments or an online provider (and which provider).
- Exact first-use three-month expiry boundary, cancellation refund below seven days and the cancellation cutoff/timezone.

Confirmed package/cancellation requirements remain in `requirements.md`. Do not claim a working paid booking/refund flow until these choices are configured, implemented and validated. Independent backend persistence, ownership, availability, audited adjustments, account-context and UI work can proceed meanwhile.

## Latest owner direction — local work only, 2026-11-18

- Do not commit or push any further changes, including after the previous publishing window ends. Keep work local until the owner changes this instruction.
- Selecting a day in Add booking must immediately fill the date input; time remains explicit and incomplete date/time cannot advance or save.
- Calendar pet-type filters show species icons. Add booking includes a searchable pet-type field before pet selection; choosing a type filters the selected customer's pets. Remove the dot fallback in pet choices. Selected pet inputs display the same avatar as their dropdown choices.
- Continue independent remaining features and real backend E2E validation. Paid booking, automatic day use, expiry/refunds and other unresolved business-rule behavior still require the recorded owner facts; an asynchronous question was sent again during this work.

## Latest picker, presentation and source-data clarifications

- Customer stays visually above Pet type. Pet type is enabled before customer selection. Type choices/selected type show icon and type name; Add booking pet choices show avatar/name only, with no type repetition or dot. Selected pet inputs retain the avatar and clear text padding.
- Dropdown input boxes have clickable arrow buttons. A day click fills a complete date/time immediately, retaining the existing time or using the displayed current local time for an empty field; do not require an extra time-completion step after a picker day click. Valid ordered dates enable Choose a room.
- App content below navigation is white, with restrained Google/Apple Calendar-like hierarchy, quiet dividers, readable text and no repeated information.
- Simulate real users in Playwright across admin/customer/employee roles, including employee actual drop-off/pickup and all calendar flows. The grouped checklist is docs/e2e-test-plan.md; distinguish implemented tests from pending/blocked cases.
- Use owner-supplied info/parsed.json. It supplies poster prices/ranges and lb units, a WeChat handle, holiday wording and academy information. Currency code, conflicting rows and remaining business mechanics are not resolved by the transcription.

## Confirmed USD and refund decisions — latest owner replies

Balance/currency are USD; deduct quoted money when booked; audited admin overrides take priority; cancellation normally refunds balance; no-shows/under-seven-day cancellations have no standard refund; bank withdrawals are manually paid/recorded by admins now, with provider integration later;20% holiday surcharge uses balance and applies only to holiday dates; all dates are billable; remove daycare and show source pricing on marketing. Preserve historical day credits separately—no silent conversion. Remaining questions concern billable units for partial/same-day stays, exact refund-cutoff calculation, first-use expiry interactions and ambiguous source-price selection/boundaries.

## Documentation-only instruction and automatic quotes

Owner requested “Include all info to .md. Don't code.” Consolidated requirements and complete source-price tables are now in docs/booking-and-billing-requirements.md. Boarding quotes use user-provided pet weight/dates; grooming-store appointment quotes use selected services and applicable categories/add-ons. Numeric boarding ranges are prorated by weight within the band ($52–$58 across8–15lb); boundary conflicts/rounding still need resolution. Do not modify application/test code, commit, push, merge or deploy under this instruction.

## Latest balance-unit correction

Owner says balance should not be USD; pricing currency is still USD. Reopen balance unit/conversion and do not silently revert to days or assume generic credits have a dollar value. Owner also confirmed Monday-to-Tuesday is two billable days, calendar-day cancellation notice, and “USD never expire” before reopening the balance unit. Record the expiry statement but clarify its application to the final unit. Keep work documentation-only until instructed otherwise.

## Final balance-unit clarification — supersedes USD-wallet proposals

Owner rejected USD and generic credits and explicitly chose **boarding days**. USD is for itemized prices/payments/payouts. Deduct days at booking; restore days for qualifying cancellations;20% holiday-date adjustment requires fractional-day support. Day-to-money bank redemption conversion, grooming payment and boarding-day expiry still need definition; do not infer them from earlier USD-wallet statements. Monday-to-Tuesday is two billable days; refund notice uses calendar days. Update documentation only; no application/test coding, commits or pushes.
