---
name: Hero image clipping technique
description: How to clip a fake phone-header from a portrait mockup image used as a hero, consistently at every screen width
---

# Hero image clipping with CSS margin %

**The rule:** `marginTop: "-X%"` on an `<img width="100%">` clips `X% × containerWidth` of pixels.
Because CSS `%` margins are relative to the containing block's inline size (width), the clip in
**original image pixels** = `X% × naturalImageWidth`, which is CONSTANT at all breakpoints.

**How to apply:**
1. Measure fake-header height in original px (e.g. 122px for a 941px-wide mockup).
2. Set `marginTop: "-${122/941 * 100}%"` ≈ `"-13%"`.
3. Wrap in a container with `overflow: hidden` and `aspectRatio` matching the desired
   visible crop (e.g. `"941/700"` = illustration area only). Add `maxHeight` to cap on wide screens.
4. Never use `backgroundPosition %` for this — that % formula is relative to
   `(containerSize - scaledImageSize)` which changes at every viewport width.

**Why:** vw units inside an iframe refer to browser window (1280px), not iframe display width.
CSS margin % is always relative to containing block WIDTH — reliable and viewport-independent.
