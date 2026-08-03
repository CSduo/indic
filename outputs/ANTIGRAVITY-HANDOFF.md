# Antigravity handoff: publish the completed CSduo/indic repair

Continue from the existing checkout on this Windows computer. Do not clone over it, reset it, clean it, squash it, or recreate the changes.

## Exact local state

- Repository: `C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo`
- GitHub: `https://github.com/CSduo/indic.git`
- Branch: `main`
- Local HEAD: `df78875`
- Remote base at last fetch: `902d87c`
- Local `main` is four commits ahead of `origin/main`.
- All application changes are committed. Only `outputs/` and `work/` are untracked and must not be pushed.

## Security rule

A GitHub personal access token was exposed in chat. Never use, repeat, save, log, or embed that token. The owner must revoke it. Use only a fresh secure credential or a GitHub app/connector authorized to **push to `CSduo/indic`**.

The currently connected GitHub identity `xiyatosaanvi-creator` has pull-only access to this repository, so it cannot publish. Authenticate as `CSduo` or grant an app/connector push permission.

## What was fixed

The visible problem is inside:

`https://anvikshikijournal.in/articles/the-transatlantic-slave-trade-4e607526`

The CSP was not the root cause. The cover and avatar loaded, but all 16 inline body images were stored as `<img>` tags without `src` values.

The matching source PDF was found at:

`C:\Users\ADMIN\Downloads\The Human Tapestry of the Slave Trade (1).pdf`

It contains exactly 16 embedded JPEGs whose dimensions match the 16 blank article boxes. They were recovered into the site in document order. A reversible compatibility layer restores them without destructively rewriting the production database.

The editor now uploads pasted images before saving, blocks unresolved image references, and rejects DOCX imports if any embedded image cannot be stored. Empty legacy image placeholders are removed safely.

## Validation already completed

- `pnpm --filter @workspace/api-server test`: 5 files, 16 tests passed.
- `pnpm run typecheck`: passed for all workspaces.
- `pnpm run build`: passed; frontend and API production bundles completed.
- Packaged recovery assets: 16 JPEGs, `01.jpg` through `16.jpg`.
- `git diff --cached --check`: passed before commit.

## Publish the real local history

Use authenticated Git tooling with CSduo write permission:

```powershell
Set-Location "C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo"
git status -sb
git log --oneline origin/main..HEAD
git fetch origin --prune
git merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) { throw "Remote main changed; inspect before pushing." }
git push origin main
git ls-remote origin refs/heads/main
```

The pushed remote SHA must be `df78875`.

Do not stage `outputs/` or `work/`. Do not force-push.

## Deploy and verify

Use the authenticated Vercel project:

- Team: `team_F9gBScbqYZFg2KxQwvXMSihu`
- Project: `prj_jFOlvZjLF9rnNYbNXBuktbGEjJJH`
- Project name: `c-sduo-xiyora-website`

Create a preview deployment from the pushed `df78875` state, then verify the exact article URL. Inside the article body there must be 16 images with non-empty sources under:

`/images/legacy/the-transatlantic-slave-trade-4e607526/`

Every inline image must report `complete=true`, `naturalWidth>0`, and `naturalHeight>0`. The full page should show the images instead of empty bordered rectangles. Check browser console/network errors.

Only after the preview passes, promote the same verified deployment to production. Then repeat the article check at `https://anvikshikijournal.in` and report the production deployment URL and SHA.

No database migration is required for this repair.
