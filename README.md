# Niu Niu Family Paws Sitting LLC

A responsive English and Simplified Chinese company website and pet service usage tracker.

## Status

Planning only. This repository contains project documentation, not an implemented application. No cloud resources have been deployed.

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

Target Google Cloud project: `niu-niu-family-paws`. Billing, credits, regions, and service availability have not been verified. Free allowances are a cost target, not a guarantee; third-party email and domain costs are separate.

See [requirements](docs/requirements.md) and [architecture](docs/architecture.md).
