## Current app-family implementation — 2026-11-18

Four curated families: **Google**, **Apple**, **Microsoft Light**, **Microsoft Dark**. Google Calendar and Gmail share one Google preset. The default is Google; legacy preferences migrate to these four families. Colors, typography, geometry, interaction states and native-style icon families change together. Source links are in `theme-catalog.ts`; selected SVG sources are in `theme-icons.json`, with original licenses and attribution in `public/licenses`. Apple-style icons use Lucide, not restricted Apple SF Symbols.

Marketing retains original forest/porcelain colors and has no theme control. App attributes are removed on public routes. Text uses semantic paired foreground/background roles, opaque disabled/placeholder labels and atomic theme updates. Browser walkthroughs check actual composited text contrast, wrapping, dropdown selection, error messages and all four themes.

Calendar hierarchy uses roof/door icons and bilingual captions. House rows have no colored background; room rows have no full-width horizontal divider. Pet rows indent 64px and grow for long content, with no extra line above the first pet. Settings/add controls sit on the icon row at the right edge of the left label panel. One continuous vertical grid reaches through the timeline and location rows. Now has a separate readable header lane. Shared main/booking timeline primitives preserve positions and scrolling.

House/room editing owns one native dialog. The whole booking dialog scrolls beneath a fixed progress header; its calendar scrolls horizontally. Current/completed/upcoming steps use theme roles, including the connector. Modal scroll ownership locks the underlying page and restores prior state.

The sections below record earlier design iterations; this section supersedes conflicting palette, hierarchy and icon advice.

# Shared UI design

## Named app presets — current owner direction

The owner clarified that they want familiar apps' actual visual language, not invented palettes inspired by editor themes. Keep a small curated set: **Google (default), Apple, Microsoft Light and Microsoft Dark**. Removed the Kiln/Harbor/Grove/Atelier collection, the separate Soft/Clean switch and the additional editor/terminal choices. A preset bundles colors and component treatment.

| Preset | Base / chrome | Primary action | Component treatment |
| --- | --- | --- | --- |
| Google | White / `#f8fafd` | `#0b57d0` | Rounded panels, pill controls, circular date selection, blue active navigation |
| Apple | White / `#f2f2f7` | `#e9152d` | System typography, fine gray boundaries, compact rounded controls, red active details |
| Microsoft Light | White / `#f8f8f8` | `#005fb8` | Precise small corners, flat cards, blue focus, underlined active navigation |
| Microsoft Dark | `#1f1f1f` / `#181818` | `#0078d4` | Complete dark surfaces, small corners, flat cards, light text, blue focus and underline |

Sources are linked in `theme-catalog.ts` and the picker's “View original theme” action:

- [Google Calendar's published Material 3 refresh and screenshots](https://workspaceupdates.googleblog.com/2024/10/new-look-and-feel-and-dark-mode-google-calendar.html). Verified key base/chrome/blue colors against its published light-mode screenshot.
- [Google's Gmail redesign and screenshot](https://blog.google/products-and-platforms/products/gmail/gmail-design-update/). Verified the pale blue/white surface relationship against the published screenshot.
- [Apple system colors and contrast guidance](https://developer.apple.com/design/human-interface-guidelines/color.md) and [Calendar on Mac](https://support.apple.com/guide/calendar/get-started-iclc0d84c7fa/mac). Use Apple's increased-contrast red (`233,21,45`) for readable action text, with system-red accents and gray surfaces. This is a web mapping of Calendar's visual language, not a clone of macOS window behavior or Liquid Glass.
- Microsoft's original [Light Modern](https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/light_modern.json) and [Dark Modern](https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/dark_modern.json) token files. Preserve core foreground/background/button values.

App-specific house/room hierarchy and semantic status fills are mapped onto each source palette. Calendar availability/completion remains green, warnings amber and errors red, with readable foregrounds; icons come from the separately credited open-source families and presets do not change business workflows. Do not describe these choices as a measured popularity ranking or claim pixel-identical copies of proprietary apps.

## Whole-component consistency and readability

`theme-presets.css` defines complete preset roles and base geometry. `theme-components.css` applies preset typography, shape, spacing-preserving surfaces, borders, focus and states throughout app navigation, buttons, icon actions, search, fields, selectors, autocomplete, date pickers, cards, badges, tables, calendars/timelines, management dialogs, pet-detail popovers, feedback and disabled controls. Fixed older standalone forest/cream rules in management and employee components. Preserve actual pet artwork rather than recoloring it as UI chrome.

Text uses readable source-palette foregrounds rather than faint decorative accents. Selected/hover states pair foreground and background together; disabled controls and placeholders retain readable text at full opacity. Form labels/helper copy remain readable, long labels wrap, and select values can wrap instead of truncating. Keep touch targets, existing modal scroll ownership and non-overlapping calendar lanes. Light presets use light work areas; VS Code Dark uses dark fields, dialogs, dropdowns, calendars and tables as well as chrome.

The browser tests check rendered normal, secondary, selected and disabled text against composited ancestor backgrounds at a minimum 4.5:1 in covered screens, including CSS color-mix fills, with phone/desktop layout regressions. This is selected automated coverage, not whole-app accessibility certification for every possible content combination.

## Preference scope

Appearance is available only in app headers (palette icon or mobile Menu → Appearance). Public marketing retains its original forest/porcelain palette, shapes and metadata and has no theme button. Stored preferences do not affect public pages, including after client navigation, history or cross-tab updates. Returning to the app restores the saved choice.

`theme-preferences.ts` validates version-2 browser-local palette names and migrates old custom or removed presets to supported choices. The selected preset controls `data-color-theme` and `data-ui-style`; there is no independent shape choice. Initialization occurs before React mounting, with no inline script/CSP relaxation. Storage failure falls back to session-only changes with a visible explanation. English and Simplified Chinese are supported.

## Historical warm Material baseline (superseded by named presets)

The following roles document the earlier warm baseline; they are not the current default or a selectable preset. Shared component/state structure remains relevant.

## Color roles

`apps/web/src/material-theme.css` owns the shared palette and interaction treatment. Reuse these roles instead of adding independent shades to a new screen.

| Role | Color | Use |
| --- | --- | --- |
| Primary | Terracotta, `#9c4f2e` | Primary actions, current steps, focus |
| Primary container | Peach, `#ffe0cc` | Selected menus/tabs and requested stays |
| On primary container | Espresso, `#4a2817` | Text on peach selection surfaces |
| Surface | White, `#ffffff` | Work areas, dialogs, fields, menus |
| Surface container | Warm cream, `#faf0e6` | Summaries and table headings |
| Surface container low | `#fff9f3` | Header/footer chrome and subtle surfaces |
| House header | Sandstone, `#f3ddc9` | Strong full-width parent grouping |
| Room header | Cream, `#fff9f3` | Lighter, indented child grouping |
| Secondary container | Warm gray, `#f2e8df` | Neutral/inactive states and icon hover |
| Disabled | `#ebe5df` / text `#6d6158` | Inactive actions with readable labels |
| Primary soft | `#fff0e6` | Soft peach interaction/hover surfaces |
| Success/availability | `#ebf4e8` / `#2e6b45` | Available space and favorable outcomes |
| Success container | `#d9ebd5` / text `#193a24` | Completed steps and pets in care |
| Error | Material error, `#b3261e` | Errors with explanatory text |
| Warning container | `#fff4ce` / text `#7a4d00` | Overdue/warning states with text labels |

Terracotta/white primary text has 5.88:1 contrast; espresso on peach has 10.45:1, and disabled gray labels on neutral fills have 4.80:1. Shared controls use the same role pairs across pages and dialogs. Secondary icons/helper text are neutral; validation errors remain red. Availability and completion use dedicated green success roles. Fields have warm neutral outlines matching search fields and terracotta focus indicators. Keep standard action/close targets readable and respect reduced-motion settings.

## Components

Reuse `Modal`, `Icon`, `CustomSelect`, `CustomAutocomplete`, `CustomDateInput` and `LocationLabel`. Shared dialogs provide native modality, focus containment, Escape handling and focus restoration. Keep their trigger elements mounted while refreshing data so closing a dialog can restore keyboard focus. Root scrolling stays locked until the final modal closes.

Use the existing primary/secondary action classes with the shared theme. Avoid new one-off button, field, menu, backdrop and feedback treatments. Give secondary icon actions accessible names and tooltips. Show status text as well as color.

## House and room hierarchy

Use `LocationLabel` consistently in the main calendar, booking calendar and location management. Houses have a roof icon, localized House caption, larger bold name and a full-width sandstone header. Rooms have a door icon, localized Room caption, smaller name, indentation and a lighter child surface. Hierarchy must remain recognizable without color. Let names wrap and rows grow; do not reintroduce fixed heights or let timeline bars paint over sticky labels.

## Calendars

`calendar-timeline.tsx` provides four components used by both the saved main calendar and the Add/Edit booking calendar:

- `CalendarViewport`: keyboard-focusable horizontal scrolling and a localized hint when dates extend beyond the viewport.
- `CalendarFrame`: shared minimum column widths so day, week, month and year labels remain legible.
- `CalendarAxis`: localized time/date ticks aligned to actual instants; repeated DST hours display their distinct UTC offsets.
- `CalendarTrack`: the same time grid behind occupancy and availability, optionally with non-interactive lines over availability fills.

`timeline-layout.ts` owns day boundaries, exact proportional positioning, clipping spans to the visible window, grid lines, and the visible date-range label. Treat the end of the displayed interval as exclusive. Never divide a DST week into equal elapsed-time days or draw unclipped spans outside the window.

Booking availability and requested stays use separate vertical lanes. Keep visible interval labels in a legend and readable row actions; variable-width bars retain full accessible names and date tooltips. Do not place text inside a bar that can shrink to a few pixels. Room rows grow for wrapped names/statuses, and house headings fit the viewport. Isolate track stacking so bars cannot paint over sticky room labels when panning.

The booking dialog scrolls its form, room list and footer together. Its title and progress bar stay fixed at the top. The calendar pans horizontally but never owns a separate vertical scroll area. House headings are not repeated for adjacent rooms in the same house.

## Validation

Use isolated headless Chrome, never the owner's personal browser. `material-ui.spec.ts` walks the actual local pages and shared dialogs in both languages at 390px and 1440px; it checks viewport containment, button contrast, close-target dimensions and keyboard focus restoration. `booking-layout.spec.ts` checks calendar alignment, clipping, DST, horizontal overflow, whole-dialog scrolling and fixed progress. Pure layout tests cover both DST transitions and out-of-window occupancy. Inspect the screenshots as well as the assertions. These selected checks do not certify every possible business state or the older legacy test suite.


## Palette references

The component/state structure follows Google’s [Calendar Material 3 refresh](https://workspaceupdates.googleblog.com/2024/10/new-look-and-feel-and-dark-mode-google-calendar.html), [Workspace refresh](https://workspaceupdates.googleblog.com/2023/03/refreshed-ui-google-drive-docs-sheets-slides.html) and [Material color roles](https://m3.material.io/styles/color/the-color-system/). Colors are customized to the owner’s warm-style preference; they are not Google’s product colors.

Keep each container paired with its on-color. [WCAG text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) specifies 4.5:1 for ordinary active text, with exceptions; checks additionally keep disabled labels readable. Selected color measurements do not certify every app state against all WCAG criteria.

## Review captures

Isolated demo data: [Google calendar](screenshots/design-google-calendar.png), [Apple calendar](screenshots/design-apple-calendar.png), [Microsoft Dark booking](screenshots/design-microsoft-dark-booking.png). These captures supplement the actual headless localhost walkthroughs.
