---
name: pnpm packageManager version mismatch breaks workflows
description: root package.json packageManager field pinning a pnpm version different from the environment's installed pnpm binary causes silent workflow startup failures
---

Root `package.json`'s `packageManager` field (e.g. `pnpm@9.15.9`) must match the pnpm version actually installed/available in the Replit Nix environment. When they diverge, the workflow runtime tries to self-install/switch to the pinned version on every startup via an internal `pnpm add pnpm@<version>` call, which can fail repeatedly with errors like `EAGAIN` or `SIGTERM`, causing the workflow to never come up — with no clear error surfaced about the real cause (looks like a generic "failing tasks" / resource issue).

**Why:** Hit this after a Vercel→Replit migration where `packageManager` was left at an old pinned version while the workspace's actual pnpm (via Nix) was a newer major version. Restarting the workflow repeatedly reproduced the identical EAGAIN failure — a strong signal it's not transient, but a real version mismatch.

**How to apply:** If a workflow repeatedly fails to start with EAGAIN/SIGTERM errors from a `pnpm add pnpm@...` command, run `pnpm --version` (or check `which pnpm`) to find the actually-installed version, and update the `packageManager` field in root `package.json` to match it exactly.
