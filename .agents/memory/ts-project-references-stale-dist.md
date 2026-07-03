---
name: Stale dist/tsbuildinfo after copying lib package sources
description: Overwriting lib/* package sources (e.g. during a migration/restore) can leave stale compiled dist/ and .tsbuildinfo behind, causing confusing TS errors in downstream consumers.
---

When restoring or overwriting a shared package's source under `lib/<pkg>/src` in a pnpm_workspace project (e.g. `lib/db`), check for a pre-existing `lib/<pkg>/dist/` folder and `.tsbuildinfo` files (root and per-package). If they exist from a prior build of the old source, downstream packages that reference this one via TS project references (`references` in tsconfig.json) will fail `pnpm typecheck` with either:

- `TS2305: Module '"@workspace/<pkg>"' has no exported member '...'` (stale/incremental tsbuildinfo cache masking new exports), or
- `TS6305: Output file '.../dist/index.d.ts' has not been built from source file '...'` (once tsbuildinfo is cleared but dist itself is stale/missing corresponding build).

**Why:** TS project references resolve a referenced package's types from its emitted `dist/*.d.ts` (via composite build), not directly from `src`, even when the package.json `exports` field points at `./src/index.ts`. A leftover `dist/` from before the source was overwritten silently serves outdated type info.

**How to apply:** After overwriting any `lib/*` package's source (schema, index, etc.), delete that package's `dist/` and any `.tsbuildinfo`/`tsconfig.tsbuildinfo` files (root + affected packages), then run `npx tsc -b tsconfig.json` from the workspace root to rebuild all project references cleanly before running `pnpm --filter <pkg> run typecheck` again. `dist/` should already be gitignored in this stack, so deleting it is always safe.
