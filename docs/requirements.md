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

## Shared sign-in, multiple roles, and administrator impersonation — 2026-10-19

Use one prominent bilingual sign-in entry for customers, employees, and administrators. A verified Google identity may have multiple authorized roles; do not force a person into mutually exclusive administrator/employee/customer accounts. An administrator can also own pets and use customer workflows for their own pets.

Avoid duplicate information: one canonical person/profile per verified identity, with role assignments referencing it. Customer/employee views reuse profile information and pets rather than copying records. Each pet has one stable record. Do not automatically merge people on matching names or editable contact email; linking pre-existing records still requires administrator authorization and verified identity. Account linking must preserve history and references.

Administrators may impersonate any customer or employee for their business workflows. Implement this only with server-authorized, scoped impersonation sessions; never grant the browser permission by selecting an account ID or modifying another account's claims. Every operation must retain the actual administrator actor and the effective customer/employee identity in its audit record. Display a persistent, prominent impersonation banner with the target identity and an exit action. Leaving impersonation returns to administrator context. Revoked administrator access must terminate impersonation authority. Impersonation must not expose passwords, allow changing another person's Google credentials, or silently grant roles. Switching to the administrator's own customer context uses that same person's existing profile and pets.

Delivered: shared sign-in, administrator customer-contact editing, and UID-owned customer name/language registration. Administrators and staff can use the same personal profile panel. Customer profiles share canonical records with the administrator directory, including server-maintained Google login email search. Pet editing/photos, linking existing records, employee business workflows, explicit role/context switching, and impersonation remain subsequent features; do not present them as delivered.
