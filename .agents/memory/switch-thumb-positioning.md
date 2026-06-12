---
name: Switch thumb positioning
description: Why the shadcn Switch thumb landed outside the track, and the proven fix.
---

## The rule
Position the shadcn `Switch` thumb with the canonical fixed pattern, NOT calc()/CSS-var math:
- track: `h-6 w-11 border-2 border-transparent` (border-box → 20×40px inner)
- thumb: `h-5 w-5`
- `data-[state=unchecked]:translate-x-0` and `data-[state=checked]:translate-x-5`

## Why
A prior version drove the thumb from CSS custom props with arbitrary Tailwind values doing division, e.g. `translate-x-[calc((var(--sw-h)-var(--th-sz))/2)]`. Symptom: OFF thumb sat mid-track, ON thumb sat left/outside the track. Two compounding causes: (1) CSS `calc()` requires spaces around binary `-`/`/`, which the underscore-free arbitrary value did not guarantee; (2) Tailwind's arbitrary-value parser handles nested `var()` + division unreliably, so the classes often did not compile. Net effect: the intended translate never applied.

**Why:** the fixed-pixel shadcn pattern compiles deterministically and is geometrically exact (thumb height == track inner height → vertical centre; translate-x-5 == 20px travel → flush right with 2px inset).

## How to apply
Keep brand colors via `data-[state=checked]:bg-[color:var(--brand-deep-mint)]` etc., but never reintroduce `--sw-h/--sw-w/--th-sz` calc-based translate. This one component is shared by ~13 call sites (admin pages, cookie-consent, visitor-data-manager); none passes a className, so the fix is global. Keep `self-center` for vertical centring inside flex rows.
