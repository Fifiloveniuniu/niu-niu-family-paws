# Booking and multi-house delivery plan

Planning only — 2026-11-15. Owner has now authorized completing the PR sequence one PR at a time, including validation, merge and deployment. Do not invent unresolved business rules; complete independent work while requesting required decisions. Source: [requirements](requirements.md#booking-packages-and-multi-house-ux--owner-planning-2026-11-15).

## Delivery discipline

Owner changed delivery preference on 2026-11-15: focus on local development and deploy only once all requested features are complete. One locally usable feature/change per PR targeting main. Related contract, backend, frontend, and validation commits belong in the same feature PR; do not ship disconnected backend-only milestones as delivered features. Every commit must use the authorized signing identity and be GitHub Verified before merge. Preserve pending environment PR #24 and untracked dist-dev/. Do not push directly to main.

For implementation: resolve each feature's blocking decisions first; preview the actual localhost site in Chrome and walk the owner through it; validate bilingual desktop/mobile behavior, ownership/role boundaries, and relevant transactional edge cases; merge after CI and update the handoff; defer deployment until all requested features are done, then deploy the integrated merged app/API and verify live behavior. Use isolated test data for writes. No Sites hosting. Do not expose secrets or alter real records for testing.

## UX acceptance criteria

Customer navigation: My pets, Calendar, Packages. Admin navigation: Overview, Calendar, House map. Customers, Pricing & rules, Employee access, and setup belong in secondary management navigation. Employees see a scoped daily arrivals/pickups view.

House map is a core destination, not an optional enhancement. Select a house and date/time (default now), inspect named rooms/spaces and pets, and switch to the space timeline without losing context. Provide tap/click assignment actions and a readable mobile room list; no required dragging or hover. Customers see suitable availability without internal placements or other customer records.

Every UI release must support a common task with clear primary actions, plain language, sensible defaults, contextual details, cost/refund previews before commitment, and recoverable errors that preserve inputs. Walk through actual tasks locally in Chrome and simplify confusing or unnecessary steps before release.

## Proposed PR and commit sequence

Each numbered item is one PR/local milestone; deploy the integrated features once at the end. Commit titles are planned, not executed. Adjust scope after UX review; do not combine independent features to meet this outline.

### 0. Record the planning baseline (documentation only)

- `docs: record booking and package requirements`
- `docs: plan incremental booking deliveries`
- Review for contradictions, separate confirmed rules from proposals, and link the handoff. Documentation-only; no app deployment claim.

### 1. Manage houses

- `feat: add authorized house records and history`
- `feat: add bilingual house management and selector`
- `test: verify house access and responsive management`
- Outcome: admins can create/edit houses and select one. Needs actual timezone/address requirements and archive behavior.

### 2. Manage rooms, spaces, and constraints

- `feat: add room and space configuration with validation`
- `feat: add house layout and constraint editing`
- `test: verify capacity rules and house isolation`
- Outcome: a usable house setup/map with spaces and closures. Needs approved capacity and constraint model; occupancy arrives with bookings.

### 3. Record and approve pet weight

- `feat: add pet type and weight verification history`
- `feat: add customer weight entry and admin approval dialogs`
- `test: verify weight approval permissions and stale edits`
- Outcome: visible entered/approved weight and pending approvals. Needs units, permitted actors, and approval policy.

### 4. Configure package pricing and terms

- `feat: add versioned package rules and weight-band validation`
- `feat: add admin pricing and terms previews`
- `test: verify band boundaries and rule versions`
- Outcome: admins publish actual 30-day package offerings, three-month first-use validity and eligible months. Needs prices, bands, expiry boundaries, sharing, and rule-change treatment.

### 5. Configure holiday rates

- `feat: add holiday date and rate rules`
- `feat: add holiday management and price previews`
- `test: verify date boundaries and overlapping rules`
- Outcome: usable holiday configuration and quote preview. Needs holiday charge model and dates; no invented rates.

### 6. Purchase and view prepaid packages

- `feat: add confirmed purchases and idempotent balance ledger`
- `feat: add package purchase and customer balance views`
- `test: verify payment retries and package ownership`
- Outcome: customers can prepay and see usable packages. Online payment versus admin-confirmed external payment must be selected first; any external setup/billing needs explicit resolution. Preserve purchased terms; do not grant credit for unconfirmed payment.

### 7. Book stays with suitable availability

- `feat: add capacity and package reservation transactions`
- `feat: add customer booking calendar and review flow`
- `test: verify concurrent bookings and package eligibility`
- Outcome: complete booking workflow including admin approval if chosen, customer combined timeline, per-pet calendar, sufficient prepayment and clear holiday totals. Needs consumption/activation rules, holds, approval, and initial valid placement strategy. Include allocation needed to guarantee capacity; defer the visual map and richer assignment controls to PR 8.

### 8. Show bookings on the dynamic house map

- `feat: add timed occupancy and assignment validation`
- `feat: add house map and linked space timeline`
- `test: verify interval conflicts and responsive map actions`
- Outcome: core House map destination showing planned occupancy at a selected time, unassigned pets, space schedules, assignment/move dialogs, and a mobile room list. Retain valid initial allocations from PR 7; never silently move confirmed bookings. Needs movement and compatibility policies.

### 9. Record actual arrivals and pickups

- `feat: add authorized handoff records and corrections`
- `feat: add employee arrival and pickup actions`
- `test: verify handoff permissions and late pickup visibility`
- Outcome: simple daily employee list; actual times/actors shown in booking details and house map; overdue pets remain in care. Includes pending admin weight-verification reminder. Needs employee house scope, correction permissions, and late-arrival/departure rules.

### 10. Cancel bookings and process refunds

- `feat: add policy-based cancellation and refund ledger`
- `feat: add cancellation preview and confirmation`
- `test: verify refund cutoffs and duplicate cancellation`
- Outcome: cancellation releases capacity and applies approved full/half refund rules. Needs all refund/cutoff/expiry decisions and payment refund support if money is returned. May be prioritized immediately after PR 7 if required before opening booking to customers; do not publish refund promises without a working resolution path.

### 11. Extend stays

- `feat: add atomic extension quotes and reservations`
- `feat: add customer extension and admin review flow`
- `test: verify extension races and insufficient balance`
- Outcome: extend without losing the original stay on failure, respecting capacity, holidays, expiry and prepaid balance. Needs approval and extension-refund rules.

### 12. Deliver the cross-house admin overview

- `feat: add scoped occupancy and attention summaries`
- `feat: add all-house overview with actionable filters`
- `test: verify cross-house totals and operational status`
- Outcome: combined/single-house dashboard for arrivals, departures, capacity and issues. Earlier feature screens remain usable before this aggregate release.

### 13. Read-only customer preview

- `feat: add server-authorized customer preview reads`
- `feat: add customer preview banner and exit action`
- `test: verify preview isolation and revoked admin access`
- Outcome: admin can confirm a customer's view without writes, account credentials, or identity changes. Unlinked customers must be distinguished from signed-in customer accounts; do not imply they have login access.

### 14. Act on behalf of a customer

- `feat: add scoped impersonation sessions and actor audits`
- `feat: add explicit customer-action mode and exit`
- `test: verify scope expiry revocation and dual actor history`
- Outcome: admin performs permitted workflows with persistent banner and both actual/effective identities retained. No role or Google credential changes. Scope policy must be defined before writes.

### 15. Placement assistance (optional, after workflow review)

- `feat: suggest compatible space placements with reasons`
- `feat: add admin review and apply placement suggestions`
- `test: verify suggestions respect all constraints`
- Outcome: reviewed suggestions to improve capacity; no automatic movement or promised optimum. Algorithm objectives and owner approval required before starting.

## Validation emphasis

Use meaningful checks for authorization, duplicate requests, concurrent capacity/balance updates, timezone/expiry/cancellation boundaries, payment confirmation, weight/rate changes, and original-booking preservation on failed extension. Review actual local pages in Chrome, both languages and phone/desktop. Check local behavior after each feature; verify deployed behavior after the final integrated release. Owner authorized sequential execution on 2026-11-15. Resolve each feature's blockers before implementing dependent behavior.
