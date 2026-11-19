# Local pricing, pagination and employee operations

Implemented and grouped into signed feature PRs; deployment remains deferred. Google Cloud/Firebase architecture is unchanged.

## Pricing

The administrator-only Pricing tab manages boarding weight bands, fixed-price boarding-day packages, service/add-on prices, and explicitly configured holiday dates/surcharge percentages. Focused dialogs preserve drafts, freeze uncertain saves for identical retries, and require reopening after version conflicts. Customer context hides this tab; backend authorization remains authoritative.

`configuration/pricing` stores a versioned configuration. Each save writes immutable before/after history with the actual actor and an actor/payload-bound operation receipt in the same Firestore transaction. Archived rates remain in configuration; existing rates cannot silently disappear. No operation rewrites purchases, bookings or statements.

`packages/pricing/source-rates.json` is a derived catalog from the supplied posters, with bilingual labels. It excludes only the specifically discarded $95 XL long-hair/double-coat bath row; the $115 row and separate $95 XL short-hair row remain. Original `info/parsed.json` is unchanged. Boarding boundaries choose the higher shared band, gaps/out-of-range weights have no rate, and interpolation uses rational arithmetic before cent flooring. Package savings require a matching species/band/comparison weight and nonzero comparison price; percentages are displayed to two decimal places, without defining payment rounding rules.

`GET /api/public/pricing` returns active public price configuration without customer or audit data. The public page prerenders the approved source catalog and checks current active configuration. An outage hides stale rates and presents an explicit retry; reference prices are labeled during initial verification. Includes, surcharges and the source holiday eligibility caveat remain visible. Daycare and fictional preview rates/academy prices are removed from offered service navigation/content. Contact shows the supplied WeChat handle rather than the preview email/hours; no four-week course duration is asserted. Boarding-day expiry is described as pending rather than asserting the old three-month term.

Pricing configuration does not activate paid booking, purchases or refunds. Card provider/timing, mixed-payment date allocation/refunds, boarding-day expiry, quote-effective-date rules and monetary flooring stage remain decisions for dependent workflows.

## Pagination and discovery

Customers, pet cards, balance accounts, statements and employee operational records have Previous/Next, range/page information and 25/50/100 row controls in English/Chinese. Customer search and canonical customer/pet/date/activity authorization/filters execute on the backend before the relevant query limit. Search/filter changes reset the page; page navigation preserves filters and page size. Unknown totals are not invented.

Balances loads a bounded workspace directory page rather than downloading all pet rows merely to page the table. Customer/pet choice controls expose further backend result pages on demand, and account editors select canonical rows beyond the displayed table page. Statement CSV export follows all permitted filtered pages independently of the displayed page. Statement cursors bind the time/document anchor to the actual actor and filter scope, so deleting an anchor document need not invalidate an otherwise stable continuation.

Calendar window reads remain complete for occupancy visualization; date navigation is separate from record pagination. Administrative payment/withdrawal lists do not exist until their financial workflows are configured.

## Employee operations

Employees with an existing current employee claim can open House operations. Access comes from trusted `employeeAssignments/{uid}.houseIds` records, limited to 30 house IDs; clients cannot write these records. No employee role, account or assignment is created automatically. Administrators can open the same operations view from Calendar’s secondary action while retaining their four main navigation tabs. Administrators manage assignments through the Employee house access dialog on Calendar’s location-management page. Exact verified Google sign-in email finds only an existing active account already approved as an employee. Save rechecks that target status, validates existing house IDs and versions, and records immutable administrator before/after history plus idempotent receipts. It never creates an account or employee role. Clearing all selected houses revokes operational access.

House listing and operational queries use current assignments. Each booking read/action, handoff correction, weight verification and permitted private-photo request independently checks current access. Writes read assignments inside their transaction; replaying an old successful operation after assignment revocation does not bypass authorization. Employee access does not grant directory, pricing, balances, payouts, booking creation or cancellation permissions.

Actual arrival/pickup use the existing idempotent booking transactions, with staff UID and immutable history. Corrections preserve planned times and original actual values in history, reject invalid/future/reversed times, and coordinate house/pet schedule revisions and capacity/species conflicts. They do not override conflicts or introduce early/late charges/refunds. Weight verification is available to assigned employees while the pet is in care; administrator verification is also supported. Canonical weight, original value, responsible actor, time and booking reference are retained. Customer-visible pet projections expose verification weight/date, not internal staff UID. A later entered weight is distinct from a matching verified value.

The operational screen preserves house-local timezone/DST controls, phone/desktop layout, read-only planned/actual distinctions, and explicit verified versus entered weight. Refresh/re-entry checks assignments again. Private images remain authenticated and are limited to pets with an active placement in an assigned house.

## Verification and owner preferences

All Playwright configurations use isolated **headless Chrome**. Do not attach to, inspect, navigate or debug the owner's personal Chrome session. This supersedes earlier requests for headed local runs. Tests still navigate actual running local sites and real emulator-backed APIs; screenshots are supplementary evidence.

Use isolated named demo databases; never reset the owner's default demo database. See the latest session handoff for final executed test counts. The latest owner instruction authorizes signed feature PRs and sequential merges after validation. Deployment waits until all requested features are complete.
