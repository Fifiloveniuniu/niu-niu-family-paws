# Marketing content and visual assets

The marketing site remains on Firebase Hosting. No Sites hosting, private customer data, or financial data was added.

## Public content

`public/marketing-content.json` is a versioned, public-only publication snapshot. All marketing sections share one request per page load and reuse its approved totals for every animation replay. Scrolling and returning to the tab do not refetch or recompute totals; reload the page to obtain a new snapshot. A failed request may retry when another route mounts. The current production snapshot is deliberately empty. There is no completed-service aggregate API or automatic business-record publisher yet; do not describe the current totals as live business statistics.

Only the known aggregate keys `petsCaredFor`, `groomingAppointments` and `groomersTrained` are displayed. Each needs a non-negative safe integer `value`, `verified: true` and a past ISO `asOf` timestamp. The displayed date is the metric's date, never a generated claim of freshness. An empty total shows its illustration, label and pending caption without a numeric placeholder or horizontal bar, never an invented zero. No records/names are counted on the client and no private directories are fetched. Before connecting a real publisher, confirm unique pets versus visits, completed appointments and completed students, exclusions/corrections and publication consent.

`testimonials` and `studentStories` accept only `approved: true`, bilingual `quote` and `attribution` objects with `en`/`zh` strings. Do not add fabricated quotations, stars, ratings or fictional people. Home features the first approved quote as an explicitly shortened excerpt when necessary; About's family-stories section shows full approved wording.

`spacePhotos` and `studentPhotos` accept only `approved: true`, local `/images/marketing/` asset paths, bilingual `alt` and `caption`. These replace the stock gallery in their respective pages. Consent must cover public use of any premises, identifiable people, student work or customer pets. Keep unpublished material out of the public JSON. The business owner can supply changes in everyday English or Simplified Chinese; Codex handles implementation, validation and delivery.

## Photo sources

Downloaded2026-11-17 and resized to WebP. Current photos are clearly labelled grooming inspiration, not this business's premises, equipment, customers, students, classes or student work. They must not be relabelled as real business photos.

| Local file | Photographer | Source |
| --- | --- | --- |
| grooming-tools.webp | Gustavo Fring | https://www.pexels.com/photo/vet-with-dog-6816846/ |
| gentle-wash.webp | Tima Miroshnichenko | https://www.pexels.com/photo/close-up-photo-of-bathing-of-dog-6131161/ |
| coat-care.webp | Tima Miroshnichenko | https://www.pexels.com/photo/close-up-photo-of-bathing-of-dog-6131165/ |

License: https://www.pexels.com/license/. Credits are also shown beside the gallery photos. Original vector illustrations remain the site's own artwork.

## Typography

Lora, Nunito Sans and Caveat are self-hosted variable fonts from https://github.com/google/fonts. Their SIL Open Font License notices are retained under `public/fonts/`. English headings/body/cute accents use those three families respectively. Simplified Chinese uses Songti/PingFang/Kaiti-family local fallbacks. App workspace typography is unchanged.

## Pending business content

Actual prices/weight bands, contact/address facts, course details/instructors/dates/fees, real homes/shop/equipment/class/student photos, approved family/student quotes and verified aggregate totals remain pending. The existing confirmed30-day/three-month package direction and14-/7-day cancellation terms remain; unspecified deadlines, refund form, short-notice/no-show terms and paid bookings are not invented or activated.

## Local complete-content preview

The owner requested realistic filled content for design review. Development localhost4180 automatically uses fictional sample rates, aggregate totals, family/student stories, hours and a reserved .example email. Other dev ports enable this with ?preview=sample. A single bilingual header notice identifies the preview; production builds exclude these samples and continue using approved public content only. Edit marketing-preview.ts for sample design copy, never public/marketing-content.json unless the owner supplies approved facts. Stock/gallery photos retain attribution and remain examples.
