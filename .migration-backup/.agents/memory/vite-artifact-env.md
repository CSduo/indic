---
name: Vite artifact env config
description: How PORT and BASE_PATH should be handled in vite.config.ts for Replit artifacts
---

The artifact workflow injects PORT and BASE_PATH as env vars at runtime. But `pnpm build` at the workspace level runs without those vars, so **hard-throwing** when they are absent breaks standard CI builds.

**Rule:** always use safe fallbacks:
```ts
const rawPort = process.env.PORT ?? '5173';
const parsedPort = Number(rawPort);
const port = Number.isNaN(parsedPort) || parsedPort <= 0 ? 5173 : parsedPort;
const basePath = process.env.BASE_PATH ?? '/';
```

**Why:** Code review rejected the task twice because a hard `throw` in vite.config.ts made `pnpm build` fail at workspace root. The artifact's `artifact.toml` `services.env` section is the authoritative source for PORT/BASE_PATH in production; the fallback is only for build-time invocations.

**How to apply:** Every new react-vite artifact scaffold should follow this pattern. Do not copy the "required but was not provided" throw pattern.
