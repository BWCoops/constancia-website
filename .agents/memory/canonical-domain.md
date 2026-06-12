---
name: Canonical domain (constancia.io vs .com)
description: Which domain Constancia actually owns and why the codebase standardizes on .io — do not flip back to .com.
---

# Canonical domain: constancia.io

The live, owned production domain is **https://constancia.io** (autoscale deploy).
`constancia.com` is a **third-party parked / for-sale domain the company does NOT
own** — it is not the site. The whole codebase is standardized on `.io`:
SITE_URL/BASE_URL defaults, client canonical + JSON-LD schema tags, OG/Twitter
URLs, sitemap / robots / llms.txt, email + PDF service links, CORS allow-list, and
`client/public/.well-known/security.txt`.

**Why:** an earlier pass wrongly standardized on `.com`, pointing canonical tags,
sitemap, and social cards at a parked domain — an SEO + branding leak. The user
explicitly confirmed ".io is correct."

**How to apply:** never "correct" `.io` back to `.com`. A `.com` reference in code
or a shipping public asset is a leftover to flip to `.io`, not the source of truth.
Remaining `.com` strings live only in non-shipping files (OPERATIONS.md,
`*-backup.txt`, wireframes, workflow logs, agent transcripts) and are harmless
history, not live surfaces.
