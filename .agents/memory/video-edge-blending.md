---
name: Blending video edges into a page background
description: Why the launch film uses a radial alpha mask, not ink-coloured shadows, to look frameless
---

Rule: to make an inline video look frameless against the page, alpha-fade the
video's own pixels (radial-gradient `mask-image` + `-webkit-mask-image`, two
stops only) rather than painting page-coloured inset shadows/overlays on top.

**Why:** the launch film's background (#1d2730) is a slightly lighter navy
than the page ink (#12161D). Painting ink-coloured inset box-shadows over it
produced visible banding/"concentric rings" (user complaint), and layering
multiple shadows made it worse. An alpha mask lets the real page background
show through, so the colour match is perfect by definition, and a single
two-stop gradient gives one continuous falloff with no rings.

**How to apply:** mask the `<video>` element itself (poster is covered too);
keep controls as unmasked siblings. Sample the media's corner colour with
ffmpeg (`crop=10:10:0:0,scale=1:1` → rawvideo) when diagnosing "not quite the
same colour" complaints.
