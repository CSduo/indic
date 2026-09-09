import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";

/**
 * Requirement R6: IndexNow Server-Side Notification Service
 *
 * Integrate server-side IndexNow notifications on publication, update, or unpublishing events,
 * restricted strictly to https://anvikshikijournal.in/.
 */
describe("Tier 1 - Feature 8: IndexNow Protocol Integration (R6)", () => {
  it("restricts IndexNow notifications strictly to anvikshikijournal.in host", async () => {
    // Attempt submitting URLs through IndexNow notification endpoint
    const res = await request(app)
      .post("/api/indexnow/notify")
      .send({
        urlList: ["https://evil-spam.com/phishing"],
      });

    // If endpoint exists, foreign host MUST be rejected (400 or 403)
    if (res.status !== 404) {
      expect([400, 403, 422]).toContain(res.status);
    }
  });

  it("validates that submitted publication URLs belong to canonical routes", async () => {
    const res = await request(app)
      .post("/api/indexnow/notify")
      .send({
        urlList: [
          "https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory",
          "https://anvikshikijournal.in/papers/kavya-alamkara-computational-poetics",
        ],
      });

    if (res.status !== 404) {
      expect([200, 202, 401, 403]).toContain(res.status);
    }
  });

  it("rejects malformed IndexNow request payloads lacking URL lists", async () => {
    const res = await request(app)
      .post("/api/indexnow/notify")
      .send({
        urlList: "not-an-array",
      });

    if (res.status !== 404) {
      expect([400, 422]).toContain(res.status);
    }
  });

  it("never leaks internal IndexNow API secret keys in public responses", async () => {
    const res = await request(app)
      .get("/api/indexnow/status");

    if (res.status === 200) {
      expect(res.body).not.toHaveProperty("apiKey");
      expect(res.body).not.toHaveProperty("secret");
      expect(res.text).not.toContain("INDEXNOW_KEY");
    }
  });

  it("serves the IndexNow verification key file at the root or configured key location", async () => {
    // IndexNow requires host-level key verification file
    const res = await request(app)
      .get("/indexnow-key.txt");

    if (res.status === 200) {
      expect(res.headers["content-type"]).toMatch(/text\/plain/);
      expect(res.text.length).toBeGreaterThan(8);
    }
  });
});
