# Main-branch automatic releases

Owner instruction: GitHub runs deployment only after merges to `main`, with no PR tests or post-merge test suite. Develop, validate and preview locally; merge signed, focused PRs into `main`. Feature branches and PRs never deploy. Manual retry is available for `main` only.

The build job installs dependencies, builds the production frontend and stamps it with the exact main SHA. It does not run formatting, API type checks, unit tests, emulator integrations or Chrome journeys. The frontend build retains its required TypeScript compilation check. The built frontend is passed to deployment as an artifact. Newer main commits cancel outdated builds; deployment jobs are serialized and never automatically interrupted. A deployment that is already stale when it starts skips publication.

Deployment uses existing resources in `niu-niu-family-paws` / `us-west1`: the `family-paws-build` builder, `family-paws` Artifact Registry repository, `family-paws-api` Cloud Run service, default Firestore database and Firebase Hosting. Runtime configuration and scaling remain unchanged. The API is built from a restricted source archive and deployed by image digest, with a unique SHA/run-based revision name. Direct API health/public-pricing checks run before frontend publication. Firestore rules/indexes deploy without `--force`, preserving extra index/field definitions; required composite and single-field indexes must become READY before Hosting is published. Hosting retains its pinned matching API revision. No sample records or financial workflows are activated.

The workflow verifies `/release.json` against the merged SHA, public pages, direct API health, the proxied public-pricing endpoint and unauthenticated private-API rejection. The public manifest is non-cacheable. Failed builds never deploy. A failed deployment stays visible in Actions; rerun the failed deployment job after addressing the reported cause. Do not hide failures by skipping checks or granting broad editor/owner access.

## Cloud authentication

No service-account key was created or placed in GitHub. Workload Identity Federation trusts GitHub's issuer only for numeric repository ID `1426263668` and `refs/heads/main`. It can impersonate only `family-paws-github-deploy@niu-niu-family-paws.iam.gserviceaccount.com` through this provider:

`projects/775511787236/locations/global/workloadIdentityPools/github-main/providers/github`

These public identifiers are repository variables `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_DEPLOY_SERVICE_ACCOUNT`. The deployment identity has project deployment metadata/build submission, Hosting, rules and index management; Cloud Run developer access on the existing API service; act-as on the existing runtime/builder accounts; repository reader access on the existing image repository; and staging-object access only on the build-source bucket. It has no direct customer-document or pet-photo access and cannot administer IAM. Existing permissions and policies were preserved.

Generated `gha-creds-*.json` files, credentials, keys, environment files, local records and unrelated frontend assets are excluded from API source archives and containers. Do not commit or upload credentials. Official setup references: [Google GitHub authentication action](https://github.com/google-github-actions/auth) and [Google deployment-pipeline federation](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).
