# Shared sign-in

The public header contains the only sign-in link, pointing clearly to `/#/login`. The hero and footer do not repeat this entry. Customers, employees, and administrators use the same Google sign-in button. The former `/#/admin` link continues to work.

Verified accounts with a boolean `admin: true` claim see the existing administrator dashboard. Otherwise, a boolean `employee: true` claim shows the staff landing page; other verified accounts see the customer landing page. Unverified accounts cannot enter these states. This is frontend routing only, not authorization for future business APIs. No role can be chosen or granted from the browser. Current roles refresh on visibility return or explicit refresh. Existing administrator dashboard and sign-out behavior remain intact.

Customer and staff landing pages explain that their business workflows are still pending. This release does not save customer/pet profiles, implement impersonation, create employee access, or deploy a business database/API. Multiple-role context switching and administrator impersonation follow as backend features, using canonical profiles without duplicating pet records.

Validation: production build, two role unit tests, and three Chrome/Auth emulator tests pass. Browser coverage includes unverified/customer/staff/admin states, strict boolean role claims, role removal, sign-out, legacy administrator URLs, shared entry navigation, bilingual persistence, FAQ regression, and 400px overflow. Previewed the production build in native Chrome, including the Chinese homepage and shared sign-in page. Review screenshots are under `docs/screenshots/shared-login-*`.


Delivered through PR #6, commit `59dc3e6`, to Firebase Hosting on 2026-10-19. Live checks confirm one homepage sign-in link in each language, language persistence, FAQ expansion, mobile fit, both login URLs, and no page errors; hosted HTML matches the release build exactly. Real Google administrator login also passed against the local production preview. Live URL: https://niu-niu-family-paws.web.app/#/login.
