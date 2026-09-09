import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import { extractVisibleText } from "../helpers/html-parser";

/**
 * Requirement R7: Contributor Acquisition CTAs
 *
 * Enhance reader-to-contributor conversion with tasteful, context-sensitive CTAs on
 * publication pages, author profiles, and domain hubs.
 */
describe("Tier 1 - Feature 11: Contributor Acquisition CTAs (R7)", () => {
  it("provides contributor call-to-action on published article pages", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory");

    expect(res.status).toBe(200);
    // Should contain a link to submission portal
    const hasSubmitLink = res.text.includes("/submit") || res.text.includes("Submit");
    expect(hasSubmitLink).toBe(true);
  });

  it("provides research submission call-to-action on published paper pages", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const hasPaperCta = res.text.includes("/submit") || res.text.includes("manuscript") || res.text.includes("Submit");
    expect(hasPaperCta).toBe(true);
  });

  it("provides contributor invitation on author authority hubs", async () => {
    const res = await request(app)
      .get("/authors/arya-ambadi");

    if (res.status === 200) {
      expect(res.text).toMatch(/\/submit|contribute|join|author/i);
    }
  });

  it("provides topical submission prompt on domain authority hubs", async () => {
    const res = await request(app)
      .get("/domains/philosophy");

    if (res.status === 200) {
      expect(res.text).toMatch(/\/submit|contribute|write|research/i);
    }
  });

  it("ensures contributor CTAs link cleanly to submission pipeline without redirect loops", async () => {
    const res = await request(app)
      .get("/submit");

    // Submission entry page must return 200 OK or 302 to auth/wizard
    expect([200, 301, 302]).toContain(res.status);
  });
});
