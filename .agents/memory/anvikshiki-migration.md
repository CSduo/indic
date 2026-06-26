---
name: Anvikshiki migration notes
description: Key facts about the Anvikshiki journal platform structure and migration
---

The Anvikshiki project is a dark-themed journal/research platform. It was already a Vite+React project in the Vercel backup (not Next.js). The fullstack_copy_frontend.sh script couldn't auto-detect the client dir because the backup had an unusual monorepo layout (artifact already at artifacts/anvikshiki/).

**Why:** The backup had the complete artifact structure already, so manual cp -r was used instead.

**How to apply:** If making changes to this project, the full schema is in lib/db/src/schema/index.ts with tables: users, admins, categories, articles, papers, submissions, newsletter_subscribers, saved_items, audit_logs, site_settings, media_assets. The backend routes cover articles, papers, categories, auth, search, newsletter, submissions, admin, archive. Auth uses bcryptjs + jose JWT. Admin login uses ADMIN_EMAIL/ADMIN_PASSWORD env vars.
