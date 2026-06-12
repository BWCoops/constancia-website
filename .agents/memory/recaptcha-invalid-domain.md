---
name: reCAPTCHA "Invalid domain for site key"
description: The two distinct causes of this reCAPTCHA v2 error in this app and how to tell them apart
---

# reCAPTCHA "ERROR for site owner: Invalid domain for site key"

This contact-form error (Google reCAPTCHA v2, rendered by
client/src/components/turnstile.tsx; key served by
server/services/turnstile.ts via /api/config/turnstile) has TWO distinct causes.
Diagnose by curling the config endpoint on BOTH environments and diffing the
siteKey: `curl -s http://localhost:5000/api/config/turnstile` vs
`curl -s https://constancia.io/api/config/turnstile`.

1. **Stray whitespace in the secret value.** A leading/trailing space in
   `RECAPTCHA_SITE_KEY` (or `_SECRET_KEY`) makes the key malformed and Google
   throws this exact "Invalid domain" error even on the correctly-registered
   domain. This actually happened on production (` 6Lf-...` vs the clean
   `6Lf-...` in dev). The getters in turnstile.ts now `.trim()` keys, so this is
   guarded — but a redeploy is required for production to pick up the fix, and
   the secret value itself may still carry the space.

2. **Key not registered for the viewing domain.** reCAPTCHA v2 keys are
   domain-locked in Google's admin console. Dev vs prod key selection keys off
   `NODE_ENV` (dev script sets `development` → `RECAPTCHA_SITE_KEY_DEV`; `start`
   sets `production` → `RECAPTCHA_SITE_KEY`). The Replit preview (`*.replit.dev`)
   will show this error unless the served dev key is registered for the current
   preview domain in Google admin. Production works as long as the prod key is
   registered for `constancia.io`. Note: in this project both keys currently
   hold the SAME underlying value (registered for constancia.io only), so the
   preview fails the domain check regardless.

**Why:** the error text says "domain" but cause #1 is a malformed key, not a
domain problem — easy to misdiagnose as a Google-admin issue and waste time.

**How to apply:** diff dev vs prod siteKey for whitespace FIRST; only then chase
domain registration in https://www.google.com/recaptcha/admin.
