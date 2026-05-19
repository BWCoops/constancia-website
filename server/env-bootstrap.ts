/**
 * Bootstrap env vars BEFORE any other module reads them.
 *
 * The Clerk dashboard exposes the publishable key and the secret key. In
 * Replit Secrets they're typically named just CLERK_SECRET and
 * CLERK_PUBLIC_KEY — without the _KEY / VITE_ suffixes that @clerk/express
 * and Vite (respectively) look for. Mirror them onto the canonical names
 * so the rest of the stack just works.
 *
 * This file is imported as a side effect at the very top of server/index.ts,
 * before any other server modules and before Vite's middleware mounts.
 * Idempotent — if the canonical names are already set, the mirror is a no-op.
 */

if (!process.env.CLERK_SECRET_KEY && process.env.CLERK_SECRET) {
  process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET;
}
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_PUBLIC_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLIC_KEY;
}
if (!process.env.VITE_CLERK_PUBLISHABLE_KEY && process.env.CLERK_PUBLIC_KEY) {
  process.env.VITE_CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLIC_KEY;
}

// Defensive: also mirror in the reverse direction so anything in the codebase
// that happens to read CLERK_SECRET / CLERK_PUBLIC_KEY keeps working even
// when only the canonical names are set.
if (!process.env.CLERK_SECRET && process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET = process.env.CLERK_SECRET_KEY;
}
if (!process.env.CLERK_PUBLIC_KEY && process.env.CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLIC_KEY = process.env.CLERK_PUBLISHABLE_KEY;
}
