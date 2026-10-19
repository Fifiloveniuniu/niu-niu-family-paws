# Making changes to your website

You can ask Codex for changes in everyday English or Simplified Chinese. You do not need to write code, run commands, or manage GitHub yourself.

Open this project in Codex and say:

> Read AGENTS.md and docs/session-handoff.md, then help me update the website. I am the business owner and do not code.

Then describe what you want. For example:

- “Change our contact information to these details: …”
- “Update the daycare description in English and Chinese to say …”
- “The Chinese text is cut off on my phone. Please fix it.”
- “Show me what is already live and what still needs my decision.”

For a problem, describe what you clicked, what happened, and what you expected. A screenshot can help. For prices, services, contact details, package terms, or photos, supply the approved information or assets. Codex must ask about missing business rules rather than make them up.

## What Codex will handle

Codex will read the project instructions, make one complete change at a time, preview visible changes locally, and walk you through the result in the browser. It will test the change, open a GitHub pull request (a reviewable record of the change), merge it after validation, publish it, and check the live website. This workflow is already authorized; routine merges do not need another approval. Necessary account sign-in, business decisions, billing, or mandatory confirmations may still require your help.

Every release must keep English and Simplified Chinese working on phones and computers and preserve existing features. Hosting stays on Google Cloud: Firebase Hosting, Firebase Authentication, Firestore, and Cloud Run for the future API.

The live website is https://niu-niu-family-paws.web.app. A local preview is for reviewing changes; ask for the live link when a change is delivered.

## Information still needed

The handoff tracks the latest status. Pending business information includes approved public contact details, service location and timezone, services and rates, package rules, official Chinese business name, photos, and branding. Sign-in email addresses are not automatically approved public contact information.

Service tracking also needs decisions about drop-off/pickup, when units are consumed, partial days, overnight stays, cancellations, expiry, and shared pet balances. Payment history, income reporting, care notes, and a separate attendance page are outside the current agreed scope.

## Continuing on another computer or account

Use the same GitHub project, `Fifiloveniuniu/niu-niu-family-paws`, and ask Codex to read its instructions. The saved guidance travels with the repository; it does not automatically grant access to GitHub, Google Cloud, or administrator accounts. A new environment may need the owner's authorized sign-in. Never paste passwords, private keys, or verification codes into project files.
