# Local dialog and holiday review — 2026-11-20

Local implementation only. No commits, PRs, production writes or deployment.

- `modal-customer-outline.png`: inset customer field focus.
- `holiday-country-groups.png`: scrollable, DB-backed grouped holiday editor.
- `focus-vscode-dark-customer-phone.png`: Simplified Chinese customer modal in dark theme at 390px.
- `focus-google-holidays-phone.png`: phone holiday editor.
- `routed-house-edit.png`: canonical record dialog restored from its URL.

Actual localhost headless Chrome checks opened 33 dialog routes and inspected 82 visible fields. Additional phone checks covered 76 fields across 16 dialogs/four themes, without clipped focus or horizontal overflow. Refresh, Back/Forward, rejected/accepted unsaved changes, nested closure, All customers and selected customer labels passed. No business records were saved. Production build, API typecheck, formatting and 95 Node 24 unit tests passed.

Catalog entries are references, not automatic surcharge dates. India 2028 has verified fixed dates only and explicitly reports unavailable movable dates. Existing configured pricing and selected holiday dates were preserved. Financial workflow limitations remain in the session handoff.
