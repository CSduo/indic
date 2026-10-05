import fs from "fs";
import path from "path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublishedWorks, WorkSummary } from "./lib/public-content";

// The page routes sit behind the database bootstrap middleware, which is
// stubbed; the data layer behind the pages is mocked per test.
vi.mock("@workspace/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@workspace/db")>()),
  ensureDatabaseSchema: async () => undefined,
  coreTablesExist: async () => true,
}));
vi.mock("./lib/publication-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/publication-sync")>()),
  ensureDefaultCategories: async () => undefined,
}));

const content = vi.hoisted(() => ({
  works: { articles: [], papers: [] } as PublishedWorks,
  categories: [] as Array<{ slug: string; name: string; description: string | null }>,
  fail: false,
}));
vi.mock("./lib/public-content", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/public-content")>()),
  listPublishedWorks: async () => {
    if (content.fail) throw new Error("database unavailable");
    return content.works;
  },
  listVisibleCategories: async () => {
    if (content.fail) throw new Error("database unavailable");
    return content.categories;
  },
  hasPublishedPapers: async () => content.works.papers.length > 0,
}));

import app, { demoteBodyHeadings, generateDomainHubSsrHtml, serializeInitialData } from "./app";
import { PAGE_META } from "./lib/page-meta";

const originalDatabaseUrl = process.env.DATABASE_URL;
beforeAll(() => {
  process.env.DATABASE_URL ||= "postgres://seo-test:unused@127.0.0.1:9/unused";
});
afterAll(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

function article(n: number, overrides: Partial<WorkSummary> = {}): WorkSummary {
  const day = String((n % 28) + 1).padStart(2, "0");
  return {
    kind: "article",
    id: `a${String(n).padStart(4, "0")}`,
    slug: `essay-${n}`,
    title: `Essay ${n}`,
    excerpt: `Summary of essay ${n}.`,
    authorName: "Xiyato Saanvi",
    authorPath: "/authors/xiyatosaanvi",
    categorySlug: "history",
    publishedAt: new Date(Date.UTC(2026, 7 - Math.floor(n / 28), Number(day))).toISOString(),
    readingMinutes: 8,
    heroImageUrl: null,
    ...overrides,
  };
}

const CATEGORIES = [
  { slug: "history", name: "History", description: "Essays on the past." },
  { slug: "philosophy", name: "Philosophy", description: null },
  { slug: "aesthetics", name: "Aesthetics", description: null },
];

beforeEach(() => {
  content.fail = false;
  content.categories = CATEGORIES;
  content.works = {
    articles: [
      article(1, { title: "Beyond Angkor", slug: "beyond-angkor-86ef8134", publishedAt: "2026-08-03T23:39:00.000Z" }),
      article(2, { title: "The Quantum and the Eternal", slug: "quantum-eternal", categorySlug: "philosophy", publishedAt: "2026-08-21T11:14:00.000Z" }),
    ],
    papers: [],
  };
});

function count(html: string, pattern: RegExp): number {
  return (html.match(pattern) || []).length;
}

function initialData(html: string): any {
  const match = html.match(/<script id="__INITIAL_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  expect(match).not.toBeNull();
  return JSON.parse(match![1]);
}

/** Every <script> is either external or a non-executable data block. */
function expectNoInlineExecutableScript(html: string) {
  for (const tag of html.match(/<script\b[^>]*>/g) || []) {
    const isData = /type="application\/(ld\+)?json"/.test(tag);
    const isExternal = /\ssrc=/.test(tag);
    expect(isData || isExternal, tag).toBe(true);
  }
}

function expectSiteNav(html: string, { papers }: { papers: boolean }) {
  for (const href of ["/", "/browse", "/archive", "/domains", "/about", "/submit", "/contact"]) {
    expect(html).toContain(`<li><a href="${href}">`);
  }
  expect(html.includes('<li><a href="/papers">')).toBe(papers);
  expect(html).toContain('class="ssr-site-header"');
  expect(html).toContain('class="ssr-site-footer"');
}

describe("initial data", () => {
  it("escapes markup characters and line separators and still parses", () => {
    const value = { title: "</script><b>&amp;", note: "a\u2028b\u2029c" };
    const json = serializeInitialData(value);
    expect(json).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(json)).toEqual(value);
  });
});

describe("GET /", () => {
  it("serves a complete home page in the raw HTML", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, s-maxage=300, stale-while-revalidate=86400");
    expect(response.headers["x-robots-tag"]).toBeUndefined();
    const html = response.text;

    expect(html).toContain(`<title>${PAGE_META.home.title}</title>`);
    expect(html).toContain(`<meta name="description" content="${PAGE_META.home.description}" />`);
    expect(html).toContain('<link rel="canonical" href="https://anvikshikijournal.in/" />');
    expect(count(html, /<h1\b/g)).toBe(1);
    expectSiteNav(html, { papers: false });
    expectNoInlineExecutableScript(html);

    // Latest work, newest first, with author and domain links.
    expect(html.indexOf("The Quantum and the Eternal")).toBeLessThan(html.indexOf("Beyond Angkor"));
    expect(html).toContain('href="/articles/beyond-angkor-86ef8134"');
    expect(html).toContain('href="/authors/xiyatosaanvi"');
    expect(html).toContain('<a href="/domains/history">History</a> (1 work)');
    // Empty hubs are not promoted from the home page.
    expect(html).not.toContain('href="/domains/aesthetics"');
    expect(html).toContain('href="/about/anvikshiki"');
    expect(html).not.toMatch(/peer[- ]review/i);

    const data = initialData(html);
    expect(data.route).toBe("home");
    expect(data.path).toBe("/");
    expect(data.data.articles).toHaveLength(2);
    expect(data.data.domains.find((d: any) => d.slug === "history").articleCount).toBe(1);
    // The client nav reads this to leave out Papers, as the server nav does.
    expect(data.site).toEqual({ papers: false });
  });

  it("answers 503, uncached, when the database cannot be read", async () => {
    content.fail = true;
    const response = await request(app).get("/");
    expect(response.status).toBe(503);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.text).not.toContain("Nothing has been published yet");
  });
});

describe("GET /archive", () => {
  beforeEach(() => {
    content.works = { articles: Array.from({ length: 120 }, (_, i) => article(i)), papers: [] };
  });

  it("lists 50 works per page with crawlable pagination", async () => {
    const first = await request(app).get("/archive");
    expect(first.status).toBe(200);
    expect(first.text).toContain('<link rel="canonical" href="https://anvikshikijournal.in/archive" />');
    expect(count(first.text, /<li class="ssr-work-item">/g)).toBe(50);
    expect(first.text).toContain('<a href="/archive?page=2" rel="next">');
    expect(count(first.text, /<h1\b/g)).toBe(1);
    expect(initialData(first.text).data).toMatchObject({ page: 1, totalPages: 3, total: 120 });

    const last = await request(app).get("/archive?page=3");
    expect(last.status).toBe(200);
    expect(last.text).toContain('<link rel="canonical" href="https://anvikshikijournal.in/archive?page=3" />');
    expect(last.text).toContain("Archive of Published Essays, page 3 — Ānvīkṣikī");
    expect(count(last.text, /<li class="ssr-work-item">/g)).toBe(20);
    expect(last.text).toContain('<a href="/archive?page=2" rel="prev">');
    expect(last.text).not.toContain('rel="next"');
  });

  it("keeps one URL per page", async () => {
    for (const query of ["?page=1", "?page=abc", "?page=0", "?page=02"]) {
      const response = await request(app).get(`/archive${query}`);
      expect(response.status, query).toBe(301);
      expect(response.headers.location).toBe("/archive");
    }
    const beyond = await request(app).get("/archive?page=9");
    expect(beyond.status).toBe(404);
    expect(beyond.headers["x-robots-tag"]).toBe("noindex, nofollow");
  });
});

describe("GET /domains", () => {
  it("links hubs with work, with counts, and names the empty ones without links", async () => {
    const response = await request(app).get("/domains");
    expect(response.status).toBe(200);
    const html = response.text;
    expect(html).toContain('<link rel="canonical" href="https://anvikshikijournal.in/domains" />');
    expect(html).toContain('<a href="/domains/history">History</a>');
    expect(html).toContain("1 essay");
    expect(html).not.toContain('href="/domains/aesthetics"');
    expect(html).toContain("Aesthetics");
    expect(count(html, /<h1\b/g)).toBe(1);
    expect(initialData(html).data.domains).toHaveLength(3);
  });
});

describe("GET /papers", () => {
  it("says plainly that there are no papers and stays out of the index", async () => {
    const response = await request(app).get("/papers");
    expect(response.status).toBe(200);
    expect(response.headers["x-robots-tag"]).toBe("noindex, follow");
    expect(response.text).toContain('<meta name="robots" content="noindex, follow" />');
    expect(response.text).toContain("No research papers have been published");
    expectSiteNav(response.text, { papers: false });
  });

  it("lists papers and becomes indexable once one is published", async () => {
    content.works.papers = [article(5, { kind: "paper", slug: "a-paper", title: "A Paper" })];
    const response = await request(app).get("/papers");
    expect(response.headers["x-robots-tag"]).toBeUndefined();
    expect(response.text).toContain('<meta name="robots" content="index, follow, max-image-preview:large" />');
    expect(response.text).toContain('href="/papers/a-paper"');
    expectSiteNav(response.text, { papers: true });
    expect(initialData(response.text).site).toEqual({ papers: true });

    // Every other page links to /papers too once a paper exists.
    for (const route of ["/", "/contact", "/submit", "/about"]) {
      const page = await request(app).get(route);
      expectSiteNav(page.text, { papers: true });
    }
  });
});

describe("fixed pages", () => {
  const pages: Array<[string, keyof typeof PAGE_META, boolean]> = [
    ["/contact", "contact", true],
    ["/privacy", "privacy", true],
    ["/terms", "terms", true],
    ["/submit", "submit", true],
    ["/community", "community", false],
  ];
  for (const [route, key, indexable] of pages) {
    it(`${route} has its own metadata, one H1 and the site nav`, async () => {
      const response = await request(app).get(route);
      expect(response.status).toBe(200);
      const html = response.text;
      expect(html).toContain(`<title>${PAGE_META[key].title}</title>`);
      expect(html).toContain(`<link rel="canonical" href="https://anvikshikijournal.in${route}" />`);
      expect(html).toContain(`<meta name="robots" content="${indexable ? "index, follow, max-image-preview:large" : "noindex, follow"}" />`);
      expect(response.headers["x-robots-tag"]).toBe(indexable ? undefined : "noindex, follow");
      expect(count(html, /<h1\b/g)).toBe(1);
      expectSiteNav(html, { papers: false });
      expectNoInlineExecutableScript(html);
      expect(initialData(html)).toMatchObject({ route: key, path: route });
      expect(html).not.toMatch(/peer[- ]review/i);
    });
  }

  it("/submit is a public guidelines page, not a login redirect", async () => {
    const response = await request(app).get("/submit");
    expect(response.text).toContain("What happens next");
    expect(response.text).toContain('href="/login"');
    expect(response.text).toContain("History, Philosophy, Aesthetics");
    expect(initialData(response.text).data.domains.map((d: any) => d.name)).toEqual(["History", "Philosophy", "Aesthetics"]);
  });

  it("/about and /browse carry the site nav and initial data too", async () => {
    const about = await request(app).get("/about");
    expectSiteNav(about.text, { papers: false });
    expect(initialData(about.text)).toMatchObject({ route: "about", path: "/about" });
    expect(about.headers["cache-control"]).toBe("public, s-maxage=300, stale-while-revalidate=86400");

    const browse = await request(app).get("/browse");
    expect(browse.status).toBe(200);
    expect(browse.text).toContain('href="/authors/xiyatosaanvi"');
    expect(initialData(browse.text).data.articles).toHaveLength(2);
  });
});

describe("article and hub templates", () => {
  it("demotes section H1s inside an article body", () => {
    expect(demoteBodyHeadings('<h1 id="x">Part one</h1><p>t</p><h1>Two</H1 >')).toBe('<h2 id="x">Part one</h2><p>t</p><h2>Two</h2>');
    expect(demoteBodyHeadings("<h10>no</h10>")).toBe("<h10>no</h10>");
  });

  it("links a domain hub's works to their canonical author pages", () => {
    const html = generateDomainHubSsrHtml(CATEGORIES[0], [article(1)], []);
    expect(html).toContain('<a href="/authors/xiyatosaanvi">Xiyato Saanvi</a>');
    expect(count(html, /<h1\b/g)).toBe(1);
    expect(html).not.toContain("Domain not found");
  });
});

describe("deployment routing", () => {
  const vercel = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../vercel.json"), "utf8"));
  const rewrites: Array<{ source: string; destination: string }> = vercel.rewrites;

  // Changed deliberately: there is no longer a whitelist of server-rendered
  // paths with a "/:path*" -> /spa.html fallback (which answered every unknown
  // URL with a 200 soft 404). Every request that is not a static file reaches
  // Express, which serves the shell with 200 only for known client routes
  // (lib/spa-routes.ts) and a 404 otherwise.
  it("sends every non-file request to the API function and none to the static shell", () => {
    expect(rewrites).toEqual([{ source: "/(.*)", destination: "/api/index" }]);
    expect(rewrites.some((r) => r.destination === "/spa.html")).toBe(false);
  });

  it("lets Vercel serve static files before any rewrite", () => {
    // `rewrites` run after the filesystem check; legacy `routes` would not.
    expect(vercel.routes).toBeUndefined();
    expect(vercel.cleanUrls).not.toBe(true);
    const redirects: Array<{ source: string }> = vercel.redirects || [];
    for (const file of ["/assets/index-abc.js", "/favicon.ico", "/manifest.json", "/theme-init.js", "/opengraph.jpg", "/og-default.jpg", "/robots.txt"]) {
      expect(redirects.some((r) => new RegExp(`^${r.source}$`).test(file)), file).toBe(false);
    }
    const publicDir = path.resolve(__dirname, "../../anvikshiki/public");
    for (const file of ["favicon.ico", "manifest.json", "theme-init.js", "opengraph.jpg", "og-default.jpg", "robots.txt"]) {
      expect(fs.existsSync(path.join(publicDir, file)), file).toBe(true);
    }
  });

  it("drops trailing slashes at the edge and keeps the raw shell out of the index", () => {
    expect(vercel.trailingSlash).toBe(false);
    const spaHeaders = (vercel.headers as Array<{ source: string; headers: Array<{ key: string; value: string }> }>)
      .find((h) => h.source === "/spa.html");
    expect(spaHeaders?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  });

  it("keeps a static index.html from shadowing the home page", () => {
    const viteConfig = fs.readFileSync(path.resolve(__dirname, "../../anvikshiki/vite.config.ts"), "utf8");
    expect(viteConfig).toContain('fileName: "spa.html"');
  });
});

describe("page metadata parity", () => {
  it("the SPA uses the same titles and descriptions as the server", async () => {
    const clientModule = path.resolve(__dirname, "../../anvikshiki/src/lib/pageMeta.ts");
    const client = await import(/* @vite-ignore */ clientModule);
    expect(client.PAGE_META).toEqual(PAGE_META);
  });
});
