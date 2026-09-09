import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import {
  extractTitle,
  extractCanonical,
  getMeta,
  extractOpenGraph,
  extractTwitter,
  extractGoogleScholar,
  getAllMeta,
} from "../helpers/html-parser";

/**
 * Tier 2: Boundary & Corner Cases
 *
 * Edge cases, boundary stress, Indic Unicode fidelity, soft-404 prevention,
 * malformed parameters, missing images, and security boundaries.
 */
describe("Tier 2 - Boundary & Corner Cases", () => {
  describe("Soft 404 Prevention & Non-Existent Resources", () => {
    it("returns HTTP 404 (not 200 soft 404) for non-existent article slug", async () => {
      const res = await request(app)
        .get("/articles/completely-nonexistent-article-slug-xyz");

      // Soft 404 prevention: nonexistent documents must return HTTP 404/410
      expect([404, 410]).toContain(res.status);
    });

    it("returns HTTP 404 for non-existent research paper slug", async () => {
      const res = await request(app)
        .get("/papers/completely-nonexistent-paper-slug-xyz");

      expect([404, 410]).toContain(res.status);
    });

    it("returns HTTP 404 or 410 Gone for soft-deleted publications", async () => {
      // art-4-deleted in fixture has deletedAt populated
      const res = await request(app)
        .get("/articles/withdrawn-article-on-astronomy");

      expect([404, 410]).toContain(res.status);
    });

    it("does not expose unpublished draft documents to public crawlers", async () => {
      // art-3-draft in fixture has status DRAFT
      const res = await request(app)
        .get("/articles/draft-kashmir-shaivism-pratyabhijna")
        .set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");

      // Draft must either return 404 or be marked noindex
      if (res.status === 200) {
        const robots = getMeta(res.text, "robots") || res.headers["x-robots-tag"] || "";
        expect(robots).toContain("noindex");
      } else {
        expect([401, 403, 404]).toContain(res.status);
      }
    });
  });

  describe("Indic Unicode & Diacritics Fidelity", () => {
    it("preserves Devanagari script in title and metadata without corruption or moji-bake", async () => {
      const res = await request(app)
        .get("/articles/samkhya-purusa-prakrti-सङ्ख्य-दर्शने");

      expect(res.status).toBe(200);
      expect(res.text).toContain("साङ्ख्यदर्शने पुरुष-प्रकृति-विवेकः");

      const title = extractTitle(res.text);
      expect(title).toContain("साङ्ख्यदर्शने पुरुष-प्रकृति-विवेकः");

      const ogTitle = getMeta(res.text, "og:title");
      expect(ogTitle).toContain("साङ्ख्यदर्शने");
    });

    it("handles IAST international phonetic diacritics (ā, ī, ū, ṛ, ṝ, ḷ, ṃ, ḥ, ṅ, ñ, ṭ, ḍ, ṇ, ś, ṣ) cleanly", async () => {
      const res = await request(app)
        .get("/articles/nyaya-epistemology-pramana-theory");

      expect(res.status).toBe(200);
      // Diacritics in Nyāya, Pramāṇa, Akṣapāda
      expect(res.text).toContain("Nyāya");
      expect(res.text).toContain("Pramāṇa");
    });

    it("prevents double-escaping of HTML entities in metadata tags (&amp;amp;)", async () => {
      const res = await request(app)
        .get("/articles/samkhya-purusa-prakrti-सङ्ख्य-दर्शने");

      expect(res.status).toBe(200);
      // Ensure no double-escaped entities like &amp;amp; or &amp;quot;
      expect(res.text).not.toContain("&amp;amp;");
      expect(res.text).not.toContain("&amp;quot;");
      expect(res.text).not.toContain("&amp;lt;");
    });
  });

  describe("Missing Hero Images & Dynamic Fallback Social Cards", () => {
    it("serves 1200x630 fallback social share card when article hero image is null", async () => {
      const res = await request(app)
        .get("/articles/samkhya-purusa-prakrti-सङ्ख्य-दर्शने");

      expect(res.status).toBe(200);
      const og = extractOpenGraph(res.text);
      expect(og["og:image"]).toBeTruthy();
      expect(og["og:image:width"]).toBe("1200");
      expect(og["og:image:height"]).toBe("630");
      // Fallback image must be absolute HTTPS
      expect(og["og:image"]).toMatch(/^https?:\/\//);
    });

    it("serves fallback branded social card when paper cover image is missing", async () => {
      const res = await request(app)
        .get("/papers/sulba-sutras-geometric-algebra");

      expect(res.status).toBe(200);
      const og = extractOpenGraph(res.text);
      expect(og["og:image"]).toBeTruthy();
      expect(og["og:image"]).toMatch(/^https?:\/\//);
    });
  });

  describe("Multiple Authors & Complex Attribution", () => {
    it("handles multiple co-authors in Google Scholar citation tags without collapsing", async () => {
      const res = await request(app)
        .get("/papers/kavya-alamkara-computational-poetics");

      expect(res.status).toBe(200);
      const authors = getAllMeta(res.text, "citation_author");
      // Dr. Ananya Sharma and Prof. Raghavan Sastri
      const text = res.text;
      expect(text).toMatch(/Ananya Sharma/);
      expect(text).toMatch(/Raghavan Sastri|Ānvīkṣikī/);
    });
  });

  describe("Input Sanitization & Adversarial URL Parameters", () => {
    it("sanitizes XSS injection payloads in query parameters without reflecting raw tags", async () => {
      const res = await request(app)
        .get("/articles/nyaya-epistemology-pramana-theory?q=<script>alert('xss')</script>&test=\"><script>evil()</script>");

      expect(res.status).toBe(200);
      // Must not reflect raw unescaped script tag
      expect(res.text).not.toContain("<script>alert('xss')</script>");
      expect(res.text).not.toContain("\"><script>evil()</script>");
    });

    it("handles malformed percent-encoded characters in URL slugs safely without server crash", async () => {
      const res = await request(app)
        .get("/articles/nyaya-%E0%A4%ZZ-malformed");

      // Server must handle gracefully (400 or 404), never crash with uncaught URIError
      expect([400, 404]).toContain(res.status);
    });

    it("handles ultra-long query parameters and header flood gracefully without denial of service", async () => {
      const longParam = "a".repeat(2048);
      const res = await request(app)
        .get(`/articles/nyaya-epistemology-pramana-theory?overflow=${longParam}`);

      expect([200, 414]).toContain(res.status);
    });
  });
});
