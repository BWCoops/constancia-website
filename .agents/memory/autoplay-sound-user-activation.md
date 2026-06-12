---
name: Sound-on autoplay & the unmute-on-gesture pattern
description: How to make a video autoplay with sound despite browser policy, and the user-activation event gotcha that breaks the unmute on touch devices.
---

# Sound-on autoplay (video) — best-effort, and the activation-event trap

Browsers block autoplay WITH audio until the user has interacted with the origin.
This is OS/browser policy (all mobile, plus desktop Chrome without media
engagement) and **cannot be forced** from code — attempting unmuted autoplay just
gets the `play()` promise rejected (and can pause the element).

**Robust pattern** (used on the constancia.io holding film):
1. `<video>` keeps `muted autoPlay playsInline` so it always starts (muted)
   before JS runs.
2. On mount, try `video.muted = false; await video.play()` — succeeds on desktop
   / repeat visitors.
3. If it rejects, revert to muted playback and unmute on the user's first gesture.

**The trap that bit us:** bind the unmute to **activation-GRANTING** events only —
`touchend`, `pointerup`, `keydown`, `click`. Do NOT use `touchstart` /
`pointerdown`: on touch devices those fire *before* the browser grants the
transient user-activation that an unmuted `play()` needs, so the unmute is
silently blocked. Also: only remove the gesture listeners **after** the unmuted
`play()` actually resolves — if you remove them up front, a blocked first attempt
never retries and the video stays muted forever.

**Why:** the HTML "activation triggering input events" list grants activation on
keydown, mousedown/pointerdown (mouse only), pointerup (non-mouse), touchend, and
click — not on touchstart/pointerdown for touch.

**Optional refinement:** if the `<video>` has native `controls`, skip the unmute
when `event.target` is the video element (control taps retarget to it) so you
don't fight an explicit pause; let ambient gestures elsewhere enable sound.
