# Product requirements

## Roles

- Administrator: manage all business records, employee access, balances, and reminder thresholds.
- Employee: view necessary customer/pet information and record drop-off/pickup events. No administrative account management.
- Customer: view only their own pets, balances, and service dates. Cannot edit balances or roles.

Customer records exist independently of login accounts. Account linking must use verified identity and administrator-controlled authorization, not a self-entered customer name.

## Service usage

Keep balances separate by service and unit (for example daycare days versus boarding nights). Each usage record identifies the customer, pet, service date, units consumed, and recording employee. Drop-off and pickup belong to the same visit. Corrections preserve an audit trail.

There is no separate attendance page; relevant service dates and drop-off/pickup information appear in existing views.

## Renewal reminders

Administrator-configured remaining-day thresholds are required. Proposed behavior: a global default with per-customer overrides and an option to disable reminders. Check eligibility following usage, balance changes, and threshold changes. Avoid repeating reminders for the same balance cycle; successful replenishment starts a new cycle. Define edge cases before implementation.

Emails include pet/service details, remaining days, and renewal contact instructions in English or Simplified Chinese. No checkout or payment history is included.

## Decisions still needed

- Company location/timezone, official Chinese name, contact details, domain, and branding assets.
- Whether drop-off/pickup means customer handoff at the business or employee transport.
- When a visit consumes days; cancellation, overnight, and partial-day rules.
- Whether packages expire and whether pets can share a balance.
- Login onboarding and customer account-linking workflow.
- Reminder defaults, replenishment behavior, and email provider/domain verification.
- Data retention, backup policy, and available Google Cloud billing/credits.

Do not treat these unresolved business rules as approved behavior.
