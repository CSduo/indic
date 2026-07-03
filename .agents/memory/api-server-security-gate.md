---
name: API server security review gate
description: Code review will block task completion on unauthenticated file upload endpoints and SSRF-prone URL fetchers, regardless of whether they were introduced in the current session.
---

When any Express/Node API server exposes routes that (a) accept file uploads or (b) fetch a user-supplied URL server-side, the code-review gate treats the following as blocking, even if pre-existing and unrelated to the task at hand:

1. **Unauthenticated upload endpoints** — any `POST` route accepting file uploads (e.g. via multer) must require authentication and enforce an explicit MIME-type + extension allowlist (not just a size limit).
2. **SSRF-prone URL fetchers** — any route that does `fetch(userProvidedUrl)` must resolve the hostname via DNS and reject private/loopback/link-local/reserved IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x including cloud metadata 169.254.169.254, ::1, fc00::/7, etc.) and literal `localhost`. Redirects must be followed manually with each hop re-validated — `fetch`'s automatic redirect following bypasses the initial URL check.

**Why:** these are OWASP-top-tier vulnerabilities (broken access control, SSRF) that reviewers flag regardless of origin; "pre-existing, not part of this session's changes" is not accepted as a reason to skip fixing them before `mark_task_complete` passes.

**How to apply:** when doing a Replit migration or any backend work that touches upload/fetch routes, proactively check these two patterns before submitting for review — it avoids a wasted review round-trip.
