# ĀNVĪKṢIKĪ — FRONTEND REBUILD HANDOFF
### For the next Claude session to continue exactly where this one stopped.

---

## 🔴 FIRST: READ THESE THREE THINGS BEFORE DOING ANYTHING

1. **This is a pnpm monorepo** deployed on Replit (API) + Vercel (frontend SPA).
2. **DO NOT touch** `artifacts/api-server/`, `lib/`, `scripts/`, or any root config files.
3. **The only folder you are replacing** is `artifacts/anvikshiki/` — that is the frontend.

---

## REPOSITORY STRUCTURE (GitHub: CSduo/GitHub-Connect)

```
GitHub-Connect/              ← root — DO NOT TOUCH configs here
├── artifacts/
│   ├── anvikshiki/         ← FRONTEND (this is what we're building)
│   └── api-server/         ← EXPRESS API (DO NOT TOUCH)
├── lib/
│   ├── db/                 ← Drizzle ORM + PostgreSQL schema (DO NOT TOUCH)
│   ├── api-client-react/   ← TanStack Query hooks (DO NOT TOUCH)
│   └── api-zod/            ← Zod validation schemas (DO NOT TOUCH)
├── scripts/                ← build/deploy scripts (DO NOT TOUCH)
├── .env.example            ← environment variable template (read this)
├── package.json            ← workspace root
├── pnpm-workspace.yaml     ← monorepo config
└── vercel.json             ← Vercel deployment config
```

---

## TECH STACK (frontend only)

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Build | Vite + @vitejs/plugin-react |
| Styles | TailwindCSS v4 (via @tailwindcss/vite) + CSS variables |
| Routing | Wouter v3 |
| Data fetching | TanStack Query v5 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Language | TypeScript 5.9 |
| Package manager | pnpm (workspace catalog pattern) |

All dependencies use `"catalog:"` in package.json — they resolve from the root `pnpm-workspace.yaml` catalog. **Do not add version numbers; use `"catalog:"` for everything.**

---

## ENVIRONMENT VARIABLES (frontend)

Add these to Vercel and to local `.env` in `artifacts/anvikshiki/`:

```env
VITE_API_URL=https://your-replit-api-url.replit.app
VITE_ASSET_BASE=https://your-replit-api-url.replit.app
VITE_SITE_DOMAIN=anvikshiki.in
```

In dev, Vite proxies `/api` → `http://localhost:8080` automatically (configured in `vite.config.ts`).

---

## API SERVER (Express on port 8080)

The API base is `http://localhost:8080` in dev, `VITE_API_URL` in prod.
All frontend API calls go through `src/lib/api.ts`.

**Auth:** JWT Bearer tokens.
- User token → `sessionStorage` key `anvikshiki_token`
- Admin token → `sessionStorage` key `anvikshiki_admin_token`
- On page load, `GET /api/auth/me` restores session from token.

**Existing endpoints the frontend expects:**
```
POST /api/auth/register         → { token, user }
POST /api/auth/login            → { token, user }
GET  /api/auth/me               → User
GET  /api/essays                → PaginatedResponse<Article>
GET  /api/essays/:slug          → Article
GET  /api/papers                → PaginatedResponse<Paper>
GET  /api/papers/:slug          → Paper
GET  /api/domains               → Domain[]
GET  /api/domains/:slug         → Domain + articles + papers
GET  /api/home                  → { featured, latestEssays, latestPapers, domains }
GET  /api/archive               → PaginatedResponse<Article|Paper>
GET  /api/search?q=             → { results, total }
GET  /api/drafts                → Draft[]
POST /api/drafts                → Draft
GET  /api/drafts/:id            → Draft
PATCH /api/drafts/:id           → Draft
DELETE /api/drafts/:id          → void
POST /api/drafts/:id/submit     → Submission
POST /api/import-document       → { draftId, wordCount, warnings }
GET  /api/submissions           → Submission[]
GET  /api/submissions/:id       → Submission
GET  /api/saved                 → SavedItem[]
POST /api/saved                 → SavedItem
DELETE /api/saved/:id           → void
GET  /api/saved/check           → { saved, itemId }
GET  /api/collections           → Collection[]
POST /api/collections           → Collection
PATCH /api/profile              → User
POST /api/profile/avatar        → { avatarUrl }
GET  /api/notifications         → Notification[]
POST /api/newsletter/subscribe  → { message }
GET  /api/admin/dashboard       → { pendingCount, publishedCount, ... }
GET  /api/admin/submissions     → PaginatedResponse<Submission>
GET  /api/admin/submissions/:id → Submission + draft + files
PATCH /api/admin/submissions/:id/status → Submission
POST /api/admin/submissions/:id/publish → Article
```

---

## DESIGN SYSTEM (DO NOT CHANGE THESE)

### Color tokens (CSS variables in `src/styles/globals.css`)
```css
--color-ink:            #0F1B1F   /* dark charcoal — dark backgrounds, headings */
--color-teal:           #16455F   /* medium teal — secondary sections, buttons */
--color-gold:           #B99A42   /* warm gold — PRIMARY CTA colour */
--color-gold-light:     #D4B55A   /* gold hover */
--color-rust:           #C26A4F   /* rust/terracotta — domain accents, eyebrows */
--color-parchment:      #F1EBD6   /* cream — main page background */
--color-parchment-dark: #E4D5B8   /* warm parchment — card backgrounds */
--color-muted:          #6B7B80   /* muted text */
--color-border:         #D4C9A8   /* border colour */
```

### Typography
```css
--font-display:   "Alegreya", Georgia, serif       /* article titles, hero */
--font-classical: "Cinzel", "Trajan Pro", serif    /* section labels, eyebrows */
--font-ui:        "Inter", system-ui, sans-serif   /* nav, body, UI */
```
Loaded via Google Fonts in `index.html`. **Do not change the font choices.**

### Visual language (from reference images)
- Parchment background + dark teal/ink sections for contrast
- Gold as the ONLY primary CTA colour
- Animal glyphs (SVG) for domain identity — see `AnimalGlyph.tsx`
- Devanagari watermark text in hero panels at low opacity
- Ornamental border strips using the animal glyph row
- Eyebrow labels in Cinzel, small-caps, rust colour
- "Card" style: white bg + border + subtle shadow + hover lift

---

## OFFICIAL EMBLEM

The project has an existing emblem. **Do not redesign it.**
The frontend expects it at: `public/emblem.svg` and `public/emblem.png`
If missing, the `<img>` tags silently hide via `onError`. Copy the emblem from
the current `artifacts/anvikshiki/public/` directory (or wherever it lives in the
existing repo) into the new `public/` folder.

---

## PROGRESS TRACKER

### Overall: 64% complete (45 / ~70 files)

```
████████████████████░░░░░░░░░░  64%
```

---

### ✅ DONE (45 files)

#### Foundation & Config
- [x] `package.json`
- [x] `vite.config.ts`
- [x] `tsconfig.json`
- [x] `index.html`
- [x] `src/env.ts`

#### Design System
- [x] `src/styles/globals.css` — all CSS variables, Tailwind v4, prose, utility classes

#### Core Libraries
- [x] `src/lib/api.ts` — complete API client: all endpoints, JWT auth, typed models
- [x] `src/lib/auth-context.tsx` — AuthProvider, useAuth hook, session restore
- [x] `src/lib/constants.ts` — DOMAINS, content types, statuses, glyphs, nav links
- [x] `src/lib/utils.ts` — cn(), dates, reading time, slugify, draft backup

#### Hooks
- [x] `src/hooks/useToast.ts`
- [x] `src/hooks/useDebounce.ts`

#### UI Components (10/12 done)
- [x] `src/components/ui/Button.tsx` — 5 variants, loading state
- [x] `src/components/ui/Input.tsx` — Input, Textarea, Select
- [x] `src/components/ui/Modal.tsx` — accessible, focus-trapped
- [x] `src/components/ui/Toast.tsx` — 4 variants, animated
- [x] `src/components/ui/Skeleton.tsx` — CardSkeleton, HeroSkeleton, GridSkeleton
- [x] `src/components/ui/EmptyState.tsx` — glyph, title, desc, 2 actions
- [x] `src/components/ui/Badge.tsx` — Badge, StatusBadge, DomainChip
- [x] `src/components/ui/Breadcrumb.tsx`
- [ ] `src/components/ui/Tabs.tsx` — **MISSING**
- [ ] `src/components/ui/Pagination.tsx` — **MISSING**

#### Layout Components (4/4 done)
- [x] `src/components/layout/AppShell.tsx`
- [x] `src/components/layout/Header.tsx` — desktop nav, search, plus button, profile dropdown
- [x] `src/components/layout/MobileDrawer.tsx` — animated slide-in
- [x] `src/components/layout/Footer.tsx` — 4-column nav, newsletter, animal strip

#### Feature Components (6/9 done)
- [x] `src/components/glyphs/AnimalGlyph.tsx` — 16 SVG glyphs
- [x] `src/components/hero/HeroPanel.tsx` — 8 variants, parallax, Devanagari motif
- [x] `src/components/content/EssayCard.tsx` — grid + list, save action
- [x] `src/components/content/DomainCard.tsx` — full + compact
- [x] `src/components/auth/AuthGate.tsx` — modal auth prompt
- [x] `src/components/plus/CreateHub.tsx` — 7 create options, auth-aware
- [ ] `src/components/content/PaperCard.tsx` — **MISSING**
- [ ] `src/components/content/ArchiveCard.tsx` — **MISSING**
- [ ] `src/components/content/CommunityCard.tsx` — **MISSING**

#### Pages — Public (6/11 done)
- [x] `src/pages/HomePage.tsx` — hero, domains, featured essay, latest papers, community CTA
- [x] `src/pages/EssaysPage.tsx` — filters, domain chips, grid/list toggle
- [x] `src/pages/EssayDetailPage.tsx` — full reader, TOC, reading controls, related
- [x] `src/pages/ExplorePage.tsx` — discovery hub
- [x] `src/pages/SearchPage.tsx` — global search with filters
- [x] `src/pages/AboutPage.tsx` — mission, editorial, guidelines
- [ ] `src/pages/DomainsPage.tsx` — **MISSING**
- [ ] `src/pages/DomainDetailPage.tsx` — **MISSING**
- [ ] `src/pages/PapersPage.tsx` — **MISSING**
- [ ] `src/pages/PaperDetailPage.tsx` — **MISSING**
- [ ] `src/pages/ArchivePage.tsx` — **MISSING**
- [ ] `src/pages/CommunityPage.tsx` — public landing — **MISSING**
- [ ] `src/pages/ContactPage.tsx` — **MISSING**
- [ ] `src/pages/NotFoundPage.tsx` — **MISSING**

#### Pages — Auth (2/2 done)
- [x] `src/pages/LoginPage.tsx`
- [x] `src/pages/SignupPage.tsx` — 3-step flow: credentials → interests → avatar

#### Pages — Account (3/8 done)
- [x] `src/pages/account/AccountPage.tsx` — dashboard overview
- [x] `src/pages/account/DraftsPage.tsx`
- [x] `src/pages/account/SubmissionsPage.tsx`
- [ ] `src/pages/account/ProfilePage.tsx` — **MISSING**
- [ ] `src/pages/account/SavedPage.tsx` — **MISSING**
- [ ] `src/pages/account/CollectionsPage.tsx` — **MISSING**
- [ ] `src/pages/account/NotificationsPage.tsx` — **MISSING**
- [ ] `src/pages/account/SettingsPage.tsx` — **MISSING**

#### Pages — Writer (4/5 done)
- [x] `src/pages/writer/WriterStartPage.tsx`
- [x] `src/pages/writer/EditorPage.tsx` — rich editor shell, autosave
- [x] `src/pages/writer/MetadataPage.tsx` — all metadata fields
- [x] `src/pages/writer/SubmitPage.tsx` — final checklist + submission
- [ ] `src/pages/writer/PreviewPage.tsx` — **MISSING**

#### Pages — Community (0/3 done)
- [ ] `src/pages/community/CommunityFeedPage.tsx` — **MISSING**
- [ ] `src/pages/community/DiscussionsPage.tsx` — **MISSING**
- [ ] `src/pages/community/EventsPage.tsx` — **MISSING**

#### Pages — Admin (0/3 done)
- [ ] `src/pages/admin/AdminPage.tsx` — dashboard — **MISSING**
- [ ] `src/pages/admin/AdminReviewPage.tsx` — submission table — **MISSING**
- [ ] `src/pages/admin/AdminSubmissionDetailPage.tsx` — review panel — **MISSING**

#### 🔴 APP ENTRY — NOT CREATED YET (CRITICAL)
- [ ] `src/main.tsx` — **MISSING — app cannot run without this**
- [ ] `src/App.tsx` — **MISSING — app cannot run without this**

---

### ❌ MISSING (25 files)

| Priority | File | Why it matters |
|---|---|---|
| 🔴 CRITICAL | `src/main.tsx` | App entry point — nothing runs without this |
| 🔴 CRITICAL | `src/App.tsx` | Router + all routes — nothing renders without this |
| 🟠 HIGH | `src/components/content/PaperCard.tsx` | Used by PapersPage |
| 🟠 HIGH | `src/pages/DomainsPage.tsx` | Core discovery page |
| 🟠 HIGH | `src/pages/DomainDetailPage.tsx` | Domain index page |
| 🟠 HIGH | `src/pages/PapersPage.tsx` | Papers index |
| 🟠 HIGH | `src/pages/NotFoundPage.tsx` | All invalid routes |
| 🟡 MED | `src/pages/PaperDetailPage.tsx` | Individual paper reader |
| 🟡 MED | `src/pages/ArchivePage.tsx` | Archive hub |
| 🟡 MED | `src/pages/CommunityPage.tsx` | Public community landing |
| 🟡 MED | `src/pages/ContactPage.tsx` | Contact page |
| 🟡 MED | `src/pages/writer/PreviewPage.tsx` | Draft preview before submit |
| 🟡 MED | `src/pages/account/ProfilePage.tsx` | Profile editing |
| 🟡 MED | `src/pages/account/SavedPage.tsx` | Saved items library |
| 🟡 MED | `src/pages/account/SettingsPage.tsx` | Account settings |
| 🟡 MED | `src/pages/admin/AdminPage.tsx` | Admin dashboard |
| 🟡 MED | `src/pages/admin/AdminReviewPage.tsx` | Submission queue |
| 🟡 MED | `src/pages/admin/AdminSubmissionDetailPage.tsx` | Review + decision panel |
| 🟢 LOW | `src/components/content/ArchiveCard.tsx` | Archive items |
| 🟢 LOW | `src/components/content/CommunityCard.tsx` | Discussion cards |
| 🟢 LOW | `src/components/ui/Tabs.tsx` | Tab nav component |
| 🟢 LOW | `src/components/ui/Pagination.tsx` | Page navigation |
| 🟢 LOW | `src/pages/community/CommunityFeedPage.tsx` | Auth community feed |
| 🟢 LOW | `src/pages/community/DiscussionsPage.tsx` | Discussion index |
| 🟢 LOW | `src/pages/community/EventsPage.tsx` | Events/salons |

---

## INSTRUCTIONS FOR NEXT CLAUDE

### Step 1 — Read these files first (in this order)
1. `src/lib/api.ts` — understand all typed API contracts
2. `src/lib/constants.ts` — domains, glyphs, statuses
3. `src/styles/globals.css` — all CSS variables
4. `src/components/layout/AppShell.tsx` — understand the shell pattern
5. Any one completed page (e.g. `src/pages/HomePage.tsx`) — understand the page pattern

### Step 2 — Build in this exact order (priority sequence)

**BATCH 1 — Critical (app won't run without these):**
```
src/main.tsx
src/App.tsx
src/pages/NotFoundPage.tsx
```

**BATCH 2 — Core missing public pages:**
```
src/components/content/PaperCard.tsx
src/pages/DomainsPage.tsx
src/pages/DomainDetailPage.tsx
src/pages/PapersPage.tsx
src/pages/PaperDetailPage.tsx
src/pages/ArchivePage.tsx
src/pages/CommunityPage.tsx
src/pages/ContactPage.tsx
```

**BATCH 3 — Account + writer completion:**
```
src/pages/writer/PreviewPage.tsx
src/pages/account/ProfilePage.tsx
src/pages/account/SavedPage.tsx
src/pages/account/CollectionsPage.tsx
src/pages/account/NotificationsPage.tsx
src/pages/account/SettingsPage.tsx
```

**BATCH 4 — Admin panel:**
```
src/pages/admin/AdminPage.tsx
src/pages/admin/AdminReviewPage.tsx
src/pages/admin/AdminSubmissionDetailPage.tsx
```

**BATCH 5 — Community + extras:**
```
src/components/ui/Tabs.tsx
src/components/content/ArchiveCard.tsx
src/components/content/CommunityCard.tsx
src/pages/community/CommunityFeedPage.tsx
src/pages/community/DiscussionsPage.tsx
src/pages/community/EventsPage.tsx
src/components/ui/Pagination.tsx
```

### Step 3 — After all files exist, test build
```bash
cd artifacts/anvikshiki
pnpm install        # from repo root
pnpm --filter @workspace/anvikshiki run build
```
Fix any TypeScript or import errors before declaring done.

---

## PATTERNS TO FOLLOW (copy these exactly)

### Page pattern
```tsx
import { AppShell } from "@/components/layout/AppShell";
export function MyPage() {
  return (
    <AppShell>
      <div className="container py-10">
        {/* content */}
      </div>
    </AppShell>
  );
}
```

### Data-fetching pattern
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["key", params],
  queryFn: () => contentApi.someEndpoint(params),
  staleTime: 2 * 60 * 1000,
});
if (isLoading) return <GridSkeleton />;
if (!data || data.length === 0) return <EmptyState ... />;
```

### Auth-protected page pattern
```tsx
const { user, loading } = useAuth();
if (loading) return <GridSkeleton />;
if (!user) return <Navigate to="/login" />;
```

### API error handling pattern
```tsx
try {
  await someApi.action(data);
  toast("Success message", "success");
} catch (err) {
  toast(err instanceof ApiError ? err.message : "Something went wrong.", "error");
}
```

---

## main.tsx TEMPLATE (build this first)
```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth-context";
import { App } from "./App";
import "@/styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const root = document.getElementById("root")!;
createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

## App.tsx TEMPLATE (build this second)
```tsx
import React, { lazy, Suspense } from "react";
import { Router, Route, Switch } from "wouter";
import { GridSkeleton } from "@/components/ui/Skeleton";

// Lazy imports for code splitting
const HomePage         = lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })));
const EssaysPage       = lazy(() => import("@/pages/EssaysPage").then(m => ({ default: m.EssaysPage })));
const EssayDetailPage  = lazy(() => import("@/pages/EssayDetailPage").then(m => ({ default: m.EssayDetailPage })));
// ... etc for every page

const FallbackLoading = () => (
  <div className="container py-20"><GridSkeleton count={3} /></div>
);

export function App() {
  return (
    <Router>
      <Suspense fallback={<FallbackLoading />}>
        <Switch>
          <Route path="/"                              component={HomePage} />
          <Route path="/explore"                       component={ExplorePage} />
          <Route path="/domains"                       component={DomainsPage} />
          <Route path="/domains/:slug"                 component={DomainDetailPage} />
          <Route path="/essays"                        component={EssaysPage} />
          <Route path="/essays/:slug"                  component={EssayDetailPage} />
          <Route path="/papers"                        component={PapersPage} />
          <Route path="/papers/:slug"                  component={PaperDetailPage} />
          <Route path="/archive"                       component={ArchivePage} />
          <Route path="/search"                        component={SearchPage} />
          <Route path="/about"                         component={AboutPage} />
          <Route path="/community"                     component={CommunityPage} />
          <Route path="/community/feed"                component={CommunityFeedPage} />
          <Route path="/community/discussions"         component={DiscussionsPage} />
          <Route path="/community/discussions/:id"     component={DiscussionDetailPage} />
          <Route path="/community/events"              component={EventsPage} />
          <Route path="/contact"                       component={ContactPage} />
          <Route path="/support"                       component={SupportPage} />
          <Route path="/login"                         component={LoginPage} />
          <Route path="/signup"                        component={SignupPage} />
          <Route path="/account"                       component={AccountPage} />
          <Route path="/account/profile"               component={ProfilePage} />
          <Route path="/account/saved"                 component={SavedPage} />
          <Route path="/account/drafts"                component={DraftsPage} />
          <Route path="/account/submissions"           component={SubmissionsPage} />
          <Route path="/account/collections"           component={CollectionsPage} />
          <Route path="/account/notifications"         component={NotificationsPage} />
          <Route path="/account/settings"              component={SettingsPage} />
          <Route path="/write"                         component={WriterStartPage} />
          <Route path="/write/new"                     component={EditorPage} />
          <Route path="/write/import"                  component={WriterStartPage} />
          <Route path="/write/drafts/:id"              component={EditorPage} />
          <Route path="/write/drafts/:id/metadata"     component={MetadataPage} />
          <Route path="/write/drafts/:id/preview"      component={PreviewPage} />
          <Route path="/write/drafts/:id/submit"       component={SubmitPage} />
          <Route path="/admin"                         component={AdminPage} />
          <Route path="/admin/submissions"             component={AdminReviewPage} />
          <Route path="/admin/submissions/:id"         component={AdminSubmissionDetailPage} />
          <Route                                       component={NotFoundPage} />
        </Switch>
      </Suspense>
    </Router>
  );
}
```

---

## WHAT "DONE" LOOKS LIKE

The build is complete when:
1. `pnpm --filter @workspace/anvikshiki run build` exits with code 0
2. All 70 files exist
3. Every route renders something (not blank) for both logged-out and logged-in state
4. The plus button opens the CreateHub modal
5. Login/signup flow works and updates the header
6. Editor opens and autosaves a draft
7. Submit flow reaches the success confirmation screen
8. Admin routes are protected (redirect non-admins)
9. Mobile drawer opens/closes correctly
10. No broken `import` statements

---

## WHAT NOT TO DO

- Do NOT change `src/lib/api.ts` endpoints — they match the existing Express server
- Do NOT change CSS variable names — they're used in 40+ components
- Do NOT use localStorage for auth tokens (sessionStorage is intentional — more secure)
- Do NOT add `"react": "^19"` style versions in package.json — use `"catalog:"`
- Do NOT import from `@workspace/api-client-react` directly — the frontend has its own `src/lib/api.ts`
- Do NOT hardcode fake article data — use empty states when API returns nothing
- Do NOT replace the official emblem — copy it from `public/` in the old frontend

---

## FILES TO DELETE FROM THE OLD FRONTEND

Before dropping the new `artifacts/anvikshiki/` in, delete these from the repo:
```
artifacts/anvikshiki/   ← entire old folder
attached_assets/        ← all old UI images/screenshots
.migration-backup/      ← old backup folder
```

Keep everything else untouched.

---

*This document was generated at the end of Claude Session 1 of the Ānvīkṣikī frontend rebuild.*
*45 files created. 25 remaining. Next session should start with main.tsx and App.tsx.*
