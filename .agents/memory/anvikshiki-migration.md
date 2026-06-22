---
name: Anvikshiki Next.js to Vite migration
description: Lessons from migrating Anvikshiki from Next.js to Vite+wouter+Express
---

## Key lessons

**Broken template literals from sed:** When sed replaces string literals inside template literals, it can produce `fetch(\`${BASE_URL}/api/path"` (backtick-open, double-quote-close). Fix with Python string replace, not sed. The exact broken pattern was `BASE_URL.replace(//$/, "")` (empty regex) instead of `BASE_URL.replace(/\/$/, "")`.

**Why:** sed has complex escaping requirements for regex metacharacters; Python string replacement is safer for these transforms.

**Dead Next.js server files:** `src/app/layout.tsx`, `src/app/api/**`, `src/lib/auth.ts` (server-only) were left behind. They caused no parse errors since Vite only scans from `main.tsx` imports, but should be deleted for cleanliness.

**`[router]` in useEffect deps:** sed-injected wouter navigate left `}, [router])` dependency arrays. Must be `}, [navigate])`.

**`"use client"` directives:** Harmless in Vite — they're just string expressions. No removal needed for functionality.

**zod not installed in api-server:** Routes imported zod but it wasn't in api-server's package.json. Must `pnpm --filter @workspace/api-server add zod`.

**How to apply:** Any future Next.js→Vite migration should use Python for string transforms, check dep arrays, delete server-only files, and verify all package deps.
