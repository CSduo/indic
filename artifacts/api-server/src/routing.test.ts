import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorUser } from "./lib/author-identity";
import type { AuthorHubArticle, AuthorHubPaper } from "./lib/publication-lookup";

// Status codes, redirects and author routing, end to end through Express. The
// database bootstrap is stubbed and every lookup behind these routes is mocked,
// so nothing here touches a database.
vi.mock("@workspace/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@workspace/db")>()),
  ensureDatabaseSchema: async () => undefined,
  coreTablesExist: async () => true,
}));
vi.mock("./lib/publication-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/publication-sync")>()),
  ensureDefaultCategories: async () => undefined,
}));

const state = vi.hoisted(() => ({
  users: [] as AuthorUser[],
  articles: [] as AuthorHubArticle[],
  papers: [] as AuthorHubPaper[],
  /** Full rows by slug, as findPublicationBySlug returns them. */
  rows: new Map<string, any>(),
  /** Published slugs the redirect lookup can choose from. */
  publishedSlugs: [] as string[],
  /** The account findSubmissionOwner reports for any submission. */
  owner: null as string | null,
}));

vi.mock("./lib/public-content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/public-content")>()),
  loadAuthorUsers: async () => state.users,
  hasPublishedPapers: async () => state.papers.length > 0,
}));
vi.mock("./lib/publication-lookup", async (importOriginal) => {
  const original = await importOriginal<typeof import("./lib/publication-lookup")>();
  return {
    ...original,
    findPublicationBySlug: async (_kind: string, slug: string) => state.rows.get(slug) ?? null,
    findPublishedSlugRedirect: async (_kind: string, slug: string) => original.pickSlugRedirect(slug, state.publishedSlugs),
    findSubmissionOwner: async (id: string | null | undefined) => (id ? state.owner : null),
    listAuthorHubWorks: async () => ({ articles: state.articles, papers: state.papers }),
    findAuthorProfile: async () => ({ bio: null, institution: null, avatarUrl: null }),
  };
});

import app from "./app";
import { createUserToken } from "./lib/auth";

const originalDatabaseUrl = process.env.DATABASE_URL;
beforeAll(() => {
  process.env.DATABASE_URL ||= "postgres://seo-test:unused@127.0.0.1:9/unused";
});
afterAll(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

const CURRENT_SLUG = "beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia-86ef8134";
const OLD_SLUG = "beyond-angkor-why-is-vietnam-frequently-excluded";

function hubArticle(overrides: Partial<AuthorHubArticle> = {}): AuthorHubArticle {
  return {
    kind: "article",
    id: "a1",
    slug: "essay-one",
    title: "Essay One",
    subtitle: null,
    excerpt: "An essay.",
    categorySlug: "history",
    authorName: "Xiyato Saanvi",
    readingMinutes: 5,
    heroImageUrl: null,
    publishedAt: "2026-08-01T00:00:00.000Z",
    authorId: "u1",
    ...overrides,
  };
}

beforeEach(() => {
  state.users = [
    { id: "u1", handle: "xiyatosaanvi", name: "Xiyato Saanvi" },
    { id: "u2", handle: "quietreader", name: "Quiet Reader" },
  ];
  state.articles = [
    hubArticle(),
    hubArticle({ id: "a2", slug: "essay-two", authorName: "Arya Ambadi", authorId: null }),
  ];
  state.papers = [];
  state.rows = new Map();
  state.publishedSlugs = [];
  state.owner = null;
});

function robotsMeta(html: string): string | null {
  return html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? null;
}

describe("real 404s instead of soft 404s", () => {
  it("answers an unknown page URL with 404, the app shell and noindex", async () => {
    for (const url of ["/no-such-page", "/domains-of-knowledge/x/y", "/admin-panel"]) {
      const res = await request(app).get(url);
      expect(res.status, url).toBe(404);
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.headers["x-robots-tag"]).toMatch(/noindex/);
      expect(robotsMeta(res.text)).toMatch(/noindex/);
    }
  });

  it("serves client-only routes with 200 and noindex", async () => {
    const privateRoute = await request(app).get("/login");
    expect(privateRoute.status).toBe(200);
    expect(privateRoute.headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(robotsMeta(privateRoute.text)).toBe("noindex, nofollow");

    for (const url of ["/admin", "/account/edit/some-draft", "/submit/write", "/messages/abc"]) {
      const res = await request(app).get(url);
      expect(res.status, url).toBe(200);
      expect(res.headers["x-robots-tag"], url).toBe("noindex, nofollow");
    }

    const search = await request(app).get("/search?q=nyaya");
    expect(search.status).toBe(200);
    expect(search.headers["x-robots-tag"]).toBe("noindex, follow");
  });

  it("answers a missing file with a plain 404 and a missing API path with JSON", async () => {
    const file = await request(app).get("/assets/missing-chunk-abc123.js");
    expect(file.status).toBe(404);
    expect(file.headers["content-type"]).toMatch(/text\/plain/);

    const api = await request(app).get("/api/no-such-endpoint");
    expect(api.status).toBe(404);
    expect(api.headers["content-type"]).toMatch(/json/);
  });

  it("keeps API JSON out of the index but not uploaded files", async () => {
    // robots.txt allows the SPA's public read endpoints to be fetched.
    const api = await request(app).get("/api/no-such-endpoint");
    expect(api.headers["x-robots-tag"]).toBe("noindex");
    const upload = await request(app).get("/api/uploads/no-such-file.pdf");
    expect(upload.headers["x-robots-tag"]).toBeUndefined();
  });
});

describe("redirects", () => {
  it("drops a trailing slash with a 308 and keeps the query string", async () => {
    const res = await request(app).get("/archive/?page=2");
    expect(res.status).toBe(308);
    expect(res.headers.location).toBe("/archive?page=2");

    const nested = await request(app).get(`/articles/${CURRENT_SLUG}/`);
    expect(nested.status).toBe(308);
    expect(nested.headers.location).toBe(`/articles/${CURRENT_SLUG}`);
  });

  it("lower-cases a mis-cased section name", async () => {
    const res = await request(app).get("/About");
    expect(res.status).toBe(308);
    expect(res.headers.location).toBe("/about");
  });

  it("redirects legacy /essays and /categories URLs without an injected ?slug=", async () => {
    const essay = await request(app).get("/essays/some-essay?slug=some-essay");
    expect(essay.status).toBe(301);
    expect(essay.headers.location).toBe("/articles/some-essay");

    const tracked = await request(app).get("/essays/some-essay?utm_source=newsletter");
    expect(tracked.headers.location).toBe("/articles/some-essay?utm_source=newsletter");

    const category = await request(app).get("/categories/history?slug=history");
    expect(category.status).toBe(301);
    expect(category.headers.location).toBe("/domains/history");
  });

  it("sends index URLs that have no page of their own to the listing that has", async () => {
    for (const [from, to] of [["/essays", "/archive"], ["/articles", "/archive"], ["/categories", "/domains"], ["/authors", "/browse"]]) {
      const res = await request(app).get(from);
      expect(res.status, from).toBe(301);
      expect(res.headers.location, from).toBe(to);
    }
  });

  it("redirects the old sitemap location", async () => {
    const res = await request(app).get("/api/sitemap.xml");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/sitemap.xml");
  });

  it("301s the formerly indexed short article URL to the current slug", async () => {
    state.publishedSlugs = [CURRENT_SLUG];
    const res = await request(app).get(`/articles/${OLD_SLUG}`);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe(`/articles/${CURRENT_SLUG}`);
  });

  it("returns 404 when a missing slug matches no work, or more than one", async () => {
    state.publishedSlugs = ["shared-prefix-one", "shared-prefix-two"];
    const ambiguous = await request(app).get("/articles/shared-prefix");
    expect(ambiguous.status).toBe(404);
    expect(robotsMeta(ambiguous.text)).toMatch(/noindex/);

    const missing = await request(app).get("/articles/nothing-like-this");
    expect(missing.status).toBe(404);
  });
});

describe("article pages", () => {
  it("cleans the title, derives a description and keeps a single H1", async () => {
    state.rows.set(CURRENT_SLUG, {
      id: "a9",
      slug: CURRENT_SLUG,
      title: "Beyond Angkor: Why is Vietnam Frequently Excluded from the History of Hindu Influence in Southeast Asia:",
      subtitle: null,
      excerpt: "",
      seoTitle: null,
      seoDescription: "",
      body: "<h1>Introduction</h1><p>Champa was a polity on the coast of what is now central and southern Vietnam. Its temples at My Son were built over several centuries. Its kings used Sanskrit inscriptions.</p><h2>Sources</h2><p>Later text.</p><h1>Conclusion</h1><p>End.</p>",
      authorName: "Xiyato Saanvi",
      status: "PUBLISHED",
      deletedAt: null,
      publishedAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
      categorySlug: null,
      tags: [],
      sourceSubmissionId: null,
    });
    const res = await request(app).get(`/articles/${CURRENT_SLUG}`);
    expect(res.status).toBe(200);

    const title = res.text.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    expect(title).toBe("Beyond Angkor: Why is Vietnam Frequently Excluded from the History of Hindu Influence in Southeast Asia — Ānvīkṣikī");
    const ogTitle = res.text.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? "";
    expect(ogTitle.endsWith("Southeast Asia")).toBe(true);

    const description = res.text.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.startsWith("Champa was a polity")).toBe(true);

    expect(res.text.match(/<h1[\s>]/g)?.length).toBe(1);
    // The visible headline matches the cleaned JSON-LD headline.
    expect(res.text.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1]).toBe("Beyond Angkor: Why is Vietnam Frequently Excluded from the History of Hindu Influence in Southeast Asia");
    expect(res.text).toContain("<h2>Introduction</h2>");
    expect(res.text).toContain("<h3>Sources</h3>");
  });

  // The client renders `body` from __INITIAL_DATA__ with dangerouslySetInnerHTML,
  // so the embedded body must be the sanitised, repaired one the API returns,
  // never the stored value.
  function initialDataBody(html: string): string {
    const json = html.match(/<script id="__INITIAL_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1] ?? "null";
    return JSON.parse(json)?.data?.body ?? "";
  }

  function articleRow(slug: string, body: string) {
    return {
      id: `id-${slug}`, slug, title: "An Essay", subtitle: null, excerpt: "An essay.", seoTitle: null, seoDescription: null,
      body, authorName: "Xiyato Saanvi", status: "PUBLISHED", deletedAt: null, publishedAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z", categorySlug: null, tags: [], sourceSubmissionId: null,
    };
  }

  it("embeds a sanitised body in the initial data, not the stored HTML", async () => {
    state.rows.set("unsafe-body", articleRow("unsafe-body", '<p>Text</p><img src="x" onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">x</a>'));
    const res = await request(app).get("/articles/unsafe-body");
    expect(res.status).toBe(200);
    const body = initialDataBody(res.text);
    expect(body).toContain("<p>Text</p>");
    expect(body).not.toMatch(/onerror|<script|javascript:/i);
  });

  it("restores legacy inline images in the server HTML and the initial data", async () => {
    const slug = "the-transatlantic-slave-trade-4e607526";
    state.rows.set(slug, articleRow(slug, '<p>Text</p><img alt="A ship"><p>More</p>'));
    const res = await request(app).get(`/articles/${slug}`);
    expect(res.status).toBe(200);
    const legacySrc = `/images/legacy/${slug}/01.jpg`;
    expect(initialDataBody(res.text)).toContain(legacySrc);
    expect(res.text.replace(/<script id="__INITIAL_DATA__"[\s\S]*?<\/script>/, "")).toContain(`src="${legacySrc}"`);
  });
});

describe("unpublished works", () => {
  function draftRow() {
    return {
      id: "d1", slug: "a-draft", title: "A Draft", subtitle: null, excerpt: "Not yet published.", seoTitle: null,
      seoDescription: null, body: "<p>Unpublished text.</p>", authorName: "Xiyato Saanvi", status: "DRAFT", deletedAt: null,
      publishedAt: null, updatedAt: "2026-08-02T00:00:00.000Z", categorySlug: null, tags: [], sourceSubmissionId: "s1",
    };
  }

  it("is a 404 for anonymous visitors and for a forged session cookie", async () => {
    state.rows.set("a-draft", draftRow());
    for (const cookie of [undefined, "user_session=forged", "admin_session=forged"]) {
      const req = request(app).get("/articles/a-draft");
      const res = cookie ? await req.set("Cookie", cookie) : await req;
      expect(res.status, cookie ?? "anonymous").toBe(404);
      expect(res.text).not.toContain("Unpublished text.");
    }
  });

  it("is a 404 for a signed-in account that did not submit it", async () => {
    state.rows.set("a-draft", draftRow());
    state.owner = "u1";
    const token = await createUserToken("u2", "reader@example.com");
    const res = await request(app).get("/articles/a-draft").set("Cookie", `user_session=${token}`);
    expect(res.status).toBe(404);
  });

  it("renders for the account that submitted it, noindex and uncached", async () => {
    state.rows.set("a-draft", draftRow());
    state.owner = "u1";
    const token = await createUserToken("u1", "author@example.com");
    const res = await request(app).get("/articles/a-draft").set("Cookie", `user_session=${token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Unpublished text.");
    expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });
});

describe("author pages", () => {
  it("renders the canonical handle URL of an author with published work", async () => {
    const res = await request(app).get("/authors/xiyatosaanvi");
    expect(res.status).toBe(200);
    expect(robotsMeta(res.text)).toMatch(/^index/);
    expect(res.text).toContain('<link rel="canonical" href="https://anvikshikijournal.in/authors/xiyatosaanvi"');
  });

  it("301s other spellings of a known author to the handle URL", async () => {
    for (const variant of ["XiyatoSaanvi", "@xiyatosaanvi", "u1", "xiyato-saanvi"]) {
      const res = await request(app).get(`/authors/${encodeURIComponent(variant)}`);
      expect(res.status, variant).toBe(301);
      expect(res.headers.location, variant).toBe("/authors/xiyatosaanvi");
    }
  });

  it("never matches part of a name", async () => {
    for (const partial of ["xiyato", "saanvi", "arya", "xiyatosaanvi-extra"]) {
      const res = await request(app).get(`/authors/${partial}`);
      expect(res.status, partial).toBe(404);
      expect(robotsMeta(res.text), partial).toMatch(/noindex/);
    }
  });

  it("serves a byline-only author at the name slug and redirects other spellings to it", async () => {
    const res = await request(app).get("/authors/arya-ambadi");
    expect(res.status).toBe(200);
    expect(robotsMeta(res.text)).toMatch(/^index/);

    const variant = await request(app).get("/authors/Arya-Ambadi");
    expect(variant.status).toBe(301);
    expect(variant.headers.location).toBe("/authors/arya-ambadi");
  });

  it("keeps an account without published work reachable but out of the index", async () => {
    const res = await request(app).get("/authors/quietreader");
    expect(res.status).toBe(200);
    expect(res.headers["x-robots-tag"]).toBe("noindex, follow");
    expect(robotsMeta(res.text)).toBe("noindex, follow");
  });
});
