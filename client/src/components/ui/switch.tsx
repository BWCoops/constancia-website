import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Switch — brand-aligned by default. Uses the Constancia palette
 * for both states + a cream thumb. Sized for clear tap targets
 * (h-6 / w-11 = 24×44, thumb 20×20).
 *
 * Universal: every Switch on the site (cookie consent, admin
 * feature flags, finance-compass toggles) renders consistently.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "focus-visible:ring-[color:var(--brand-deep-mint)] focus-visible:ring-offset-[color:var(--brand-bg-primary)]",
      "disabled:cursor-not-allowed disabled:opacity-55",
      "data-[state=checked]:bg-[color:var(--brand-deep-mint)] data-[state=unchecked]:bg-[color:var(--brand-stone)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full",
        "bg-[color:var(--brand-cream)]",
        "shadow-[0_2px_4px_rgba(37,40,38,0.18)] ring-0 transition-transform",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }

