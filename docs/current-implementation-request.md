# Current implementation request — 2026-11-18

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
