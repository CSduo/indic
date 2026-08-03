$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Repo = "C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo"
$ExpectedHead = "df78875"
$ExpectedRemote = "https://github.com/CSduo/indic.git"

function Run([string]$Label, [scriptblock]$Command) {
  Write-Host "`n==> $Label" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Label failed." }
}

try {
  Set-Location -LiteralPath $Repo

  $branch = ([string](git branch --show-current)).Trim()
  $head = ([string](git rev-parse --short HEAD)).Trim()
  $remote = ([string](git remote get-url origin)).Trim()

  if ($branch -ne "main") { throw "Expected branch main; found $branch." }
  if ($head -ne $ExpectedHead) { throw "Expected commit $ExpectedHead; found $head. Inspect before pushing." }
  if ($remote -ne $ExpectedRemote) { throw "Unexpected origin: $remote" }

  git diff --quiet
  if ($LASTEXITCODE -ne 0) { throw "Tracked files have uncommitted changes." }
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) { throw "The index contains uncommitted changes." }

  Run "Fetching origin/main" { git fetch origin --prune }
  git merge-base --is-ancestor origin/main HEAD
  if ($LASTEXITCODE -ne 0) { throw "Remote main changed and is not an ancestor of this work. Do not force-push." }

  Write-Host "`nThis script never accepts or embeds a personal access token." -ForegroundColor Yellow
  Write-Host "GitHub must already be authenticated as CSduo or another identity with push access." -ForegroundColor Yellow

  Run "Pushing the four completed commits to main" { git push origin main }

  $remoteHead = ((git ls-remote origin refs/heads/main) -split "\s+")[0]
  $localHead = ([string](git rev-parse HEAD)).Trim()
  if ($remoteHead -ne $localHead) { throw "Remote verification failed. Remote: $remoteHead Local: $localHead" }

  Write-Host "`nSUCCESS: GitHub main now points to $localHead" -ForegroundColor Green
  Write-Host "Next: deploy and verify using outputs\ANTIGRAVITY-HANDOFF.md" -ForegroundColor Green
  exit 0
} catch {
  Write-Host "`nPUSH STOPPED" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "No local commit was discarded. Do not use the token exposed in chat." -ForegroundColor Yellow
  exit 1
}
