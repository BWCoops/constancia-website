---
name: Permissions-Policy bluetooth directive
description: Chrome logs a warning for bluetooth=() in the Permissions-Policy header because it was removed from the spec.
---

## The rule
Do not include `bluetooth=()` in the Permissions-Policy response header.

**Why:** Chrome (and other modern browsers) treat `bluetooth` as an unrecognized Permissions Policy feature and log a console warning. It was removed from the Permissions Policy spec.

**How to apply:** In server/index.ts where the Permissions-Policy header is built, omit `bluetooth=()` from the directive list. The other directives (usb, serial, hid, geolocation, microphone, camera, payment, etc.) are still valid.
