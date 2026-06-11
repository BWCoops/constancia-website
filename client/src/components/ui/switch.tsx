import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Switch — brand-aligned by default. Uses the Constancia palette
 * for both states + a cream thumb.
 *
 * Thumb positioning is derived entirely from CSS custom properties so
 * nothing is hardcoded:
 *
 *   --sw-h   track height  (default 1.5rem  / 24px)
 *   --sw-w   track width   (default 2.75rem / 44px)
 *   --th-sz  thumb size    (default 1.25rem / 20px)
 *
 * Gap  = (--sw-h − --th-sz) / 2               ← equal breathing room
 * Off  = gap                                   ← unchecked X
 * On   = --sw-w − --th-sz − gap               ← checked X
 *
 * "self-center" keeps the toggle vertically centred in every flex /
 * table-cell / grid container across the whole site — universally.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex shrink-0 cursor-pointer items-center self-center rounded-full border border-transparent transition-colors",
      "[--sw-h:1.5rem] [--sw-w:2.75rem] [--th-sz:1.25rem]",
      "h-[var(--sw-h)] w-[var(--sw-w)]",
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
        "pointer-events-none block rounded-full ring-0 transition-transform",
        "h-[var(--th-sz)] w-[var(--th-sz)]",
        "bg-[color:var(--brand-cream)]",
        "shadow-[0_2px_4px_rgba(37,40,38,0.18)]",
        "data-[state=unchecked]:translate-x-[calc((var(--sw-h)-var(--th-sz))/2)]",
        "data-[state=checked]:translate-x-[calc(var(--sw-w)-var(--th-sz)-(var(--sw-h)-var(--th-sz))/2)]"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
