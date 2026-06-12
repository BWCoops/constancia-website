---
name: viewEnvVars under-reports secrets
description: The env management API can omit secrets that are actually present at runtime
---

# viewEnvVars can under-report existing secrets

`viewEnvVars()` (and keyed `viewEnvVars({keys:[...]})`) has returned
`false`/absent for secrets that ARE actually present in the running environment
(confirmed cases: PII_ENCRYPTION_KEY, VITE_CLERK_PUBLISHABLE_KEY-related keys).
Its listing is demonstrably incomplete.

**Why:** treating a `viewEnvVars` "not set" as ground truth led to a false
"missing secret" conclusion; the app had actually loaded the value fine.

**How to apply:** never conclude a secret is missing from `viewEnvVars` alone.
Verify against runtime ground truth before acting: the browser console (e.g.
Clerk logging "loaded with development keys" proves its publishable key is
present), workflow logs, or a `node -e` presence check. Only use `requestEnvVar`
to ask the user once a runtime check confirms genuine absence.
