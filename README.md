# Niu Niu Family Paws Sitting LLC

A responsive English and Simplified Chinese company website and pet service usage tracker.

## Status

The public website is hosted at https://niu-niu-family-paws.web.app on Google Firebase Hosting, project `niu-niu-family-paws` (number `775511787236`). The responsive English/Simplified Chinese site uses React, TypeScript, Vite, and react-i18next, with prerendered public content. HTTPS, language switching, and FAQs have been verified on the hosted site. Business contact details, rates, and photos still await owner input.

Shared Google sign-in and administrator customer contact management are live at https://niu-niu-family-paws.web.app/#/login. Administrators can add, edit, and search names/contact emails, with audited edits stored through the Cloud Run API in Firestore. Customer self-registration, pets, balances, employee workflows, and reminders remain future features. See [the customer-management release](docs/release-3.md).

## Run and deploy

```sh
npm ci
npm run dev
npm run build
npx firebase login
npm run deploy
```

Deployment requires access to the Google Cloud/Firebase project `niu-niu-family-paws`. `npm run deploy` builds and deploys the frontend to Firebase Hosting. Authentication, the Oregon Firestore database, database rules, and Cloud Run API are already provisioned. API changes require a separate container build and Cloud Run deployment; Hosting pins its API rewrite to a backend revision. See [deployment details](docs/customer-management-draft.md).

The language switch remembers the selected language when browser storage is available. FAQs use accessible native disclosure controls. The dog artwork is an original SVG illustration, not a business photo.

Before public launch, confirm contact details, location, offered services, prices, packages, and business photos. Missing contact details and prices are explicitly identified on the page. No bookings are collected.

Deliver one feature at a time. Each release must have a verified hosted URL, usable mobile and desktop workflows, both languages, and working prior features. Do not begin the next feature before the current release is delivered.

## Scope

- Public company landing page with services, packages, prices, photos, contact information, and sign-in.
- Customer portal showing their pets, purchased/allocated days, used and remaining days, and dated service usage.
- Employee portal for recording pet drop-offs and pickups.
- Administrator portal for managing customers, pets, employees, services, packages, balances, and renewal reminder settings.
- Renewal emails in the customer's preferred language when remaining days reach an administrator-configured threshold.
- No purchasing flow, payment records, income reporting, care notes, or separate attendance page.

## Proposed stack

| Area | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Radix UI |
| Navigation and data | React Router, TanStack Query |
| Forms and validation | React Hook Form, Zod |
| Languages | react-i18next: English and Simplified Chinese |
| Backend | Node.js, TypeScript, Fastify |
| API contract | REST/JSON with OpenAPI and generated TypeScript client |
| Authentication | Firebase Authentication |
| Database | Firestore |
| Hosting | Firebase Hosting and Cloud Run |
| Renewal emails | Cloud Tasks and Resend (proposed provider) |
| Secrets and observability | Secret Manager, IAM, Cloud Logging, Cloud Monitoring |
| Validation and delivery | Vitest, Playwright, GitHub Actions, Artifact Registry |

Target Google Cloud project: `niu-niu-family-paws`. Billing is enabled, and the owner approved Oregon (`us-west1`) for the database and backend. Cloud Run scales from zero to two instances. Free allowances are a cost target, not a guarantee; third-party email and domain costs are separate.

See [requirements](docs/requirements.md) and [architecture](docs/architecture.md).
