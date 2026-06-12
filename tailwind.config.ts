import type { Config } from "tailwindcss";

/*
 * All brand colours are exposed via CSS variables defined in index.css
 * (which in turn mirror the constants in /src/lib/tokens.ts).
 *
 * This means:
 *   bg-brand-bg-primary  → background: var(--brand-bg-primary)
 *   text-brand-cyan      → color: var(--brand-cyan)
 *   border-brand-border  → border-color: var(--brand-border)
 *
 * NEVER add raw hex values here. Add a CSS variable to index.css first.
 */

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg:  "var(--brand-radius-lg)",
        md:  "var(--brand-radius-md)",
        sm:  "var(--brand-radius-sm)",
        btn: "var(--brand-radius-btn)",
      },

      colors: {
        brand: {
          // Surfaces
          "bg-primary":    "var(--brand-bg-primary)",
          "bg-secondary":  "var(--brand-bg-secondary)",
          surface:         "var(--brand-bg-surface)",
          "surface-hover": "var(--brand-bg-surface-hover)",
          // Core palette (full set — every hex used in the FC tree
          // now has a named token so components stop hard-coding
          // values inline).
          ink:             "var(--brand-bg-primary)",   // #252826
          graphite:        "var(--brand-graphite)",     // #1A1B1A
          cream:           "var(--brand-cream)",        // #F6F3EE
          stone:           "var(--brand-stone)",        // #D8D0C6
          rose:            "var(--brand-rose)",         // #C77A93
          berry:           "var(--brand-berry)",        // #8E4F67
          mint:            "var(--brand-mint)",         // #7FB8A3
          "deep-mint":     "var(--brand-deep-mint)",    // #5E8D7A
          // Legacy aliases — kept so existing code that still uses
          // these classnames keeps resolving.
          teal:            "var(--brand-teal)",
          cyan:            "var(--brand-cyan)",
          navy:            "var(--brand-navy)",
          navyDark:        "var(--brand-bg-primary)",
          border:          "var(--brand-border)",
          "border-hover":  "var(--brand-border-hover)",
          "border-muted":  "var(--brand-border-muted)",
        },

        background:  "hsl(var(--background) / <alpha-value>)",
        foreground:  "hsl(var(--foreground) / <alpha-value>)",
        border:      "hsl(var(--border) / <alpha-value>)",
        input:       "hsl(var(--input) / <alpha-value>)",
        ring:        "hsl(var(--ring) / <alpha-value>)",
        card: {
          DEFAULT:    "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border:     "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border:     "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border:     "var(--primary-border)",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border:     "var(--secondary-border)",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border:     "var(--muted-border)",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border:     "var(--accent-border)",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border:     "var(--destructive-border)",
        },
        sidebar: {
          ring:       "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT:    "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border:     "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT:    "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border:     "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT:    "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border:     "var(--sidebar-accent-border)",
        },
        status: {
          online:  "rgb(34 197 94)",
          away:    "rgb(245 158 11)",
          busy:    "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
      },

      fontFamily: {
        sans:  ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono:  ["var(--font-mono)"],
      },

      spacing: {
        section:      "var(--brand-section-py)",
        "section-sm": "var(--brand-section-py-sm)",
        nav:          "var(--brand-nav-height)",
      },

      zIndex: {
        nav:          "var(--z-nav)",
        modal:        "var(--z-modal)",
        overlay:      "var(--z-overlay)",
        toast:        "var(--z-toast)",
        "cookie-fab": "var(--z-cookie-fab)",
        "cookie-banner": "var(--z-cookie-banner)",
      },

      maxWidth: {
        site: "var(--brand-max-width, 80rem)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
