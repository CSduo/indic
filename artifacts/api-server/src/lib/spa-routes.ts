/**
 * The SPA's routes (artifacts/anvikshiki/src/App.tsx), split into the ones the
 * server renders itself and the ones only the client renders. On Vercel every
 * request that is not a static file reaches Express, so this list decides
 * which unknown-to-the-server paths still get the app shell (200) and which
 * are real 404s. A test keeps it in step with App.tsx.
 */

/** Routes with their own server-rendered handler (app.ts, routes/public-pages.ts). */
export const SERVER_RENDERED_ROUTES = [
  "/",
  "/browse",
  "/archive",
  "/domains",
  "/domains/:slug",
  "/articles",
  "/articles/:slug",
  "/authors",
  "/authors/:slug",
  "/essays",
  "/essays/:slug",
  "/papers",
  "/papers/:slug",
  "/about",
  "/about/anvikshiki",
  "/contact",
  "/community",
  "/submit",
  "/profile/:userId",
  "/privacy",
  "/terms",
  "/categories",
  "/categories/:slug",
] as const;

export interface ClientOnlyRoute {
  path: string;
  /** Signed-in or administrative screens: noindex, nofollow. */
  private: boolean;
}

/**
 * Routes only the client renders. None is meant for search results: search
 * results, community placeholders and every signed-in screen get the shell
 * with noindex.
 */
export const CLIENT_ONLY_ROUTES: ClientOnlyRoute[] = [
  { path: "/search", private: false },
  { path: "/community/feed", private: false },
  { path: "/community/discussions", private: false },
  { path: "/community/events", private: false },
  { path: "/community/members", private: false },
  { path: "/login", private: true },
  { path: "/account", private: true },
  { path: "/account/profile", private: true },
  { path: "/account/collections", private: true },
  { path: "/account/notifications", private: true },
  { path: "/account/settings", private: true },
  { path: "/account/edit/:slug", private: true },
  { path: "/submit/details", private: true },
  { path: "/submit/upload", private: true },
  { path: "/submit/write", private: true },
  { path: "/submit/preview", private: true },
  { path: "/submit/success", private: true },
  { path: "/saved", private: true },
  { path: "/admin/login", private: true },
  { path: "/admin", private: true },
  { path: "/admin/articles", private: true },
  { path: "/admin/articles/new", private: true },
  { path: "/admin/papers", private: true },
  { path: "/admin/papers/new", private: true },
  { path: "/admin/submissions", private: true },
  { path: "/admin/newsletter", private: true },
  { path: "/admin/settings", private: true },
  { path: "/admin/users", private: true },
  { path: "/messages", private: true },
  { path: "/messages/:id", private: true },
];

function routeRegex(pattern: string): RegExp {
  const source = pattern
    .split("/")
    .map((segment) => (segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${source}$`);
}

const CLIENT_ONLY_MATCHERS = CLIENT_ONLY_ROUTES.map((route) => ({ route, regex: routeRegex(route.path) }));

/** The client-only route a path belongs to (exact, case-sensitive), if any. */
export function matchClientOnlyRoute(pathname: string): ClientOnlyRoute | null {
  return CLIENT_ONLY_MATCHERS.find(({ regex }) => regex.test(pathname))?.route ?? null;
}

/** First path segments that belong to the site, for case normalisation. */
export const KNOWN_SECTIONS = new Set(
  [...SERVER_RENDERED_ROUTES, ...CLIENT_ONLY_ROUTES.map((route) => route.path)]
    .map((route) => route.split("/")[1])
    .filter(Boolean),
);

/** A request for a file (a last segment with an extension), not a page. */
export function looksLikeFile(pathname: string): boolean {
  const last = pathname.split("/").pop() || "";
  return /\.[A-Za-z0-9]{1,8}$/.test(last);
}

/**
 * Where a page URL should permanently redirect to normalise it, or null.
 *
 * - A trailing slash is dropped (308): /about/ -> /about.
 * - An upper-case first segment that names a site section is lower-cased:
 *   /About -> /about, /Articles/x -> /articles/x. The rest of the path is kept.
 *
 * Paths that would produce a protocol-relative or backslash location are left
 * alone, so this can never redirect off-site. /api paths are not touched.
 */
export function normalizedPagePath(pathname: string): string | null {
  if (pathname === "/" || pathname === "/api" || pathname.startsWith("/api/")) return null;
  if (pathname.includes("\\") || pathname.startsWith("//")) return null;

  let next = pathname.replace(/\/+$/, "") || "/";
  const [, first = "", ...rest] = next.split("/");
  const lowerFirst = first.toLowerCase();
  if (first !== lowerFirst && KNOWN_SECTIONS.has(lowerFirst)) {
    next = ["", lowerFirst, ...rest].join("/");
  }
  if (next === pathname) return null;
  if (!/^\/(?![/\\])/.test(next)) return null;
  return next;
}
