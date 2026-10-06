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

  // /submit (now a public guidelines page) and /domains (now a server-rendered
  // index) return 200 with a self-canonical, so they are listed.
  it("lists the indexable static pages and leaves out boilerplate and the noindexed community", () => {
    const urls = locs(source());

    for (const path of ["/", "/about", "/about/anvikshiki", "/browse", "/archive", "/domains", "/contact", "/submit"]) {
      expect(urls).toContain(`${SITE_URL}${path}`);
    }
    for (const path of ["/privacy", "/terms", "/community"]) {
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
      updatedAt: `2026-08-1${i + 1}T00:00:00.000Z`,
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
    expect(entries.find(e => e.loc === `${SITE_URL}/domains/history`)?.lastmod).toBe("2026-08-13T00:00:00.000Z");
  });

  it("lists authors with published work once, at their handle URL, and omits members with no work", () => {
    const entries = buildSitemapEntries(source());
    const authorUrls = entries.map(e => e.loc).filter(u => u.includes("/authors/"));

    expect(authorUrls).toEqual([`${SITE_URL}/authors/xiyatosaanvi`]);
    expect(entries.find(e => e.loc === `${SITE_URL}/authors/xiyatosaanvi`)?.lastmod).toBe("2026-08-21T11:21:00.000Z");
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

  it("dates listing pages by their newest work when that is newer than the static copy", () => {
    const urls = buildSitemapEntries(source({
      articles: [{ slug: "new-essay", updatedAt: "2027-02-02T00:00:00.000Z", authorName: "Xiyato Saanvi", categorySlug: "history", authorId: "user-xs" }],
    }));
    expect(urls.find(e => e.loc === `${SITE_URL}/`)?.lastmod).toBe("2027-02-02T00:00:00.000Z");
    expect(urls.find(e => e.loc === `${SITE_URL}/about`)?.lastmod).toBe(STATIC_PAGES_LASTMOD);
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
