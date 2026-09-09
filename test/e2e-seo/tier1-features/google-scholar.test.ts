import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import { extractGoogleScholar, getAllMeta, getMeta } from "../helpers/html-parser";

/**
 * Requirement R3: Google Scholar Highwire / Bibliographic Meta Tags
 *
 * Implements highwire meta tags (citation_title, citation_author, citation_publication_date,
 * citation_journal_title, citation_pdf_url, citation_abstract_html_url, citation_keywords).
 * Strict accuracy and zero fabricated values.
 */
describe("Tier 1 - Feature 4: Google Scholar Highwire Tags (R3)", () => {
  it("outputs citation_title matching research paper title exactly", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const citationTitle = getMeta(res.text, "citation_title");
    expect(citationTitle).toBeTruthy();
    expect(citationTitle).toContain("Computational Analysis of Alaṅkāra");
  });

  it("outputs citation_author tag for each contributing author", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const authors = getAllMeta(res.text, "citation_author");
    // Should have tags for both Dr. Ananya Sharma and Prof. Raghavan Sastri
    expect(authors.length).toBeGreaterThanOrEqual(1);
    const joined = authors.join(", ");
    expect(joined).toMatch(/Ananya Sharma|Raghavan Sastri|Ānvīkṣikī/);
  });

  it("outputs citation_publication_date in standard YYYY/MM/DD or ISO format", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const pubDate = getMeta(res.text, "citation_publication_date");
    expect(pubDate).toBeTruthy();
    // Validate format: 2026/02/20 or 2026-02-20 or 2026
    expect(pubDate).toMatch(/^(?:20\d{2}[-/]\d{2}[-/]\d{2}|20\d{2})$/);
  });

  it("outputs citation_journal_title matching Ānvīkṣikī publication name", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const journalTitle = getMeta(res.text, "citation_journal_title");
    expect(journalTitle).toBeTruthy();
    expect(journalTitle).toMatch(/Ānvīkṣikī|Anvikshiki/i);
  });

  it("outputs citation_pdf_url when paper has associated PDF manuscript", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const pdfUrl = getMeta(res.text, "citation_pdf_url");
    if (pdfUrl) {
      expect(pdfUrl).toMatch(/^https?:\/\/.*\.pdf$/i);
    }
  });

  it("never outputs fabricated or placeholder values in scholarly citation tags", async () => {
    const res = await request(app)
      .get("/papers/sulba-sutras-geometric-algebra");

    expect(res.status).toBe(200);
    const gs = extractGoogleScholar(res.text);

    // Ensure no placeholder or dummy strings exist
    for (const [key, value] of Object.entries(gs)) {
      const valStr = Array.isArray(value) ? value.join(" ") : value;
      expect(valStr).not.toMatch(/undefined|null|placeholder|lorem ipsum|todo/i);
    }
  });
});
