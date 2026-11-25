# Separate merging from production deployment

Pull requests run API type checks, unit tests, formatting and the frontend build. Merges to main also build a release artifact, but do not deploy.

After every requested feature is reviewed and ready for the final combined delivery, explicitly run the **Validate and release** workflow against **main** with **deploy** enabled. Its default is false. The existing matching API/frontend build, latest-main checks, Firestore index readiness and live release verification still apply. A PR event or ordinary push cannot enter the production deployment job.

Do not activate a final production release while the documented financial lifecycle decisions remain unresolved. Routine feature PRs can merge independently of hosting.
