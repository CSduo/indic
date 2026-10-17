import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorUser } from "./lib/author-identity";
import type { AuthorHubArticle } from "./lib/publication-lookup";
import type { ListingRow, PublishedWorks } from "./lib/public-content";

// The hub and editorial pages Search Console reported as "crawled, not
// indexed", rendered end to end with the listing built by the real code from
// realistic records. Only the database reads are replaced.
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
  rows: [] as any[],
  works: { articles: [], papers: [] } as PublishedWorks,
  categories: [] as Array<{ slug: string; name: string; description: string | null }>,
  users: [] as AuthorUser[],
  bio: null as string | null,
  listingDown: false,
}));

vi.mock("./lib/public-content", async (importOriginal) => {
  const original = await importOriginal<typeof import("./lib/public-content")>();
  return {
    ...original,
    listPublishedWorks: async () => {
      if (state.listingDown) throw new Error("database unavailable");
      return state.works;
    },
    listVisibleCategories: async () => state.categories,
    findCategory: async (slug: string) => state.categories.find((c) => c.slug === slug) ?? null,
    loadAuthorUsers: async () => state.users,
    hasPublishedPapers: async () => state.works.papers.length > 0,
  };
});
vi.mock("./lib/publication-lookup", async (importOriginal) => {
  const original = await importOriginal<typeof import("./lib/publication-lookup")>();
  return {
    ...original,
    findPublicationBySlug: async (_kind: string, slug: string) => state.rows.find((r) => r.slug === slug) ?? null,
    findPublishedSlugRedirect: async () => null,
    findSubmissionOwner: async (id: string | null | undefined) => (id ? "u1" : null),
    listAuthorHubWorks: async () => ({
      articles: state.rows.map((row): AuthorHubArticle => ({ ...row, kind: "article", authorId: row.sourceSubmissionId ? "u1" : null })),
      papers: [],
    }),
    findAuthorProfile: async () => ({ bio: state.bio, institution: null, avatarUrl: null }),
  };
});

import app from "./app";
import { makeAuthorResolver } from "./lib/author-identity";
import { toWorkSummary } from "./lib/public-content";
import { workSeo } from "./lib/effective-seo";
import { DESCRIPTION_MAX, DESCRIPTION_MIN } from "./lib/seo-text";
import { buildSitemapEntries, MIN_WORKS_FOR_INDEXED_HUB, SITE_URL } from "./lib/sitemap-entries";
import { buildRssXml, rssItems } from "./routes/rss";
import { DEFAULT_SOCIAL_IMAGE } from "./lib/ssr-html";

const originalDatabaseUrl = process.env.DATABASE_URL;
beforeAll(() => {
  process.env.DATABASE_URL ||= "postgres://seo-test:unused@127.0.0.1:9/unused";
});
afterAll(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

const CATEGORIES = [
  { slug: "philosophy", name: "Philosophy", description: "Philosophical schools and systems of thought" },
  { slug: "history", name: "History", description: "Historical chronicles, narratives, and research" },
  { slug: "political-theory", name: "Political Theory", description: "Statecraft, governance, and polity studies" },
  { slug: "aesthetics", name: "Aesthetics", description: "Art, literature, poetry, and theories of beauty" },
];

const paragraphs = (...texts: string[]) => texts.map((t) => `<p>${t}</p>`).join("\n");

/** A published article row as the database returns it. */
function row(slug: string, title: string, categorySlug: string, day: string, body: string, extra: Record<string, unknown> = {}) {
  return {
    id: `id-${slug}`,
    slug,
    title,
    subtitle: null,
    excerpt: null,
    body,
    categorySlug,
    tags: [],
    authorName: "Xiyato Saanvi",
    readingMinutes: 9,
    heroImageUrl: null,
    heroImageAlt: null,
    keyTakeaways: [],
    references: [],
    seoTitle: null,
    seoDescription: null,
    audioUrl: null,
    status: "PUBLISHED",
    featured: false,
    publishedAt: new Date(`${day}T10:00:00.000Z`),
    deletedAt: null,
    sourceSubmissionId: `sub-${slug}`,
    createdAt: new Date(`${day}T09:00:00.000Z`),
    updatedAt: new Date(`${day}T11:00:00.000Z`),
    ...extra,
  };
}

// Slugs with an entry in lib/editorial-overrides.ts take their description
// and topics from there, as in production.
const ROWS = [
  row("quantum-eternal", "The Quantum and the Eternal", "philosophy", "2026-08-21", paragraphs(
    "Erwin Schrödinger kept notebooks full of passages from the Upanishads.",
    "He read Śaṅkara and found in Advaita Vedānta a doctrine of identity that matched his view of consciousness.",
  )),
  row("arithmetic-betrayal", "The Arithmetic of Betrayal", "political-theory", "2026-08-18", paragraphs(
    "The Mandal Commission reshaped Indian politics.",
    "VP Singh implemented OBC reservations and the Indra Sawhney judgment upheld them.",
  )),
  row("triple-fragmentation", "The Triple Fragmentation", "history", "2026-08-15", paragraphs(
    "The project of building a modern Indian nation-state faces a crisis of coherence.",
  )),
  row("the-human-tapestry-of-the-slave-trade", "The Human Tapestry of the Slave Trade", "history", "2026-08-10", paragraphs(
    "The transatlantic slave trade dismantled African societies, yet Yoruba beliefs survived as Santería.",
  )),
  row("indo-fijians-overtook-indigenous-fijians-numerically-1940s", "How Indo-Fijians Overtook Indigenous Fijians in the 1940s", "history", "2026-08-05", paragraphs(
    "Girmit labourers arrived in Fiji from 1879. By 1946 Indo-Fijians outnumbered indigenous Fijians.",
  )),
  row("beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia-86ef8134", "Beyond Angkor: Why Is Vietnam Excluded from the History of Hindu Influence?", "history", "2026-08-03", paragraphs(
    "Champa, the Hindu kingdom of central Vietnam, is often left out of accounts of Southeast Asia.",
  )),
  row("why-this-website-exists-0fc91e71", "Why This Website Exists", "philosophy", "2026-07-30", paragraphs(
    "Ānvīkṣikī was started as a serious research platform for Indic thought.",
  )),
];

function listingFrom(rows: any[]): PublishedWorks {
  const resolve = makeAuthorResolver(state.users);
  const summaries = rows.map((r) => toWorkSummary({ ...r, kind: "article", authorId: "u1" } as ListingRow, resolve));
  return { articles: summaries.sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!)), papers: [] };
}

beforeEach(() => {
  state.users = [{ id: "u1", handle: "xiyatosaanvi", name: "Xiyato Saanvi" }];
  state.categories = CATEGORIES;
  state.rows = ROWS;
  state.works = listingFrom(ROWS);
  state.bio = null;
  state.listingDown = false;
});

// ── helpers ──────────────────────────────────────────────────────────────────

function count(html: string, pattern: RegExp): number {
  return (html.match(pattern) || []).length;
}

function decode(value: string): string {
  return value.replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function headOf(html: string) {
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? "";
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "";
  const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap((m) => JSON.parse(m[1])["@graph"] as any[]);
  return { title, description, canonical, robots, graph };
}

function initialData(html: string): any {
  const match = html.match(/<script id="__INITIAL_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  return JSON.parse(match![1]);
}

/** The page body (inside #root, without the site header and footer). */
function mainOf(html: string): string {
  return html.match(/<main\b[\s\S]*<\/main>|<article class="ssr-content[\s\S]*<\/article>/)?.[0] ?? "";
}

/** Visible words in the page body. */
function wordCount(html: string): number {
  return mainOf(html).replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

/** The title without the site suffix and before any ":" — what a description must not open with. */
function titleLead(title: string): string {
  return title.split(" — ")[0].split(":")[0].trim().toLowerCase();
}

function expectIndexablePage(html: string, path: string) {
  const head = headOf(html);
  expect(count(html, /<h1\b/g), `${path}: one H1`).toBe(1);
  expect(head.title, `${path}: title`).toMatch(/— Ānvīkṣikī$|Ānvīkṣikī/);
  expect(head.description.length, `${path}: "${head.description}"`).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
  expect(head.description.length, `${path}: "${head.description}"`).toBeLessThanOrEqual(DESCRIPTION_MAX);
  expect(head.description.toLowerCase().startsWith(titleLead(head.title)), `${path}: description opens with the title`).toBe(false);
  expect(head.canonical).toBe(`${SITE_URL}${path}`);
  expect(head.robots).toBe("index, follow, max-image-preview:large");
  expect(head.graph.length, `${path}: JSON-LD`).toBeGreaterThan(0);
  for (const node of head.graph) expect(node["@type"], `${path}: node type`).toBeTruthy();
  return head;
}

/** Every ItemList URL appears as a link on the page, in the same order. */
function expectListMatchesPage(html: string, list: any) {
  const body = mainOf(html);
  let at = -1;
  for (const item of list.itemListElement) {
    const href = String(item.url).replace(SITE_URL, "");
    const index = body.indexOf(`href="${href}"`, at + 1);
    expect(index, `${href} is listed on the page`).toBeGreaterThan(at);
    at = index;
  }
}

// ── the eight pages ─────────────────────────────────────────────────────────

describe("hub and editorial pages", () => {
  it("/archive lists every work by year with its author, date, domain and description", async () => {
    const res = await request(app).get("/archive");
    expect(res.status).toBe(200);
    const head = expectIndexablePage(res.text, "/archive");
    const html = mainOf(res.text);
    expect(html).toContain('<h2 id="year-2026">2026</h2>');
    for (const work of state.works.articles) {
      expect(html).toContain(`href="/articles/${encodeURIComponent(work.slug)}"`);
      expect(html).toContain(work.description.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"));
    }
    expect(html).toContain('By <a href="/authors/xiyatosaanvi">Xiyato Saanvi</a>');
    expect(html).toContain('<a href="/domains/history">History</a> (4)');
    const page = head.graph.find((n) => n["@type"] === "CollectionPage");
    expectListMatchesPage(res.text, page.mainEntity);
    expect(wordCount(res.text)).toBeGreaterThan(250);
  });

  it("/domains shows each domain with what it covers and every work in it", async () => {
    const res = await request(app).get("/domains");
    const head = expectIndexablePage(res.text, "/domains");
    const html = mainOf(res.text);
    expect(html).toContain('<h2 id="domain-history-heading"><a href="/domains/history">History</a></h2>');
    expect(html).toContain("Historical chronicles, narratives, and research");
    expect(html).toContain('href="/articles/triple-fragmentation"');
    // Domains without work are named, not linked.
    expect(html).toContain("Aesthetics");
    expect(html).not.toContain('href="/domains/aesthetics"');
    const list = head.graph.find((n) => n["@type"] === "CollectionPage").mainEntity;
    expect(list.itemListElement.map((i: any) => i.name)).toEqual(["History", "Philosophy", "Political Theory"]);
    expectListMatchesPage(res.text, list);
    expect(initialData(res.text).data.works).toHaveLength(ROWS.length);
  });

  it("/domains/history introduces the domain and lists every work with its description, topics and date", async () => {
    const res = await request(app).get("/domains/history");
    expect(res.headers["x-robots-tag"]).toBeUndefined();
    const head = expectIndexablePage(res.text, "/domains/history");
    expect(head.description).toMatch(/^4 essays in History published on Ānvīkṣikī/);
    const html = mainOf(res.text);
    expect(html).toContain("Historical chronicles, narratives, and research");
    expect(count(html, /<li class="ssr-work-item">/g)).toBe(4);
    expect(html).toContain('<span class="ssr-topics-label">Topics</span> Champa · Vietnam');
    expect(html).toContain('<time datetime="2026-08-15T10:00:00.000Z">');
    // Onward links: the other domains with work, all domains, the archive.
    expect(html).toContain('<a href="/domains/philosophy">Philosophy</a> (2 works)');
    expect(html).toContain('<a href="/archive">The full archive</a>');

    const types = head.graph.map((n) => n["@type"]);
    expect(types).toEqual(["CollectionPage", "BreadcrumbList"]);
    const collection = head.graph[0];
    expect(collection.description).toBe(head.description);
    expect(collection.mainEntity.numberOfItems).toBe(4);
    expectListMatchesPage(res.text, collection.mainEntity);
    expect(head.graph[1].itemListElement.map((i: any) => i.name)).toEqual(["Home", "Domains", "History"]);
    expect(wordCount(res.text)).toBeGreaterThan(200);
  });

  it("keeps a hub with fewer than MIN_WORKS_FOR_INDEXED_HUB works reachable but noindex", async () => {
    const res = await request(app).get("/domains/philosophy");
    expect(res.status).toBe(200);
    expect(res.headers["x-robots-tag"]).toBe("noindex, follow");
    expect(headOf(res.text).robots).toBe("noindex, follow");
    expect(count(mainOf(res.text), /<li class="ssr-work-item">/g)).toBeLessThan(MIN_WORKS_FOR_INDEXED_HUB);
  });

  it("/authors/xiyatosaanvi lists the author's works with descriptions, topics and domain names", async () => {
    const res = await request(app).get("/authors/xiyatosaanvi");
    expect(res.status).toBe(200);
    const head = expectIndexablePage(res.text, "/authors/xiyatosaanvi");
    expect(head.description).toMatch(/^7 essays by Xiyato Saanvi published on Ānvīkṣikī, in Philosophy, Political Theory and History\./);
    const html = mainOf(res.text);
    expect(count(html, /<li class="ssr-work-item">/g)).toBe(7);
    expect(html).toContain('<a href="/domains/political-theory">Political Theory</a>');
    expect(html).not.toContain(">political-theory<");
    expect(html).toContain('<span class="ssr-topics-label">Topics</span> Mandal Commission');

    const person = head.graph.find((n) => n["@type"] === "Person");
    expect(person).toMatchObject({ name: "Xiyato Saanvi", url: `${SITE_URL}/authors/xiyatosaanvi` });
    // No bio on the page, so none in the markup.
    expect(person.description).toBeUndefined();
    expect(head.graph.find((n) => n["@type"] === "ProfilePage").mainEntity).toEqual({ "@id": person["@id"] });
    expectListMatchesPage(res.text, head.graph.find((n) => n["@type"] === "ItemList"));

    const data = initialData(res.text).data;
    expect(data.description).toBe(head.description);
    expect(data.works).toHaveLength(7);
    expect(data.works[0]).not.toHaveProperty("body");
  });

  it("uses the author's own bio, unchanged, in the page and the Person markup", async () => {
    state.bio = "Writes on the history and politics of the Indic world.";
    const res = await request(app).get("/authors/xiyatosaanvi");
    const head = headOf(res.text);
    expect(mainOf(res.text)).toContain("Writes on the history and politics of the Indic world.");
    expect(head.graph.find((n) => n["@type"] === "Person").description).toBe(state.bio);
  });

  it("/about describes the journal from published facts and links its work", async () => {
    const res = await request(app).get("/about");
    expect(res.headers["cache-control"]).toBe("public, s-maxage=300, stale-while-revalidate=86400");
    expectIndexablePage(res.text, "/about");
    const html = mainOf(res.text);
    for (const heading of ["What the journal publishes", "The name", "Published essays", "How submissions work", "Contact"]) {
      expect(html).toContain(`>${heading}</h2>`);
    }
    expect(html).toContain("7 essays published so far, the most recent on");
    expect(html).toContain('<a href="/domains/history">History</a> (4 works)');
    expect(html).toContain('The essay <a href="/articles/why-this-website-exists-0fc91e71">Why This Website Exists</a> explains why the journal was started.');
    for (const href of ["/about/anvikshiki", "/archive", "/domains", "/submit", "/contact", "/terms"]) expect(html).toContain(`href="${href}"`);
    expect(html).not.toMatch(/peer[- ]review|founded in|editorial board/i);
    expect(wordCount(res.text)).toBeGreaterThan(400);
    expect(initialData(res.text).data.latest).toHaveLength(7);
  });

  it("/about renders its text, uncached, when the listing cannot be read", async () => {
    state.listingDown = true;
    const res = await request(app).get("/about");
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(mainOf(res.text)).toContain("How submissions work");
    expect(mainOf(res.text)).not.toContain("essays published so far, the most recent");
  });

  it("/about/anvikshiki keeps its treatise and adds further reading from the journal", async () => {
    const res = await request(app).get("/about/anvikshiki");
    const head = expectIndexablePage(res.text, "/about/anvikshiki");
    const html = mainOf(res.text);
    expect(html).toContain("The Classical Doctrine in Kautilya's Arthaśāstra");
    expect(html).toContain('id="further-reading-heading">Further reading on Ānvīkṣikī</h2>');
    expect(html.indexOf("/articles/why-this-website-exists-0fc91e71")).toBeLessThan(html.indexOf("/articles/quantum-eternal"));
    // Only work that is about its subject: not the history essays.
    expect(html).not.toContain('href="/articles/triple-fragmentation"');
    const page = head.graph.find((n) => n["@type"] === "AboutPage");
    expect(page.relatedLink).toEqual([
      `${SITE_URL}/articles/why-this-website-exists-0fc91e71`,
      `${SITE_URL}/articles/quantum-eternal`,
    ]);
  });

  it("/contact and /submit stay indexable, with their own descriptions", async () => {
    for (const path of ["/contact", "/submit"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expectIndexablePage(res.text, path);
    }
  });

  it("gives every page its own title and description", async () => {
    const paths = [
      "/", "/archive", "/domains", "/domains/history", "/authors/xiyatosaanvi", "/about", "/about/anvikshiki",
      "/contact", "/submit", "/browse", "/articles/quantum-eternal", "/articles/triple-fragmentation",
    ];
    const heads = await Promise.all(paths.map(async (path) => headOf((await request(app).get(path)).text)));
    expect(new Set(heads.map((h) => h.title)).size).toBe(paths.length);
    expect(new Set(heads.map((h) => h.description)).size).toBe(paths.length);
  });
});

// ── internal links from each work ───────────────────────────────────────────

describe("links from a work's page", () => {
  it("links related works, the domain hub once it is indexed, and the archive", async () => {
    const res = await request(app).get("/articles/triple-fragmentation");
    expect(res.status).toBe(200);
    const block = res.text.match(/<nav class="ssr-section ssr-related"[\s\S]*?<\/nav>/)?.[0] ?? "";
    expect(block).toContain(">Related essays</h2>");
    expect(count(block, /<li class="ssr-work-item">/g)).toBe(3);
    expect(block).not.toContain('href="/articles/triple-fragmentation"');
    // Same domain first.
    expect(block).toContain('href="/articles/the-human-tapestry-of-the-slave-trade"');
    expect(block).toContain('<a href="/domains/history">More in History</a>');
    expect(block).toContain('<a href="/archive">Every essay in the archive</a>');
    expect(initialData(res.text).data.continueReading.related).toHaveLength(3);
  });

  it("does not promote a domain hub that is still noindex", async () => {
    const res = await request(app).get("/articles/quantum-eternal");
    const block = res.text.match(/<nav class="ssr-section ssr-related"[\s\S]*?<\/nav>/)?.[0] ?? "";
    expect(block).not.toContain("More in Philosophy");
    expect(block).toContain('href="/articles/why-this-website-exists-0fc91e71"');
    expect(block).toContain('<a href="/archive">');
  });
});

// ── a new essay, published with no editorial input ──────────────────────────

describe("a new essay with no tags, SEO fields or editorial override", () => {
  const NEW = row("the-grand-trunk-road", "The Grand Trunk Road: Two Thousand Years of a Highway", "history", "2026-10-12", paragraphs(
    "The Grand Trunk Road runs from Chittagong in Bengal across the plains to Kabul in Afghanistan. For more than two thousand years armies, merchants and pilgrims have travelled along it.",
    "Chandragupta Maurya's empire maintained a royal highway along much of the same route, and Ashoka planted trees and dug wells beside it so that travellers would find shade and water.",
    "In the sixteenth century Sher Shah Suri rebuilt the road from Sonargaon to Peshawar. He built caravanserais at regular intervals, and many of them still stand near Delhi and Lahore.",
    "The Mughal emperors added kos minars to mark the distance, and the British later paved the road and renamed it. Rudyard Kipling described it in Kim as a river of life.",
    "Today the Grand Trunk Road carries traffic through India, Pakistan, Bangladesh and Afghanistan, and it remains a record of the empires that built and rebuilt it.",
  ), { readingMinutes: 6, updatedAt: new Date("2026-10-13T08:30:00.000Z") });

  beforeEach(() => {
    state.rows = [NEW, ...ROWS];
    state.works = listingFrom(state.rows);
  });

  it("gets a clean title, a 120–160 character description and 4–8 topic terms from its own text", () => {
    const seo = workSeo(NEW, "article");
    expect(seo.title).toBe("The Grand Trunk Road: Two Thousand Years of a Highway");
    expect(seo.description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(seo.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(seo.description.startsWith("The Grand Trunk Road: Two")).toBe(false);
    expect(seo.topics.length).toBeGreaterThanOrEqual(4);
    expect(seo.topics.length).toBeLessThanOrEqual(8);
    const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const text = fold(`${NEW.title} ${NEW.body}`);
    for (const topic of seo.topics) expect(text, topic).toContain(fold(topic));
  });

  it("is served with Article and BreadcrumbList data, the default card and related links", async () => {
    const res = await request(app).get("/articles/the-grand-trunk-road");
    expect(res.status).toBe(200);
    const head = headOf(res.text);
    const seo = workSeo(NEW, "article");
    expect(head.title).toBe(`${seo.title} — Ānvīkṣikī`);
    expect(head.description).toBe(seo.description);
    expect(head.canonical).toBe(`${SITE_URL}/articles/the-grand-trunk-road`);
    expect(count(res.text, /<h1\b/g)).toBe(1);
    expect(head.graph.map((n) => n["@type"])).toEqual(["Article", "BreadcrumbList"]);
    const article = head.graph[0];
    expect(article).toMatchObject({ headline: seo.title, description: seo.description, image: [DEFAULT_SOCIAL_IMAGE.url] });
    expect(article.about.map((t: any) => t.name)).toEqual(seo.topics);
    expect(res.text).toContain(`<meta property="og:image" content="${DEFAULT_SOCIAL_IMAGE.url}" />`);
    expect(res.text).toContain('<a href="/domains/history">More in History</a>');
  });

  it("appears on the archive, its domain hub and its author's page", async () => {
    const description = workSeo(NEW, "article").description;
    for (const path of ["/archive", "/domains/history", "/authors/xiyatosaanvi"]) {
      const html = mainOf((await request(app).get(path)).text);
      expect(html, path).toContain('href="/articles/the-grand-trunk-road"');
      expect(html, path).toContain(description.replace(/'/g, "&#39;"));
    }
  });

  it("is listed in the sitemap with its real lastmod, in the RSS feed and in llms.txt", async () => {
    const entries = buildSitemapEntries({
      articles: state.rows.map((r) => ({ ...r, authorId: "u1" })),
      papers: [],
      categories: CATEGORIES,
      users: state.users,
    });
    expect(entries.find((e) => e.loc === `${SITE_URL}/articles/the-grand-trunk-road`)?.lastmod).toBe("2026-10-13T08:30:00.000Z");
    for (const entry of entries) expect(entry.lastmod, entry.loc).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const items = rssItems(state.rows, []);
    const item = items.find((i) => i.link.endsWith("/articles/the-grand-trunk-road"))!;
    expect(item.description).toBe(workSeo(NEW, "article").description);
    expect(item.topics).toEqual(workSeo(NEW, "article").topics);
    expect(buildRssXml(items)).toContain("<link>https://anvikshikijournal.in/articles/the-grand-trunk-road</link>");

    const llms = await request(app).get("/llms.txt");
    expect(llms.text).toContain(`- [The Grand Trunk Road: Two Thousand Years of a Highway](${SITE_URL}/articles/the-grand-trunk-road): ${workSeo(NEW, "article").description}`);
  });
});

// ── the sitemap ─────────────────────────────────────────────────────────────

describe("the sitemap for these records", () => {
  it("lists only canonical, indexable pages, with true lastmod values", () => {
    const entries = buildSitemapEntries({
      articles: ROWS.map((r) => ({ ...r, authorId: "u1" })),
      papers: [],
      categories: CATEGORIES,
      users: state.users,
    });
    const urls = entries.map((e) => e.loc.replace(SITE_URL, ""));
    expect(urls).toEqual(expect.arrayContaining(["/", "/about", "/about/anvikshiki", "/browse", "/archive", "/domains", "/domains/history", "/authors/xiyatosaanvi"]));
    for (const excluded of ["/contact", "/submit", "/papers", "/domains/philosophy", "/domains/political-theory", "/domains/aesthetics"]) {
      expect(urls).not.toContain(excluded);
    }
    expect(entries.find((e) => e.loc === `${SITE_URL}/articles/quantum-eternal`)?.lastmod).toBe("2026-08-21T11:00:00.000Z");
  });
});
