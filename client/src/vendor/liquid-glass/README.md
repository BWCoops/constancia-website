# liquid-glass (vendored)

Source: `liquid-glass-react@1.1.1` — copied as-is from the package's
prebuilt `dist/` output (MIT licence preserved alongside).

Why vendored:
- The upstream package declares `react: >=19` as a peer dependency,
  but its own `devDependencies` use `react@^18.2.0` and the built ESM
  imports only `forwardRef / useCallback / useEffect / useId / useRef /
  useState`. There are no React-19-specific APIs. The peer-dep
  declaration is incorrect.
- Replit's auto-install refused to resolve the peer mismatch even with
  `.npmrc legacy-peer-deps=true`. Vendoring kills the .npmrc workaround
  and removes one third-party install risk.

If we ever need to upgrade, replace `index.js` + `index.d.ts` from a
fresh `npm pack liquid-glass-react@X.Y.Z` and re-check the diff.
