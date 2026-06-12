---
name: HTML video source codec & no-fallback-on-decode-failure
description: Why a malformed first <source> can kill playback with no fallback, and what codecs to ship for mobile-safe web video.
---

# Video `<source>` selection: first match wins, no fallback on decode failure

For a `<video>` with multiple `<source>` children, the browser picks the
**first** source whose `type` `canPlayType()` reports as "maybe"/"probably".
Once it commits to that source, if the media then **fails to decode**, the
browser does **NOT** fall back to later `<source>` elements (HTML media resource
selection algorithm). So a broken-but-type-matching source *shadows* a good one
listed after it.

**Why this bit us:** the constancia.io launch film listed a WebM `<source>`
before the MP4. The WebM was encoded as **VP9 Profile 1 / `pix_fmt=gbrp`
(planar RGB, 4:4:4)** — undecodable on essentially all mobile decoders (mobile
VP9 = Profile 0 / yuv420p only) and many desktop ones. Android/Chrome reports
`video/webm` as playable, committed to it, failed to decode, and did **not** fall
through to the MP4 → film was dead even on manual tap. iOS skips WebM entirely
(unsupported by `canPlayType`), so it used the H.264 MP4 and worked — which is
why the bug looked "mobile/Android only."

**How to apply:**
- Always verify a web video's real codec + pixel format with `ffprobe` (look at
  `codec_name`, `profile`, `pix_fmt`). Don't trust the filename/extension or a
  code comment claiming "AV1 WebM" etc.
- Mobile-safe baseline: **H.264 (High/Main), `yuv420p`, +faststart (moov before
  mdat), AAC-LC audio**, served same-origin with byte-range (206) support. A
  single small MP4 like this is the most robust option.
- If you add a WebM alternative it MUST be **VP9 Profile 0 (yuv420p)** or **AV1
  yuv420p** — never Profile 1/3 or any RGB/4:2:2/4:4:4 pixel format.
- Don't add alternative `<source>`s that could shadow a working one unless you've
  confirmed they're decodable on the target devices.
