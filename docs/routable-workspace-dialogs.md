# Routable workspace dialogs and calendar controls

Workspace dialogs store canonical authorized record identifiers and flags in URLs. Draft fields remain in memory, with discard protection on navigation, refresh/Back/Forward restoration and localized unavailable errors. Shared editable dropdowns filter choices without changing a saved selection until a choice is committed.

Calendar customer/pet filters use canonical IDs and can show matching locations. The page/dialog owns vertical scrolling while the calendar retains horizontal panning; shared axes, Now markers and Today controls align across views. Unsaved drafts retain confirmation protection without a status banner. This layer also carries the previously reviewed visual consistency adjustments needed by those shared controls.

Local validation: production build, formatting and unit checks. This change remains separate from the later holiday catalog, test-payment funding and account-management layers. No production deployment is triggered by merging it.
