---
name: Admin Routes Pattern
description: How admin backend routes are structured and what tables are imported
---

# Admin Routes

## Imports in admin.ts
All tables needed by admin routes: `adminsTable, articlesTable, papersTable, submissionsTable, newsletterSubscribersTable, categoriesTable, usersTable, siteSettingsTable`

## New routes added
- `GET /api/admin/users` — list all registered users
- `GET /api/admin/site-settings` — list all site settings (key/value store)
- `PUT /api/admin/site-settings/:key` — upsert a site setting by key

## Pattern
All admin routes use `requireAdmin` middleware (checks admin_session cookie). Returns 401 if not authenticated.

**Why:** Needed for Admin Users page and Admin Settings CMS to work with real data.
