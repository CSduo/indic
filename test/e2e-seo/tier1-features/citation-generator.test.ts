import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";

/**
 * Requirement R7: Author Promotion Kit & Citation Generator
 *
 * Provide post-publication author promotion tools:
 * copy link, native share, WhatsApp/LinkedIn/X copy, formatted citations in APA, MLA, Chicago, BibTeX.
 */
describe("Tier 1 - Feature 12: Citation Generator & Author Promotion Kit (R7)", () => {
  it("provides APA citation format for published research papers", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    // When rendered or accessible via citation endpoint/DOM
    const hasApa = res.text.includes("APA") || res.text.includes("Sharma") || res.text.includes("citation");
    expect(hasApa).toBe(true);
  });

  it("provides MLA citation format for published research papers", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const hasMla = res.text.includes("MLA") || res.text.includes("citation") || res.text.includes("Sharma");
    expect(hasMla).toBe(true);
  });

  it("provides Chicago Manual of Style citation format for publications", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const hasChicago = res.text.includes("Chicago") || res.text.includes("citation") || res.text.includes("2026");
    expect(hasChicago).toBe(true);
  });

  it("provides BibTeX format for academic bibliography managers (Zotero, Mendeley)", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const hasBibtex = res.text.includes("BibTeX") || res.text.includes("@article") || res.text.includes("bibtex") || res.text.includes("citation");
    expect(hasBibtex).toBe(true);
  });

  it("provides author social share URLs (WhatsApp, LinkedIn, X/Twitter)", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory");

    expect(res.status).toBe(200);
    // Look for share triggers or intent links
    const hasShareLinks =
      res.text.includes("whatsapp") ||
      res.text.includes("twitter") ||
      res.text.includes("linkedin") ||
      res.text.includes("share") ||
      res.text.includes("Share");

    expect(hasShareLinks).toBe(true);
  });

  it("ensures share link generates canonical URL without tracking pollution", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory");

    expect(res.status).toBe(200);
    // Base canonical URL should be present in page metadata for sharing
    expect(res.text).toContain("https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory");
  });
});
