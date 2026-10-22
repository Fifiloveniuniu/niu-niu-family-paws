# Pet profiles and private photos

One feature: owners add multiple named pets, then add or replace photos when ready. The owner explicitly approved adding photos later on 2026-10-22. Administrators manage the same pet records for a selected customer and search pet-name prefixes. Customer-name/Google-email search remains in the customer directory. No linking, reassignment, impersonation, service balances, visits, deletion, or role changes are included.

## Storage and authorization

Canonical records: `customers/{customerId}/pets/{petId}`. UUID identifies each pet; names need not be unique. Every list/save/photo request verifies the current Firebase account and requires either the current administrator claim or a verified Google identity matching the canonical customer's `ownerUid`. The browser cannot access Firestore directly. Search across customers is administrator-only, joins current customer name/login email rather than copying them into pet records, and paginates 50 matches at a time. `nameKeys` has a collection-group array index.

Saving uses a Firestore transaction, optimistic versions, identical-request retry handling, and `history/{version}` with the actual actor, source, before/after and timestamp. Ownership is checked before image processing and again inside the save transaction. Payloads cannot assign ownership, select object names, or change roles. Customers need to save their profile first; administrators can manage pets for unlinked contacts without claiming those contacts as their own.

Private bucket `niu-niu-family-paws-pet-photos` is in owner-approved `us-west1`, with uniform bucket access and enforced public-access prevention. Runtime custom role `familyPawsPhotoAccess` grants only `storage.objects.create` and `storage.objects.get`, scoped to this bucket. No public ACLs, signed URLs, download tokens, or browser Storage access. Photos are fetched through the authenticated API with `private, no-store`; the frontend keeps data URLs only in its mounted state.

Uploads accept JPEG/PNG/WebP, at most 3 MiB and 16 megapixels. Server checks signatures, decodes, rejects animation/other formats, auto-orients, resizes within 1200×1200 and reencodes WebP without source metadata. See [Sharp input safety options](https://sharp.pixelplumbing.com/api-constructor/) and [output metadata behavior](https://sharp.pixelplumbing.com/api-output/). One decoder per instance, bounded cache and route body limit protect memory; busy requests safely retry. Content-addressed immutable objects use create-only generation preconditions. The browser freezes an uncertain save so its retry keeps the same pet ID, version and image.

Historical images remain private for audit/recovery. An upload that succeeds before a failed/conflicting database commit can also leave a private unreferenced object. No automatic image/customer/audit expiry is introduced while business retention/recovery policy is unresolved. Runtime cannot delete objects. Bucket soft delete protects operator deletions for seven days; this is not an automated backup or business recovery plan.

## Delivery checks

Implementation and emulator verification in progress. Before delivery: GitHub CI, real local production walkthrough with synthetic pets/photos, merge, Firebase Hosting deployment, live authorization/privacy/persistence/bilingual/mobile checks, exact synthetic-data cleanup and final handoff. Do not describe this as live until those steps complete.
