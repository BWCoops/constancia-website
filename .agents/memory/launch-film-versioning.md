---
name: Launch film asset versioning
description: How to safely change the holding-page launch film without stale-cache complaints
---

Rule: any change to the holding-page launch film must ship under a NEW versioned filename (launch-film-vN.mp4) and update the `<source src>` in the holding page.

**Why:** the mp4 is served with `cache-control: immutable, max-age=1y`, so overwriting the file in place leaves visitors watching the old cut indefinitely — this caused a "letters cut off" complaint that was partly a stale cached old cut.

**How to apply:** bump the filename, update the source reference, keep the previous mp4 in public/ until the new HTML is fully live (cached HTML may still reference it). Current cut (v4) ends on the logo+wordmark only — the caption line "BUILDING INTELLIGENT AGENTIC ORGANISATIONS" was removed at the user's request because its baked-in rising-wipe reveal clipped letter bottoms mid-animation. If a future cut re-adds a caption, avoid wipe reveals; use a whole-line crossfade.
