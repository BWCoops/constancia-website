import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Switch — brand-aligned, using the Constancia palette for both states
 * plus a cream thumb.
 *
 * Positioning uses the standard, battle-tested shadcn approach:
 *   - track: h-6 w-11 (24×44px) with border-2 border-transparent (2px inset)
 *   - thumb: h-5 w-5 (20px) — exactly the track's inner height, so it is
 *     perfectly centred vertically
 *   - unchecked: translate-x-0  → flush left (2px gap from the border)
 *   - checked:   translate-x-5  → 20px travel → flush right (2px gap)
 *
 * No calc()/division is used, so Tailwind always compiles the classes and
 * the thumb stays inside the track in both states.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center self-center rounded-full border-2 border-transparent transition-colors",
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
        "pointer-events-none block h-5 w-5 rounded-full ring-0 transition-transform",
        "bg-[color:var(--brand-cream)]",
        "shadow-[0_2px_4px_rgba(37,40,38,0.18)]",
        "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
