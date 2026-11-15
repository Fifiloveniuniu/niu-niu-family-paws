# Development website

Owner selected a separate development website inside the existing Google Cloud project on 2026-11-14. English is the default; Simplified Chinese remains available. No extra billing account or project is needed for this arrangement. Additional database/storage/API usage uses existing project billing.

| Resource | Live | Development |
| --- | --- | --- |
| Google Cloud project | `niu-niu-family-paws` | same project |
| Website | `niu-niu-family-paws.web.app` | `niu-niu-family-paws-sandbox.web.app` |
| Cloud Run | `family-paws-api` | `family-paws-api-dev` |
| Firestore | `(default)` | `development` |
| Private photos | `niu-niu-family-paws-pet-photos` | `niu-niu-family-paws-dev-pet-photos` |
| Firebase Authentication | existing Google identities and roles | shared identities and roles |

## Separation

Development runtime identity `family-paws-dev-runtime@niu-niu-family-paws.iam.gserviceaccount.com` has `roles/datastore.user` conditioned on exactly `projects/niu-niu-family-paws/databases/development`, the existing Auth get-only custom role, and create/get access scoped to its private photo bucket. Production IAM bindings remain unchanged. IAM database conditions follow https://firebase.google.com/docs/firestore/manage-databases#configure_per-database_access_permissions . Existing production runtime permissions are project-scoped; this is resource separation, not full project-level isolation.

Runtime selects the named database and development bucket only in `FAMILY_PAWS_ENV=staging`, and rejects mismatched `K_SERVICE` or project values. A development service without its mode fails rather than falling back to live data. Browser access to both databases is denied by rules; API ownership/current identity checks remain in force. Development photo bucket has public access prevention, uniform access, and seven-day soft delete. Oregon database has deletion protection. Neither environment has automatic customer/audit deletion or a newly configured backup schedule.

Auth is shared intentionally: role changes and disabled/deleted login accounts affect both sites. Do not use Auth deletion or role changes as development cleanup. A separate website has separate browser sessions/preferences even though it uses the same Google identities. The development domain is added to existing authorized domains without replacing them.

Development Hosting uses a separate site, build output (`dist-dev`), API rewrite and noindex headers. The public/sign-in/portal pages display a persistent test warning in the selected language. Default language is English. No email sender exists yet; future reminder testing must use a sink or designated recipients.

## Owner use

Open https://niu-niu-family-paws-sandbox.web.app/#/login and use the same approved administrator Google account. Try customer and pet edits here with synthetic data only. The directory starts with Alex (Mochi and Biscuit) and 林小雨 (豆豆 Doudou); every name includes `[TEST / 测试]`.

## Maintainer commands

- `npm run build`: production frontend, output `dist`.
- `npm run build:staging`: development frontend, output `dist-dev`, shared Firebase web config.
- `npm run deploy:dev`: build and deploy only the sandbox Hosting site using `firebase.dev.json` and the existing project.
- `npm run seed:dev`: add-only deterministic fixtures in the `development` database. Cannot select production or an arbitrary database; preserves existing records and never deletes or resets edits.
- `npx firebase deploy --only firestore --config firebase.dev.json --project niu-niu-family-paws --non-interactive`: development rules/indexes only.
- `cloudbuild.dev.yaml`: separate `api-dev` image using the existing builder/source bucket/repository. Cloud Run uses `FAMILY_PAWS_ENV=staging`, `GCLOUD_PROJECT=niu-niu-family-paws`, zero minimum/two maximum instances, 512 MiB, concurrency four and request-based CPU.

Development API image built successfully in `3acb36bd-f5fe-4024-bbe0-586e2112f3e7`: `us-west1-docker.pkg.dev/niu-niu-family-paws/family-paws/api-dev@sha256:da6be0215e95442c1acd976014ab0c49d444112a7009da788d6638ac5f31dc2f`. Initial revision `family-paws-api-dev-00001-7r9`. Automatic development request URL logs are excluded to avoid search-term logging; application/system logs remain.

## Release verification

Production/development builds, API TypeScript, 11 unit tests, four database/image integration tests, nine existing browser tests and one development layout/banner test passed. Development test covers English/Chinese, 320/400/1280px, public/sign-in navigation and overflow. Native Chrome local review verified banner and both languages, left English. Screenshot `docs/screenshots/development-preview-mobile-en.png` contains only public content.

Local machine starts with Node 22; project requires Node 24. Browser runner passed with `npm exec --yes --package=node@24 -- npm run test:browser`. Integration tests passed with Node 22's explicit `NODE_OPTIONS=--experimental-strip-types`. No application source was changed to accommodate the local runtime.

Hosted frontend verification and production sample cleanup are pending until merge/Hosting deployment. The original two live test customers must remain until dev is usable; inspect exact record versions before cleanup and preserve real profiles, identities and all real pets/history.

## Earlier project attempt

Before the owner chose one project, the separate `niu-niu-family-paws-dev` project (Firebase/web app enabled) and `niu-niu-family-paws-test` cloud project were created. Firebase terms were accepted after owner confirmation. Linking the existing billing account failed for lack of `billing.resourceAssociations.create`. No new billing association was made. These earlier projects are unused and were not deleted. Do not resume provisioning them or delete them without an explicit request.
