---
name: Cookie toggle centering
description: Why Switch toggles appear top-aligned in cookie consent rows, and how to fix it durably.
---

## The rule
Inside a cookie-preference row (`flex items-center justify-between`), the label+description text block must be a `flex flex-col justify-center` div with an explicit `block` Label — never an inline Label mixed with a block `<p>`.

## Why
`Label` from Radix renders as an HTML `label` element which is `display: inline` by default. Tailwind's `leading-none` on the Label component collapses its line-height to 1. When placed alongside a block `<p>`, the browser creates an anonymous block box around the inline label and stacks the two elements. The resulting div height is correct but the inline formatting context interacts poorly with `items-center` on the outer flex row, making the Switch appear top-aligned visually.

## How to apply
Every row that pairs label+description text with a Switch should look like:

```jsx
<div className="flex items-center justify-between gap-4 ...">
  <div className="min-w-0 flex flex-col justify-center">
    <Label className="block font-medium leading-snug">Title</Label>
    <p className="text-xs text-muted-foreground mt-0.5">Description</p>
  </div>
  <Switch ... />   {/* NO className="flex-shrink-0" — Switch already has shrink-0 + self-center */}
</div>
```

Never pass `className="flex-shrink-0"` to `<Switch>` — the universal Switch component already includes `shrink-0` and `self-center`; extra classes risk tailwind-merge interference.
