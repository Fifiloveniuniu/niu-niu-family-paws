# Consolidated booking, services, pricing and balance requirements

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


Updated: 2026-11-18. Latest explicit owner decisions take precedence over historical drafts.

**Documentation only:** the owner instructed: “Include all info to .md. Don't code.” Do not change application/test code, commit, push, merge or deploy as part of this documentation update. Existing local code changes predate this instruction and are not declared complete here.

Related documents: [full product requirements](requirements.md), [grouped E2E plan](e2e-test-plan.md), [current implementation request](current-implementation-request.md), [architecture](architecture.md), and the owner's original [poster transcription](../info/parsed.json).

## Latest clarification: boarding-day balance confirmed

The owner explicitly confirmed **“Boarding days”**, after rejecting USD and generic credits as the balance unit. **Balance = boarding days; pricing currency = USD.** Earlier USD-wallet proposals are superseded. Do not relabel day balances as money, introduce a generic cross-service credit, or apply boarding days to grooming without an approved rule.

Deduct boarding days when booked; administrator overrides take priority; standard no-show/under-seven-day refunds are zero; qualifying cancellation restores boarding days to balance. For withdrawal valuation, an administrator chooses the original purchase price or the deducted booking price; an admin pays externally for now. The20% holiday adjustment applies only to holiday dates. Monday drop-off to Tuesday pickup is two billable days; cancellation notice uses calendar days. The earlier statement “USD never expire” must not silently decide the expiry of a boarding-day balance.

## 1. Confirmed services and booking journeys

- Remove **daycare** from service navigation, marketing content, booking choices and balance workflows. Retain **pet boarding**.
- Retain the separately requested grooming/bathing, drop-in visits, dog walking and academy information; removing daycare does not remove those services.
- Boarding: the user supplies/selects their pet, its weight and booking dates. Calculate and show itemized charges automatically before confirmation.
- Grooming store: the user chooses a store appointment and service. Calculate and show itemized service charges, using the relevant pet type, weight, coat/service category and selected add-ons where applicable.
- Store appointment durations, staff/resource availability, hours, cancellation terms and booking rules must be configured from approved facts. They are not supplied by the posters.
- The backend must recheck the applicable quote, available balance and capacity/appointment availability at confirmation. A failed confirmation must leave the balance and reservation unchanged.

## 2. Boarding-day balances and USD prices

- Balance is measured in **boarding days**, not USD or generic credits.
- Keep customer/pet isolation. Do not silently share balances across pets or use another customer's days.
- For prepaid-day bookings, deduct confirmed boarding-day usage atomically **when booked**, alongside the capacity reservation. Direct-paid boarding instead charges the customer in USD without also deducting days.
- Show both the itemized USD quote and the boarding-day deduction; they are different quantities.
- A two-billable-day ordinary stay deducts two boarding days. Apply the confirmed holiday adjustment only to applicable holiday dates.
- Sum unrounded boarding-day usage for the **entire stay**, including holiday adjustments, then round up **once** to a whole day (ceiling). Do not round individual dates or lines separately. Already-whole totals stay unchanged. Preserve unrounded itemization and show the final rounding adjustment. Half refunds retain fractional days:3 deducted days returns1.5 days.
- Explicit administrator overrides take priority over ordinary configured rules. Retain the original calculation, override, responsible administrator and resulting charge/refund in history. Exact override permissions/limits still need definition.
- Preserve current day-credit records. Do not migrate them into a USD wallet or rename30 days as$30/30 cents.
- USD amounts are floored to the nearest cent, using exact decimal arithmetic. The stage at which to floor itemized versus total amounts still needs confirmation. Avoid binary floating-point errors and duplicate deductions/refunds on retry.
- Grooming appointment quotes and direct customer charges are in USD; do not deduct boarding days for grooming.

## 3. Weight-based boarding pricing

- Use the boarding price table transcribed from price1.jpg below.
- The owner confirmed that a printed numeric range is **prorated based on pet weight**. Example: the8–15lb band increases from$52 to$58 as weight increases within that band.
- For a selected band with lower/upper weights L/U and lower/upper prices Pmin/Pmax, interpret proportional proration within the band as:

```text
rate(weight) = Pmin + (weight - L) / (U - L) × (Pmax - Pmin)
```

- At a weight boundary, select the **next higher bucket**. Thus the shared8lb boundary uses the8–15lb bucket ($52), rather than the0–8lb bucket. Within the8–15lb band,11.5lb prorates to$55. Do not use the previous bucket’s endpoint rate at a boundary assigned to the next bucket. Printed gaps still require clarification before extrapolating a rate.
- Fixed-price rows keep their fixed printed price. Do not multiply the printed band price by the weight itself.
- The same proportional interpretation applies to other numeric boarding price ranges. A fixed row and categorical bath/grooming/add-on price must not be interpolated as though it were a numeric range.
- Poster weights are **lb**. If canonical pet records store kg, convert units explicitly and consistently before applying the lb table; preserve the weight/unit used in the quote.
- Retain enough calculation precision to apply the approved rounding rule. Floor USD amounts to cents; rounding timing and treatment of fractional weights in printed gaps still need confirmation.
- Use the next bucket at shared boundaries; do not extrapolate across missing ranges or beyond supplied bands.

## 4. Billable dates and itemized quotes

- **All calendar dates in the year are billable.** Do not exclude weekends, seasons or months from chargeable dates.
- The owner confirmed that Monday drop-off to Tuesday pickup is **two billable days**, including both dates for that example. Same-day stays cost one boarding day.
- Boarding itemization must identify the pet/service, entered weight and unit, selected band, prorated/base daily rate, each billable date/quantity, holiday adjustments, administrator overrides and final USD total.
- Grooming appointment itemization must identify the store/appointment, pet/service category, applicable weight/coat criteria, base service, selected add-ons, any approved overrides and final USD total.
- Show the relevant balance and expected post-booking balance before confirmation.
- The confirmed quote must retain its rule/rate inputs. Later price or pet-weight edits must not silently rewrite historical charges.
- Whether later verified weight causes an additional charge/refund for an existing booking remains a business-rule decision.

## 5. Holidays

- Administrators configure holiday dates. Apply the20% additional fee only to configured holiday dates.
- Charge the additional holiday fee to the **customer’s credit card**, not their boarding-day balance. Show it separately in USD itemization.
- Deduct normal boarding days for all billable dates; sum base usage for the entire stay and round up once. Two holiday dates deduct2 boarding days, plus the applicable card fee. Earlier1.2-day holiday usage and3-day deductions for two holiday dates are superseded.
- The source poster states package-only holiday eligibility; whether that condition remains under card-fee charging still needs confirmation. Do not invent actual holidays.
- Card provider, collection timing, failed-payment/booking recovery, holiday-fee cancellation refunds, overlapping holidays and application to non-boarding services need approved rules before implementation.

## 6. Cancellation refunds and bank withdrawals

### Booking cancellation to balance

- The standard cancellation refund normally restores **boarding days** to the applicable pet balance, not dollars to a USD wallet.
- Previously confirmed policy headlines:14 days ahead receives a full refund;7 days ahead receives a half refund.
- The owner confirmed **no standard refund for no-shows or cancellation under seven days**.
- The owner selected **calendar days**, not elapsed-hour periods, for cancellation notice. Use the booking location calendar consistently; edge/boundary and rounding details must be explicit.
- Show the expected refund before confirmation and retain cancellation history. Apply the balance change and capacity release consistently and once.
- Administrator override priority is confirmed generally; exact override permissions/limits must be defined rather than granting unlimited authority silently.

### Balance withdrawal to a bank

- **Unused boarding-day balances are withdrawable with administrator approval**, with bank payment in **USD**. A request alone does not authorize payment. For each withdrawal/refund payout, the administrator decides whether to use the **original purchase price** or the **deducted booking price**. Record the selected basis, referenced purchase/booking and approved USD calculation; do not automatically substitute a current rate or assume one day equals$1. Allocation across multiple purchase/booking rates still needs definition.
- **For now, an administrator pays manually/externally.** A payment provider is a later integration.
- Record the requested day quantity, approved USD conversion/value, status, responsible administrator and payment result/reference, without pretending the app executed a bank transfer.
- Prevent requested boarding days from also being spent on a booking or redeemed again. A hold/reservation of those days is the proposed implementation mechanism.
- Rejected/cancelled unpaid requests should release held funds; a paid request must not be paid or restored twice. Exact status/approval UI is implementation work, not an already-delivered feature.
- Withdrawal minimums/maximums, fees, processing times, bank-detail collection and provider selection are not supplied. Never put real bank details or credentials in documentation/test fixtures.

## 7. Packages, validity, extensions and overrides

- Boarding-day packages and a boarding-day balance are compatible with the newly confirmed unit. Earlier requirements specify30-day packages and three months from first use.
- The owner also previously said “USD never expire,” while a USD-wallet proposal was being discussed. That statement does not establish the expiry of the now-confirmed boarding days. Confirm whether to retain the earlier first-use expiry or make boarding days non-expiring.
- Administrator-entered valid-from/valid-through ranges and reusable named templates are earlier requirements; administrator overrides take priority. Clarify their relation to the final boarding-day expiry rule.
- Keep purchase/payment and rate history so any later cash redemption can follow an approved valuation rather than an invented day-to-dollar exchange rate.
- Only eligible boarding days/terms may cover a stay or extension; do not borrow another pet's balance.
- Show an extension's itemized USD quote and extra boarding-day usage. Commit accepted day/time/capacity changes together; if an extension fails or is declined, leave the original booking intact.
- Extension approval/refund treatment and treatment of promotional/non-refundable purchased days still need specification.

## 8. Roles, calendar and app experience

- One Google identity may have multiple roles and own pets. Enforce current roles and ownership on the backend.
- Admin: manage customers/pets, houses/rooms, bookings, balances, rates/rules and authorized overrides; act on behalf of a customer with a clear target banner and exit while retaining the actual admin actor.
- Customer: access only their own pets, bookings, calendar, boarding-day balance, statements and authorized redemption/withdrawal requests.
- Employee: record **actual drop-off and pickup**, separately from planned times; retain employee identity and history. Employees are assigned to houses. Their operational access, including calendar and actual handoffs, is scoped to assigned houses and enforced by the backend; unassigned houses must not become accessible by changing filters or request IDs. Assigned employees may verify pet weights and correct actual handoff records with audit history; assignment-management details remain to be defined. House assignment does not grant administrator balance or payout authority.
- Calendar: House → Room → Pet hierarchy; day/weeks/month/year; filters/reset; availability for the whole stay; capacity/species/duplicate-placement checks; overdue occupancy until actual pickup; saved addresses; focused house/room edits; accessible pet-info popups and Now marker.
- Houses require addresses and saved timezones. Actual business locations/capacity values are not supplied by the posters; test labels/addresses are not approved business facts.
- Primary admin navigation: Calendar / Balances / Customers / Pricing. In customer context: Calendar / Balances / Pets. Remove Settings from the navigation bar; My profile remains a secondary account action.
- App content below navigation is **white**, with clean Google/Apple Calendar-like hierarchy, compact controls, restrained status colors, readable text, continuous single borders and no repeated information.
- All dropdowns are custom, with clickable arrow buttons, spaced borderless items, matching light-green field borders, non-red hover and only one open at a time.
- In Add booking, keep Customer visually above Pet type. Type must be selectable before customer. Type choices show icon/name; pet choices show avatar/name only. Selected pet fields retain their avatar without covering text.
- Selecting a picker day fills a complete visible date/time immediately, keeping an existing time or using the current local time for an empty field. Valid ordered dates enable Choose a room. Time remains editable; DST ambiguity/errors still require correct handling.
- Keep booking nearly full-screen with viewport clearance and clean scrolling. Add/edit-pet and other modals must not clip borders or focus outlines.
- Do not reintroduce app hc-title, Visit site, duplicated My profile headings, Required days, booking capacity-override/manual-selection controls, eligible-month selectors or daycare choices.
- Use N/A/empty for unset values. Keep English/Simplified Chinese resources outside components, with language in URL query parameters. Preserve phone/desktop, keyboard and touch usability.

## 9. Marketing and source-of-truth rules

- Marketing must reflect the owner-supplied service pricing, with USD now confirmed by the owner.
- Keep the original JSON as a transcription. Its null currency_code is superseded by the later USD decision; do not rewrite history or discard conflicting printed rows silently.
- Preserve rates, ranges, units, source labels, inclusions, surcharges/add-ons and stated holiday conditions.
- Remove daycare. Do not show fictional preview prices such as a different boarding rate or an invented academy fee as approved prices.
- The WeChat handle below is owner-supplied poster information. Missing academy fee, duration, certifying body and contact handle remain unspecified.
- Do not invent addresses, testimonials, completion/certification guarantees, course outcomes or other unresolved business details.

## 10. Complete supplied poster information

The following tables preserve every supplied price row. Printed line breaks are represented by `<br>`; punctuation/capitalization and conflicting rows are retained. USD is the later owner-confirmed currency.

### price1.jpg: Niu Niu — Dog Boarding

WeChat: **Ilikesunflower2017**.

Pricing basis: per day.

Printed table title: BOARDING PRICE TABLE.

Printed column headings: SIZE (WEIGHT) / PRICE (PER DAY).

| Source label | USD price |
| ------------ | --------- |
| 0-8 pounds   | $50       |
| 8-15 pounds  | $52–$58   |
| 16-35 pounds | $62–$72   |
| 36-55 pounds | $73–$76   |
| 56-75 pounds | $77–$85   |
| 76-85 pounds | $88–$100  |

**Printed policies**

- LONG WEEKEND: Add 20% Holiday Rate
- HOLIDAY POLICY: Holiday period we only accept customers with package.

Printed tagline: Your dog’s home away from home.

### price2.jpg: Niu Niu — Dog Bath Price List

| Source label                                       | USD price |
| -------------------------------------------------- | --------- |
| Small Dog (<20 lbs)                                | $55       |
| Medium Dog (<45 lbs)                               | $65       |
| Large Dog - Short Hair<br>(<65 lbs)                | $75       |
| Large Dog - Long Hair<br>(<65 lbs)                 | $90       |
| X-Large Dog - Short Hair<br>(>65 lbs)              | $95       |
| X-Large Dog - Long Hair<br>/ Double Coat (>65 lbs) | ~~$95~~ — discarded by owner; do not offer |
| X-Large Dog - Long Hair/<br>Double Coat (>65 lbs)  | $115      |

**Dog Bath Includes:**

- Bath with oatmeal shampoo
- Brush-out
- Nails clipped & filed
- Ears cleaned
- Paw pad trim

**Printed surcharges**

| Source label       | USD price |
| ------------------ | --------- |
| + Double Coat +$30 | $30       |

### price3.jpg: Dog Grooming — PRICE LIST

| Source label                            | USD price |
| --------------------------------------- | --------- |
| Xsmall Dog-Straight/Wavy coat (<10 Lbs) | $80       |
| Xsmall Dog-Doodle/Curly coat (<10 Lbs)  | $110      |
| Small Dog-Straight/Wavy coat (<20 Lbs)  | $95       |
| Small Dog-Doodle/Curly coat (<20 Lbs)   | $125      |
| Medium Dog-Straight/Wavy coat (<40 Lbs) | $120      |
| Medium Dog-Doodle/Curly coat (<40 Lbs)  | $145      |
| Large Dog-Straight/Wavy coat (<60 Lbs)  | $150      |
| Large Dog-Doodle/Curly coat (<60 Lbs)   | $165      |
| Xlarge Dog-Doodle/Curly coat (>60 Lbs)  | $195      |

**DOG GROOMING INCLUDES**

- Bath with oatmeal shampoo
- Hair cut with sanitary trim
- Brush-out
- Nails clipped & filed
- Ears plucked & cleaned

### price4.jpg: CAT BATH PRICE LIST

| Source label                       | USD price |
| ---------------------------------- | --------- |
| GENERAL CLEANING BATH (SHORT HAIR) | $95       |
| DEEP CLEANING BATH (SHORT HAIR)    | $115      |
| GENERAL CLEANING BATH (LONG HAIR)  | $105      |
| DEEP CLEANING BATH (LONG HAIR)     | $125      |

**Included care**

- Bath
- Dry
- Deshedding
- Nail trim
- Ear and eye cleaning

**CAT ADD-ON CARES**

| Source label                                  | USD price |
| --------------------------------------------- | --------- |
| FULL BODY HAIR CUT                            | $80       |
| DE MATTING AND SHEDDING (SHORT HAIR; 20 MINS) | $35       |
| DE MATTING AND SHEDDING (LONG HAIR; 30 MINS)  | $55       |
| SANITARY AND BELLY TRIM                       | $50       |
| SANITARY AND PAD TRIM                         | $20       |
| NON-PRESCRIPTION FLEA TREATMENT               | $25       |
| TEETH BRUSH                                   | $15       |
| EAR CARE CLEANING (WAX-BUILDUP REMOVAL)       | $15       |
| DEGREASE TREATMENT (BACK FUR)                 | $15       |
| DEGREASE TREATMENT (FULL BODY)                | $50       |

**Source ambiguities to retain for review:** the shared8lb boarding boundary now uses the next bucket; gaps and fractional weights between other integer bands are not defined. Bath rows include overlapping “less than” labels and a discarded$95 XL long-hair/double-coat row and the retained$115 row. Exact65lb bath and60lb grooming boundaries are not clearly assigned. Do not infer boarding prices for cats/rabbits or above85lb from unrelated grooming prices. Weight-based proration resolves numeric boarding price ranges, not these boundary/category conflicts.

### groom_academy.jpg

- Brand: Niu Niu 宠物美容培训
- Title: 华人新移民
- Audience: 华人新移民
- Headline: 别再只盯着按摩、保险和地产执照了！

**Source claims (not independently verified)**

- 美国养宠家庭数量庞大
- 宠物美容行业需求稳定、就业灵活

**Offerings**

- 零基础技能培训
- 宠物美容考证指导
- 就业积累经验
- 未来可自主创业开店

**Inquiry topics**

- 学习周期
- 课程内容
- 费用
- 就业方向

**Taglines**

- Good Pets Happier Lives
- 用专业 让毛孩子更幸福

Call to action: 欢迎私信咨询

English source summary: Pet grooming training promoted to new Chinese immigrants: beginner skills training, certification exam guidance, gaining work experience, and potential future business ownership. Message privately about course duration, content, fees and career directions.

Course duration, course fee, certifying body and academy contact handle: **not supplied**. Do not fill these with preview/example values.

## 11. Tests, local data and implementation status

- Simulate complete user journeys in Playwright for admin, customer and employee roles, including all calendar and monetary/appointment flows.
- Local tests must run with visible Chrome windows, not headless. CI can remain headless.
- The detailed grouped checklist is [e2e-test-plan.md](e2e-test-plan.md). Planned cases are not evidence of passing tests.
- Test quote itemization/proration, exact cents, holiday-only adjustments, deduction at booking, insufficient funds, administrator overrides, zero under-seven-day/no-show refunds, balance refunds and manual bank payouts.
- Test service/appointment selection, applicable type/weight/coat/add-ons, store/slot availability, quote changes and failed/duplicate submissions without double booking or charging.
- Preserve real backend checks, versioning, concurrency, idempotency, actual-actor audit history, private-photo access, translations and responsive/keyboard/touch flows.
- Keep sample data explicitly fictional and isolated from production. Do not overwrite existing owner edits, uploaded photos, balances or bookings when reseeding.
- Current local data: Firestore emulator8085, Auth emulator9099, API8081 and frontend localhost4180. Emulator records are currently in memory unless exported; private demo photos are cached in the OS temporary folder under family-paws-local-photo-cache.
- A prior sample run populated100 families/300 photo-backed pets, sample day-credit records, sample weights, two populated sample houses/six rooms,18 unbilled visits, validity templates and a separate empty practice room. These records do **not** prove financial booking/redemption, employee or paid appointment flows are implemented. Preserve the day records and evolve their precision/usage rules deliberately; do not migrate them into a USD wallet.
- No implementation completion, deployment or payment execution is claimed by this requirements document.

## 12. Remaining decisions

1. Boarding-day expiry: retain the earlier three-month first-use rule or make boarding days non-expiring? Same-day stays are confirmed as one day. Monday-to-Tuesday is already confirmed as two billable days.
2. Allocation across multiple purchase/booking rates and discounted purchase lots; direct-payment provider, collection timing and refund handling. Grooming is directly charged to the customer. Admin chooses original purchase price or deducted booking price for withdrawal valuation. Boarding days are not generic service credits.
3. Price-table boundary/category conflicts identified above and pricing for unsupported weights/species.
4. USD cent-flooring stage; half refunds preserve fractional days (3 returns1.5). Boarding-day charges are confirmed to round up once on the entire stay total after holiday adjustments.
5. Calendar-day cancellation boundary details, restored-day validity and permitted administrator override scope.
6. Actual holiday dates, package-only eligibility and overlapping holiday/surcharge rules.
7. Grooming store locations, appointment durations, hours, staff/resources, capacity, add-on compatibility and appointment-specific cancellation/no-show rules.
8. Employee assignment-management details. Assigned-house weight verification and handoff correction permissions are confirmed.
9. Manual withdrawal fees/limits/timing, bank-detail handling and approval/payment-recording procedure. Unused balances are withdrawable with admin approval.

Do not continue listing the balance unit as undecided: it is **boarding days**. USD pricing, deduction at booking, weight-based proration, standard zero refund under seven days/no-show, manual admin payouts, holiday-date-only adjustments, the two-day Monday-to-Tuesday example and calendar-day refund notice are confirmed.

## Latest owner clarifications — house assignments and calculation rules

Employees are assigned to houses; use those assignments as the operational authorization scope. Weight boundaries use the next bucket. Round boarding-day charges upward once on the entire stay total after holiday adjustments, and floor USD amounts to cents. Unused boarding-day balances are withdrawable with administrator approval. Multi-rate withdrawal allocation, USD flooring stage and refund rounding, boarding-day expiry and unspecified source gaps remain unresolved. These are documented requirements, not implemented features.
