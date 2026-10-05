import fs from "fs";
import path from "path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import app, {
  DEFAULT_SOCIAL_IMAGE,
  jsonLdGraphScript,
  publisherNode,
  socialImage,
  socialImageMetaTags,
} from "./app";
import { articleTopicTags, extractArticleKeywords } from "./lib/keywords";
import { ROBOTS_TXT } from "./lib/robots";

// The page routes sit behind the database bootstrap middleware. These pages
// never query the database, so the bootstrap is stubbed out.
vi.mock("@workspace/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@workspace/db")>()),
  ensureDatabaseSchema: async () => undefined,
  coreTablesExist: async () => true,
}));
vi.mock("./lib/publication-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/publication-sync")>()),
  ensureDefaultCategories: async () => undefined,
}));

const originalDatabaseUrl = process.env.DATABASE_URL;
beforeAll(() => {
  process.env.DATABASE_URL ||= "postgres://seo-test:unused@127.0.0.1:9/unused";
});
afterAll(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

const PUBLIC_DIR = path.resolve(__dirname, "../../anvikshiki/public");

function jsonLdBlocks(html: string): any[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

describe("robots.txt", () => {
  it("serves the same rules as the static public/robots.txt Vercel serves", async () => {
    const staticCopy = fs.readFileSync(path.join(PUBLIC_DIR, "robots.txt"), "utf8").replace(/\r\n/g, "\n");
    expect(staticCopy).toBe(ROBOTS_TXT);

    const response = await request(app).get("/robots.txt");
    expect(response.status).toBe(200);
    expect(response.text).toBe(ROBOTS_TXT);
  });

  it("closes private screens, keeps /api/ closed except public reads, and lists one sitemap", () => {
    const lines = ROBOTS_TXT.split("\n");
    for (const p of ["/admin", "/account", "/messages", "/notifications", "/saved", "/login", "/submit/", "/api/"]) {
      expect(lines).toContain(`Disallow: ${p}`);
    }
    for (const p of ["/api/articles", "/api/papers", "/api/categories", "/api/rss", "/api/users/*/profile", "/api/users/profile/"]) {
      expect(lines).toContain(`Allow: ${p}`);
    }
    expect(lines.filter((l) => l.startsWith("Sitemap:"))).toEqual(["Sitemap: https://anvikshikijournal.in/sitemap.xml"]);
    expect(ROBOTS_TXT).not.toContain("/api/og");
  });
});

describe("structured data helpers", () => {
  it("points the publisher logo at a real square PNG", () => {
    const node = publisherNode() as any;
    expect(node["@id"]).toBe("https://anvikshikijournal.in/#organization");
    expect(node.logo.url).toBe("https://anvikshikijournal.in/brand-emblem.png");
    expect(fs.existsSync(path.join(PUBLIC_DIR, "brand-emblem.png"))).toBe(true);
    expect(node.logo.width).toBe(node.logo.height);
  });

  it("falls back to a real default card, never the unimplemented /api/og route", () => {
    expect(socialImage(undefined)).toEqual(DEFAULT_SOCIAL_IMAGE);
    expect(socialImage("")).toEqual(DEFAULT_SOCIAL_IMAGE);
    expect(fs.existsSync(path.join(PUBLIC_DIR, "og-default.jpg"))).toBe(true);
    expect(socialImage("/images/x.jpg").url).toBe("https://anvikshikijournal.in/images/x.jpg");
    // Non-Cloudinary images carry no claimed dimensions.
    expect(socialImage("https://example.com/x.jpg")).toEqual({ url: "https://example.com/x.jpg" });
    expect(socialImageMetaTags({ url: "https://example.com/x.jpg" }, "x")).not.toContain("og:image:width");
    const cloud = socialImage("https://res.cloudinary.com/demo/image/upload/v1/a.jpg");
    expect(cloud).toEqual({ url: "https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_630,q_auto/v1/a.jpg", width: 1200, height: 630 });
  });

  it("emits one escaped @graph script", () => {
    const html = jsonLdGraphScript([{ "@type": "Thing", name: "</script><b>" }]);
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).not.toContain("</script><b>");
    expect(jsonLdBlocks(html)[0]["@graph"][0].name).toBe("</script><b>");
  });
});

describe("topic terms", () => {
  it("uses only a work's own tags, de-duplicated", () => {
    expect(articleTopicTags(["Champa", " champa ", "Mỹ Sơn", 3, ""])).toEqual(["Champa", "Mỹ Sơn"]);
    expect(articleTopicTags(undefined)).toEqual([]);
    expect(articleTopicTags("Nyāya, Pramāṇa")).toEqual(["Nyāya", "Pramāṇa"]);
  });

  it("proposes only terms that occur in the text", () => {
    const text = "The Champa kingdom built temples at Mỹ Sơn. Champa inscriptions are in Sanskrit.";
    const terms = extractArticleKeywords(text, "Temples of Champa");
    expect(terms.length).toBeGreaterThan(0);
    for (const term of terms) {
      expect(`${text} Temples of Champa`.toLowerCase()).toContain(term.toLowerCase());
    }
    expect(terms.map((t) => t.toLowerCase())).not.toContain("hindu article");
  });
});

describe("static SSR pages", () => {
  for (const route of ["/about", "/about/anvikshiki"]) {
    it(`${route} carries no keyword lists, one JSON-LD graph and a real image`, async () => {
      const response = await request(app).get(route);
      expect(response.status).toBe(200);
      const html = response.text;
      expect(html).not.toMatch(/<meta\s+name="(news_)?keywords"/);
      expect(html).not.toMatch(/peer[- ]review/i);
      expect(html).not.toContain("/api/og/");
      expect(html).not.toContain("opengraph.jpg");
      expect(html).toContain('content="https://anvikshikijournal.in/og-default.jpg"');
      expect(html).toContain(`<link rel="canonical" href="https://anvikshikijournal.in${route}"`);

      const blocks = jsonLdBlocks(html);
      expect(blocks).toHaveLength(1);
      const graph = blocks[0]["@graph"];
      expect(graph[0]["@type"]).toBe("AboutPage");
      expect(graph[0].inLanguage).toBe("en");
      expect(graph[0].publisher.logo.url).toBe("https://anvikshikijournal.in/brand-emblem.png");
    });
  }

  it("keeps /submit indexable but noindexes the drafting screens", async () => {
    const landing = await request(app).get("/submit");
    expect(landing.headers["x-robots-tag"]).toBeUndefined();
    // Same robots value as every other indexable SSR page (was "index, follow").
    expect(landing.text).toContain('<meta name="robots" content="index, follow, max-image-preview:large" />');

    const write = await request(app).get("/submit/write");
    expect(write.headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(write.text).toContain('<meta name="robots" content="noindex, nofollow" />');
  });
});
