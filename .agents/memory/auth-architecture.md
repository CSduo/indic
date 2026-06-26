---
name: Auth Architecture
description: How auth state flows in Ānvīkṣikī — contexts, cookies, and API layer
---

# Auth Architecture

## Rule
Use `useAuthContext()` from `AuthContext.tsx` everywhere. The `useAuth` hook in `hooks/useAuth.ts` is just a re-export for backwards compatibility.

**Why:** Previous pattern had per-component `useSWR('/api/auth/me')` calls that didn't share state — login on one page didn't update the header. AuthProvider wraps the whole app in App.tsx.

## How to apply
- After login/register: call `login(user)` from `useAuthContext()` to set global state immediately
- After logout: call `logout()` from context (it also calls `/api/auth/logout`)
- For profile refresh: call `refresh()` from context (fetches /api/auth/me)

## Cookie setup
- User session: `user_session` (HttpOnly, SameSite=Lax)
- Admin session: `admin_session` (same pattern, separate signing)
- AUTH_SECRET / ADMIN_SECRET env vars must be set in production — without them sessions invalidate on every server restart
