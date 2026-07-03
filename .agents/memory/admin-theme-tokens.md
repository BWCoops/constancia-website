---
name: Admin theme is dark via :root, not .dark
description: Why hardcoded dark hex text is invisible in the admin console and which token conventions to use
---

The ThemeProvider always applies the "light" class, but the `:root` tokens in `client/src/index.css` ARE the dark brand palette (bg #12161D, cream foreground). The `.dark` block (off-brand cyan) never applies and is dead code.

**Why:** Admin pages therefore render dark. Any hardcoded `text-[#12161D]` (near-black) on default/card surfaces is invisible dark-on-dark — this caused the "admin text unreadable" complaint fixed July 2026.

**How to apply:**
- In admin UI, always use semantic tokens: `text-foreground`, `text-muted-foreground`, `bg-muted` — never dark brand hexes for text on default surfaces.
- Exception: explicit light surfaces (`bg-white` MFA card, `bg-[#F6F3EE]` blocks) DO need explicit dark text (`text-[#12161D]/…`), not `text-muted-foreground`.
- Do NOT bump the global `--muted-foreground` token for admin-only contrast — it is shared with the public site and light surfaces (architect flagged this as a regression risk).
