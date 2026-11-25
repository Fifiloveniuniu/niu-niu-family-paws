# Database holiday reference catalog

Read-only public holiday presets come from a Firestore reference catalog grouped by United States, China and India. English, Simplified Chinese and Spanish names are retained. Presets do not select fee dates or change existing prices automatically. Coincident dates deduplicate the selected fee date.

The guarded local preparation script targets only the explicitly configured demo emulator. Production catalog preparation belongs to the final reviewed release; do not seed it implicitly. India 2028 includes only verified fixed dates; unresolved movable dates remain manual. Specific source references are stored in the reference JSON and generator.

This layer preserves the existing pricing workflow and adds canonical dialog restoration for pricing and holiday editors. No production pricing or business records were changed.
