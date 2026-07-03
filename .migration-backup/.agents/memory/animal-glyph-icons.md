---
name: AnimalGlyph domain icon mapping
description: DomainKey union type constraints and icon assignments for the Anvikshiki AnimalGlyph component
---

`DomainKey` in `src/lib/domainMeta.ts` is a strict string-literal union. Every `case` label in `glyphFor()`'s switch must be a valid member of that union — TypeScript raises TS2678 otherwise.

**Why it matters:** Adding a phantom `case "temple"` to preserve the old icon function caused a typecheck failure that blocked task completion.

**How to apply:** When adding new icon cases, either (a) add the key to the `DomainKey` union first, or (b) do not expose it as a switch case — use an internal function call instead.

**Current icon assignments (as of the design uplift):**
- philosophy → Lotus
- history → Arch
- civilizational-thought / civilization → Ziggurat (stepped monument)
- aesthetics → Rasa (mandala-eye, art/beauty)
- sanskrit / sanskrit-studies → Shirorekha (Devanagari bar + stems)
- sociology / community → Network
- science → Atom
- geopolitics → Globe
- papers / submit → Scroll
- archive → BookChest
- political-theory → Shield
- translations → TwoQuills
- multimedia → Lyre
- default → CompassStar
