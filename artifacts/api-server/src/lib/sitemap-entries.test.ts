import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSitemapEntries, MIN_WORKS_FOR_INDEXED_HUB,
  renderSitemapXml,
  SITE_URL,
  STATIC_PAGES_LASTMOD,
  type SitemapSource,
} from "./sitemap-entries";

function source(overrides: Partial<SitemapSource> = {}): SitemapSource {
  return {
    articles: [
      {
        slug: "quantum-eternal",
        updatedAt: "2026-08-21T11:21:00.000Z",
        publishedAt: "2026-08-21T11:14:00.000Z",
        authorName: "Xiyato Saanvi",
        categorySlug: "philosophy",
        authorId: "user-xs",
      },
      {
        slug: "triple-fragmentation",
        updatedAt: "2026-08-15T22:18:00.000Z",
        publishedAt: "2026-08-15T22:17:00.000Z",
        authorName: "Xiyato Saanvi",
        categorySlug: "history",
        authorId: null,
      },
    ],
    papers: [],
    categories: [{ slug: "philosophy" }, { slug: "history" }, { slug: "sanskrit-studies" }],
    users: [
      { id: "user-xs", handle: "xiyatosaanvi", name: "Xiyato Saanvi" },
      { id: "user-test", handle: "codex-verification", name: "Codex Verification" },
      { id: "user-nohandle", handle: null, name: "Duo 40" },
    ],
    ...overrides,
  };
}

const locs = (s: SitemapSource) => buildSitemapEntries(s).map(e => e.loc);

describe("buildSitemapEntries", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Changed deliberately: /contact and /submit stay indexable and linked from
  // every page, but they are utility pages that will never rank on their own;
  // listing them only added to Search Console's "crawled, not indexed" count.
  it("lists the indexable content pages and leaves out utility pages, boilerplate and the noindexed community", () => {
    const urls = locs(source());

    for (const path of ["/", "/about", "/about/anvikshiki", "/browse", "/archive", "/domains"]) {
      expect(urls).toContain(`${SITE_URL}${path}`);
    }
    for (const path of ["/contact", "/submit", "/privacy", "/terms", "/community"]) {
      expect(urls).not.toContain(`${SITE_URL}${path}`);
    }
  });

  it("leaves /papers out while there are no papers, and includes it once there are", () => {
    expect(locs(source())).not.toContain(`${SITE_URL}/papers`);

    const withPaper = source({
      papers: [{ slug: "a-paper", updatedAt: "2026-09-01T00:00:00.000Z", authorName: "Xiyato Saanvi", categorySlug: "history" }],
    });
    expect(locs(withPaper)).toContain(`${SITE_URL}/papers`);
    expect(locs(withPaper)).toContain(`${SITE_URL}/papers/a-paper`);
  });

  it("uses each article's own updatedAt as lastmod", () => {
    const entry = buildSitemapEntries(source()).find(e => e.loc === `${SITE_URL}/articles/quantum-eternal`);
    expect(entry?.lastmod).toBe("2026-08-21T11:21:00.000Z");
  });

  it("includes a domain hub only once it holds MIN_WORKS_FOR_INDEXED_HUB works, dated by its newest work", () => {
    const history = ["a", "b", "c"].map((id, i) => ({
      slug: `history-${id}`,
      updatedAt: `2027-08-1${i + 1}T00:00:00.000Z`,
      authorName: "Xiyato Saanvi",
      categorySlug: "history",
    }));
    const philosophy = [{ slug: "one-essay", updatedAt: "2026-08-20T00:00:00.000Z", authorName: "Xiyato Saanvi", categorySlug: "philosophy" }];
    const entries = buildSitemapEntries(source({ articles: [...history, ...philosophy], papers: [] }));
    const urls = entries.map(e => e.loc);

    expect(MIN_WORKS_FOR_INDEXED_HUB).toBe(3);
    expect(urls).toContain(`${SITE_URL}/domains/history`);
    expect(urls).not.toContain(`${SITE_URL}/domains/philosophy`);
    expect(urls).not.toContain(`${SITE_URL}/domains/sanskrit-studies`);
    expect(entries.find(e => e.loc === `${SITE_URL}/domains/history`)?.lastmod).toBe("2027-08-13T00:00:00.000Z");
  });

  // A hub's page changed when its layout did (STATIC_PAGES_LASTMOD), even if
  // none of its works has changed since.
  it("never dates a domain hub or author page before the listing layout last changed", () => {
    const history = ["a", "b", "c"].map((id) => ({
      slug: `history-${id}`,
      updatedAt: "2026-08-01T00:00:00.000Z",
      authorName: "Xiyato Saanvi",
      categorySlug: "history",
      authorId: "user-xs",
    }));
    const entries = buildSitemapEntries(source({ articles: history }));
    expect(entries.find(e => e.loc === `${SITE_URL}/domains/history`)?.lastmod).toBe(STATIC_PAGES_LASTMOD);
    expect(entries.find(e => e.loc === `${SITE_URL}/authors/xiyatosaanvi`)?.lastmod).toBe(STATIC_PAGES_LASTMOD);
  });

  it("lists authors with published work once, at their handle URL, and omits members with no work", () => {
    const entries = buildSitemapEntries(source());
    const authorUrls = entries.map(e => e.loc).filter(u => u.includes("/authors/"));

    expect(authorUrls).toEqual([`${SITE_URL}/authors/xiyatosaanvi`]);
    expect(entries.find(e => e.loc === `${SITE_URL}/authors/xiyatosaanvi`)?.lastmod).toBe(STATIC_PAGES_LASTMOD);

    const newer = buildSitemapEntries(source({
      articles: [{ slug: "later", updatedAt: "2027-03-01T00:00:00.000Z", authorName: "Xiyato Saanvi", categorySlug: "history", authorId: "user-xs" }],
    }));
    expect(newer.find(e => e.loc === `${SITE_URL}/authors/xiyatosaanvi`)?.lastmod).toBe("2027-03-01T00:00:00.000Z");
  });

  it("falls back to a name slug for authors who have no account", () => {
    const urls = locs(source({
      articles: [{ slug: "guest-essay", updatedAt: "2026-09-02T00:00:00.000Z", authorName: "Dr. Guest Writer", categorySlug: "history" }],
    }));
    expect(urls).toContain(`${SITE_URL}/authors/guest-writer`);
  });

  it("never uses the request time as lastmod", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T00:00:00.000Z"));
    const first = buildSitemapEntries(source());
    vi.setSystemTime(new Date("2027-06-01T00:00:00.000Z"));
    const second = buildSitemapEntries(source());

    expect(second).toEqual(first);
    expect(first.find(e => e.loc === `${SITE_URL}/about`)?.lastmod).toBe(STATIC_PAGES_LASTMOD);
    for (const entry of first) {
      expect(entry.lastmod?.startsWith("2027")).toBe(false);
    }
  });

  it("dates every page that lists work by its newest work when that is newer than the static copy", () => {
    const urls = buildSitemapEntries(source({
      articles: [{ slug: "new-essay", updatedAt: "2027-02-02T00:00:00.000Z", authorName: "Xiyato Saanvi", categorySlug: "history", authorId: "user-xs" }],
    }));
    for (const path of ["/", "/about", "/browse", "/archive", "/domains"]) {
      expect(urls.find(e => e.loc === `${SITE_URL}${path}`)?.lastmod, path).toBe("2027-02-02T00:00:00.000Z");
    }
  });

  // /about lists the newest works and the mission essay, /about/anvikshiki
  // the mission essay and work in philosophy and Sanskrit studies: an edit
  // to any other work leaves them as they were.
  it("dates /about and /about/anvikshiki by the works they show", () => {
    const essay = (n: number, categorySlug: string, extra: Record<string, string> = {}) => ({
      slug: `essay-${n}`,
      publishedAt: new Date(Date.UTC(2026, 6, n)).toISOString(),
      updatedAt: new Date(Date.UTC(2026, 6, n, 1)).toISOString(),
      authorName: "Xiyato Saanvi",
      categorySlug,
      ...extra,
    });
    const articles = Array.from({ length: 12 }, (_, i) => essay(i + 1, "history"));
    const lastmod = (s: SitemapSource, path: string) => buildSitemapEntries(s).find(e => e.loc === `${SITE_URL}${path}`)?.lastmod;

    // The oldest history essay, edited: on neither page.
    const oldEdited = source({ articles: [{ ...articles[0], updatedAt: "2027-03-01T00:00:00.000Z" }, ...articles.slice(1)] });
    expect(lastmod(oldEdited, "/about")).toBe(STATIC_PAGES_LASTMOD);
    expect(lastmod(oldEdited, "/about/anvikshiki")).toBe(STATIC_PAGES_LASTMOD);
    expect(lastmod(oldEdited, "/archive")).toBe("2027-03-01T00:00:00.000Z");

    // The newest essay, edited: listed on /about only.
    const newEdited = source({ articles: [...articles.slice(0, 11), { ...articles[11], updatedAt: "2027-03-02T00:00:00.000Z" }] });
    expect(lastmod(newEdited, "/about")).toBe("2027-03-02T00:00:00.000Z");
    expect(lastmod(newEdited, "/about/anvikshiki")).toBe(STATIC_PAGES_LASTMOD);

    // An old philosophy essay and the mission essay, edited: further reading on
    // /about/anvikshiki; the mission essay is also named on /about.
    const philosophy = source({ articles: [...articles.slice(1), essay(1, "philosophy", { updatedAt: "2027-03-03T00:00:00.000Z" })] });
    expect(lastmod(philosophy, "/about/anvikshiki")).toBe("2027-03-03T00:00:00.000Z");
    expect(lastmod(philosophy, "/about")).toBe(STATIC_PAGES_LASTMOD);
    const mission = source({ articles: [...articles.slice(1), essay(1, "history", { slug: "why-this-website-exists-0fc91e71", updatedAt: "2027-03-04T00:00:00.000Z" })] });
    expect(lastmod(mission, "/about")).toBe("2027-03-04T00:00:00.000Z");
    expect(lastmod(mission, "/about/anvikshiki")).toBe("2027-03-04T00:00:00.000Z");
  });

  it("produces unique, percent-encoded locations", () => {
    const urls = locs(source({
      articles: [{ slug: "samkhya-सङ्ख्य", updatedAt: "2026-09-02T00:00:00.000Z", authorName: "Xiyato Saanvi", categorySlug: "history", authorId: "user-xs" }],
    }));
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.some(u => u.includes("सङ्ख्य"))).toBe(false);
    expect(urls).toContain(`${SITE_URL}/articles/${encodeURIComponent("samkhya-सङ्ख्य")}`);
  });
});

describe("renderSitemapXml", () => {
  it("renders a urlset without changefreq or priority", () => {
    const xml = renderSitemapXml([{ loc: `${SITE_URL}/about`, lastmod: STATIC_PAGES_LASTMOD }]);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${SITE_URL}/about</loc>`);
    expect(xml).toContain(`<lastmod>${STATIC_PAGES_LASTMOD}</lastmod>`);
    expect(xml).not.toContain("<changefreq>");
    expect(xml).not.toContain("<priority>");
  });
});
