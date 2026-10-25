# Verified account linking

Owner approved the workflow: administrator issues a one-time code, customer submits it after Google sign-in, administrator verifies and approves. This release links an unclaimed administrator-created customer record to a verified Google identity that has not saved a separate personal profile. Existing profiles are never merged, moved or overwritten automatically. Resolve existing duplicate profiles with the owner before designing a reconciliation workflow.

## Owner workflow

In customer management, choose **Link Google account** beside the existing customer. Generate a code and share it privately with that customer. Codes last 24 hours and are shown once in the current panel. Generating another code invalidates the old code and any pending request. No email is sent automatically.

The customer signs in with their own Google account, enters the code under **Already registered with us?**, and submits. While pending, the new-profile form is hidden to avoid accidental duplicate registration. They cannot access the original records until approved. The administrator reopens the same customer's linking panel or chooses **Check status**, verifies the displayed customer and Google email through their existing business relationship, then approves. Reject or cancel incorrect requests. After approval the customer chooses **Check status**, reloads, or signs in again to see the original profile/pets.

中文：管理员在原客户旁点击“关联 Google 账号”，生成关联码后私下交给客户。客户使用自己的 Google 账号登录，在“之前已登记过资料？”中输入关联码并提交。管理员查看最新状态，核实客户和已验证的 Google 邮箱后点击“批准关联”。客户再次查看状态或重新登录，即可看到原资料和宠物。24 小时内有效；重新生成会使旧码和申请失效。已有另一份个人资料的账号需要另行处理，不会自动合并。

## Data and authorization

- Current token/account status is verified on every API request. Code submission requires verified Google sign-in; issue/review/decision require current administrator authority. Approval re-reads the target Firebase account (active, verified email, Google provider) and requires the email to match the reviewed request.
- Codes contain 128 random bits. Only SHA-256 digests are stored. Codes travel in a request body, never URLs, browser storage, email or logs. Claim attempts are limited to 10/minute in addition to the API's general limit. Error responses do not reveal an unapproved customer's details.
- `customers/{id}/accountLink/current` holds the current digest, state, monotonically increasing version, expiry, actual actor and verified requester identity. `accountLinkCodes/{digest}` is the lookup; `accountLinkRequests/{uid}` is the customer's private status pointer. Superseded lookup entries cannot authorize access because the current digest/state is rechecked.
- States: open → requested → approved/rejected/cancelled. Time-expired open/requested states cannot be claimed/approved. Rotation replaces the current state. A customer can hold only one active pending request; a code can be reserved by only one identity.
- Approval transaction checks the reviewed link/customer versions, unclaimed customer, absent `people/{uid}` mapping, current request UID/email and expiry. It adds `ownerUid`/trusted `loginEmail` and `people/{uid}` pointing to the SAME customer ID; contact fields, pets, private photo keys, old histories and references remain in place. Versions/search keys update and a customer history entry records actual administrator/effective UID. `linkHistory/{version}` audits lifecycle actions. Retries of the same decision do not create another grant/audit.
- If registration or another administrator wins a race, approval fails safely. Stale customer changes require a fresh review. No identity credentials/roles are modified. Direct browser Firestore access remains denied and runtime IAM is unchanged.

No automatic deletion/retention policy is added. Expired code hashes, status pointers and audit history remain private until a retention policy is agreed. No new service, email provider or billing configuration is required. Deploy the link-capable API before the frontend; retain a metadata-preserving pet-capable API for any rollback. Old frontends remain compatible.

## Validation

Nine unit tests, four Firestore/image integration tests and nine browser tests cover role/Google/UID injection boundaries, rate limiting, stale versions, disabled/changed target identity, expiry, rotation, rejection/cancellation, concurrent claimants, retry-safe approval, duplicate-profile races and preservation of canonical customer/pet/photo/history data. Browser suite business requests are mocked. A separate CUA walkthrough used actual local API + isolated demo Auth/Firestore, with Google-provider test identities, to issue/submit/review/approve and then display the original pet under the customer's login. Chinese 400px layout had no overflow. Screenshots use only synthetic demo data and no usable code. Deployment/live validation results will be recorded in the handoff.
