---
name: Cookie consent controls & access point
description: Why cookie rows use a tick (not a Switch) and why the prefs trigger lives in the nav drawer, not a body-portaled FAB.
---

# Cookie consent: control type and access point

## Decision 1 — cookie rows use a tick, not a sliding Switch
Cookie consent rows (essential/analytics/marketing) use `ConsentTick` (a
`role="checkbox"` button that fills green with a checkmark when on), NOT the
shadcn `Switch`.

**Why:** the sliding Switch thumb repeatedly drifted off-centre in these rows and
was not reliably fixable; the user explicitly asked to drop the toggle for "a tick
that goes green." A checkbox-style control has no moving thumb, so the alignment
class of bug cannot recur here.
**How to apply:** keep cookie rows on `ConsentTick`. Don't reintroduce `Switch`
into `cookie-consent.tsx`. Green fill = `var(--brand-deep-mint)`, check =
`var(--brand-cream)`.

## Decision 2 — cookie prefs trigger lives in the nav drawer, not a floating FAB
There is no floating cookie button. The preferences dialog (`CookiePreferencesModal`)
renders only the modal (still `createPortal(..., document.body)`, correct for an
overlay) and opens when it receives the `OPEN_COOKIE_PREFERENCES_EVENT`
(`"open-cookie-preferences"`) window event. The `LibraryNavigation` drawer has a
"Cookie Preferences" button that dispatches that event.

**Why:** the old FAB was portaled to `document.body` and got visually clipped/cut
off on some pages (notably the comparison tool). User wanted it in the menu drawer
("the right holder"), not floating.
**How to apply:** to open the dialog from anywhere, dispatch
`new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT)` (exported from `cookie-consent.tsx`).
Don't re-add a fixed/floating trigger. The first-visit `CookieConsentBanner` is
separate and unchanged.
