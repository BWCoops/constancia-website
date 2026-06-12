---
name: Publish fails with zero build output
description: Distinguishing the two distinct "publish build failed" symptoms and their different root causes
---

# Publish fails right after "Security Scan Complete" with ZERO build output

Symptom: the deployment build log has only ~4 lines — `Deployment: <id>`,
`Build: <id>`, `Running Security Scan`, `Security Scan Complete` — then
status=failed. No npm/vite/esbuild output at all.

**Root cause:** `.replit` has no `[deployment]` section, so the publish has no
build/run command and aborts the instant the always-present security-scan step
finishes (the scan is informational and always "Completes" — it is NOT the
failure). This has happened on `claude/` task branches whose `.replit` lost the
section even though the project deployed fine before.

**Fix:** `deployConfig({ deploymentTarget: "autoscale", build: ["npm","run","build"], run: ["npm","run","start"] })`
— this writes the `[deployment]` block back into `.replit`. Do NOT edit
package.json/vite.config to "fix" it.

**Why:** the security-scan line is a red herring; users (and you) will fixate on
it. The discriminator is *zero build-command output*: the build phase never
started, which means no build command was configured — not a compile error.

**How to apply / distinguish from the other failure mode:**
- Zero build output after the scan → missing `[deployment]` section → deployConfig.
- Build output present, ends in `ERR_MODULE_NOT_FOUND ... script/build.ts` →
  the custom build entry point is missing → restore it from git (see
  build-pipeline.md). These are different problems with different fixes.
