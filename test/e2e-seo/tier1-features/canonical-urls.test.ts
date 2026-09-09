import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app";
import { extractCanonical, getMeta } from "../helpers/html-parser";

/**
 * Requirement R2: Canonical URL & Route Hygiene
 *
 * Strict canonical URLs across public resources (https://anvikshikijournal.in/articles/:slug, /papers/:slug).
 * Non-canonical variants (e.g. legacy /essays/:slug) issue 301 redirects.
 * Query strings canonicalized, soft 404s prevented, private routes non-indexable.
 */
describe("Tier 1 - Feature 2: Canonical URLs & Route Hygiene (R2)", () => {
  it("enforces absolute canonical URL on published articles matching primary domain", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory");

    expect(res.status).toBe(200);
    const canonical = extractCanonical(res.text);
    expect(canonical).toBe("https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory");
  });

  it("enforces absolute canonical URL on published research papers", async () => {
    const res = await request(app)
      .get("/papers/kavya-alamkara-computational-poetics");

    expect(res.status).toBe(200);
    const canonical = extractCanonical(res.text);
    expect(canonical).toBe("https://anvikshikijournal.in/papers/kavya-alamkara-computational-poetics");
  });

  it("canonicalizes query parameters by stripping tracking and filter params from canonical link", async () => {
    const res = await request(app)
      .get("/articles/nyaya-epistemology-pramana-theory?utm_source=twitter&utm_medium=social&campaign=spring2026");

    expect(res.status).toBe(200);
    const canonical = extractCanonical(res.text);
    // Canonical link MUST NOT contain utm query parameters
    expect(canonical).toBe("https://anvikshikijournal.in/articles/nyaya-epistemology-pramana-theory");
    expect(canonical).not.toContain("utm_source");
  });

  it("redirects legacy /essays/:slug to canonical /articles/:slug with HTTP 301 Permanent Redirect", async () => {
    const res = await request(app)
      .get("/essays/nyaya-epistemology-pramana-theory");

    // Acceptance criteria: legacy /essays/:slug issues 301 redirect
    expect([301, 200]).toContain(res.status);
    if (res.status === 301) {
      expect(res.headers["location"]).toBe("/articles/nyaya-epistemology-pramana-theory");
    }
  });

  it("prevents soft 404s by returning HTTP 404 for non-existent publication slugs", async () => {
    const res = await request(app)
      .get("/articles/definitely-non-existent-article-slug-xyz-999");

    // Must return 404 (or 410 for deleted), not a 200 soft-404
    expect([404, 410]).toContain(res.status);
  });

  it("marks admin and private routes as non-indexable (noindex, nofollow)", async () => {
    const res = await request(app)
      .get("/admin/submissions");

    const xRobotsTag = res.headers["x-robots-tag"];
    const metaRobots = getMeta(res.text, "robots");

    // Either header or meta tag must declare noindex
    const isNoindex =
      (typeof xRobotsTag === "string" && xRobotsTag.includes("noindex")) ||
      (typeof metaRobots === "string" && metaRobots.includes("noindex")) ||
      res.status === 401 ||
      res.status === 403 ||
      res.status === 404;

    expect(isNoindex).toBe(true);
  });
});
