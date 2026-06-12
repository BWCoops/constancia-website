---
name: Cookie components must use portal
description: Why CookiePreferencesIcon and CookieConsentBanner must render via createPortal — framer-motion breaks fixed positioning and pointer events when they're in the React tree.
---

## The rule
`CookiePreferencesIcon` and `CookieConsentBanner` must always return `createPortal(<jsx>, document.body)` — never a plain JSX return.

## Why
Framer-motion page transitions apply `transform` (e.g. `translateX`, `translateY`) to wrapper elements during route changes. When a CSS `transform` is present on any ancestor, the browser re-roots `position: fixed` elements to that ancestor instead of the viewport — the FAB "scrolls with the page" and inflates the footer. The same stacking-context isolation breaks `pointer-events` delivery to Radix Switch inside the modal (switches appear unresponsive). Portalling to `document.body` bypasses the entire React/framer-motion tree.

## How to apply
```tsx
import { createPortal } from "react-dom";

export function CookiePreferencesIcon() {
  // ...state...
  return createPortal(
    <> ... </>,
    document.body
  );
}

export function CookieConsentBanner() {
  // ...state...
  if (!showBanner) return null;
  return createPortal(
    <div ...> ... </div>,
    document.body
  );
}
```

Any future fixed/overlay component that is inside the framer-motion tree should use the same pattern. The `z-index` layering (`--z-cookie-fab`, `--z-cookie-banner`, `--z-modal`) still works correctly when portalled.
