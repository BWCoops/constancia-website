# Operations & Handoff Notes

Context for future Claude Code sessions (and the human team) so we don't keep relitigating the same questions about deployments and verification.

## Repository URLs

| Purpose | URL |
|---|---|
| Git remote | `github.com/BWCoops/constancia-website` (branch `main`) |
| Replit **editor** (account-gated) | `https://replit.com/t/1qg/repls/httpsconstanciaio` |
| Replit **preview** (public, dev-server only) | `https://0e426a2a-6c24-4711-b5f0-de15f92850b1-00-gdawors48a0m.worf.replit.dev/` |
| Production domain | `https://constancia.io` (currently **parked** — redirects to dot-map.org) |

The editor URL is **not** something a CI-style Claude session can reach:
- Cloudflare's bot challenge blocks fresh headless browsers (proven repeatedly — screenshot evidence in chat history)
- No Replit session cookie is shared into a sandbox container
- Account login would require human credentials that Claude shouldn't accept

The preview URL is reachable when the Replit dev server is running. If it returns 404 with title "Run this app to see the results here", the user needs to click the **Run** button in Replit's editor UI. Claude cannot do that remotely.

## What Claude Code (cloud session) can do

- Edit + commit + push code on `main` to GitHub
- Hit the **public** preview URL via Playwright (when the dev server is up) — screenshot, scroll, check console errors, test the public site end-to-end
- Hit production domains, public APIs, third-party services from the cloud container
- Open PRs, merge PRs, comment on issues via the GitHub MCP

## What Claude Code (cloud session) **cannot** do

- Sign in to the user's Replit account
- Pull code inside the Replit container (`git pull`, `npm install`, `Stop`/`Run` are human-only actions)
- Reach the Replit editor UI (Cloudflare + auth wall)
- Trigger Replit deployments
- Modify Replit Secrets

## The handoff loop for verification

After a code push, the human must do this in Replit Shell:

```bash
git fetch origin
git status                       # confirm no Replit-local drift
git reset --hard origin/main     # if no Replit-local work to preserve
npm install
```

Then click **Stop** → **Run** in the editor UI.

Then paste the preview URL back to Claude. Claude can navigate it via Playwright, screenshot the rendered pages, click through scroll behaviour, and check console errors.

## Admin auth quick reference

Authentication: **Clerk** (replaced Replit OAuth).

Required env vars in Replit Secrets:
- `CLERK_SECRET_KEY` (server only)
- `VITE_CLERK_PUBLISHABLE_KEY` (mirrored into `CLERK_PUBLISHABLE_KEY` on boot by `server/clerkAuth.ts`)
- `AUTHORIZED_ADMIN_EMAILS` (comma-separated allowlist — only used when DB whitelist is empty)
- `SESSION_SECRET` (for `express-session`, used by FinanceCompass flows)
- `DATABASE_URL` (Postgres for sessions table)

Allowlist policy: `admin_authorized_emails` DB table is the source of truth when populated. Falls back to `AUTHORIZED_ADMIN_EMAILS` env var when empty.

Add / remove / migrate admin emails:

```bash
tsx scripts/admin-emails.ts list
tsx scripts/admin-emails.ts add user@constancia.io
tsx scripts/admin-emails.ts remove user@1qg.com
tsx scripts/admin-emails.ts migrate 1qg.com constancia.io
```

If the user signed in via Clerk and was bounced to `/admin/access-denied`, the most likely cause is that the DB whitelist contains stale `@1qg.com` rows and not their Clerk email. The `migrate` subcommand fixes this in one command.

## Brand assets — which logo on which surface

| Asset | When to use |
|---|---|
| `attached_assets/constancia-logo.png` | Graphite wordmark on transparent — for **cream / light** backgrounds |
| `attached_assets/constancia-logo-dark.png` | Cream wordmark on transparent — for **graphite / dark** backgrounds |

When adding a new `<img src={...}>`, audit the surface colour and pick the matching variant.

## Design tokens — where they live

Single source of truth: `client/src/lib/tokens.ts`. Mirrored as CSS variables in `client/src/index.css`. Referenced by `tailwind.config.ts` via `var(--brand-*)`.

**Never hardcode hex values in component files.** Use the CSS variables (`var(--brand-graphite)`) or Tailwind tokens (`text-brand-cream`) instead. The bulk hex sweep on commits `1a55d8e` and `5491a17` cleared 1500+ stragglers — keep it that way.
