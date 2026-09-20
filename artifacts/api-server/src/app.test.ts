import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./app";

describe("API security boundary", () => {
  it("keeps the liveness probe available without a database", async () => {
    const response = await request(app).get("/api/healthz");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
  });

  it("does not apply the JSON API CSP to static upload responses", async () => {
    const response = await request(app).get("/api/uploads/missing-cover.jpg");

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toBeUndefined();
  });

  it("rejects cross-site writes before parsing their body", async () => {
    const response = await request(app)
      .post("/api/contact")
      .set("Origin", "https://evil.example")
      .set("Content-Type", "application/json")
      .send('{"broken"');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Origin not allowed" });
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });



  it("returns a generic JSON error for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/contact")
      .set("Content-Type", "application/json")
      .send('{"broken"');

    expect(response.status).toBe(400);
    expect(response.type).toMatch(/json/);
    expect(response.body).toEqual({ error: "Invalid JSON body" });
    expect(response.text).not.toContain("node_modules");
    expect(response.text).not.toContain("SyntaxError");
  });
});

describe("Author Hub SSR Generator", () => {
  it("generates correct ProfilePage and Person Schema.org markup for author profile", async () => {
    const { generateAuthorHubSsrHtml } = await import("./app");
    const authorData = {
      name: "Arya Ambadi",
      handle: "arya-ambadi",
      bio: "Scholar of Nyāya philosophy and classical epistemology.",
      institution: "Benares Research Institute",
      avatarUrl: "https://example.com/avatar.jpg",
      articleCount: 1,
      paperCount: 1,
    };
    const articles = [{
      id: "art-1",
      slug: "pramana-in-classical-nyaya",
      title: "Pramāṇa in Classical Nyāya",
      excerpt: "An exploration of epistemic instruments.",
      publishedAt: new Date("2026-01-01"),
      categorySlug: "philosophy",
    }];
    const papers = [{
      id: "pap-1",
      slug: "vada-tradition-in-indic-dialectic",
      title: "The Vāda Tradition in Indic Dialectic",
      abstract: "Detailed analysis of disputational protocols.",
      year: 2026,
      publishedAt: new Date("2026-02-01"),
      doi: "10.1000/182",
    }];

    const html = generateAuthorHubSsrHtml(authorData, articles, papers);

    expect(html).toContain("Arya Ambadi");
    expect(html).toContain("@arya-ambadi");
    expect(html).toContain("Benares Research Institute");
    expect(html).not.toContain("Varanasi, India");
    expect(html).toContain("Scholar of Nyāya philosophy");
    expect(html).toContain("itemtype=\"https://schema.org/ProfilePage\"");
    expect(html).toContain("itemtype=\"https://schema.org/Person\"");
    expect(html).toContain("/articles/pramana-in-classical-nyaya");
    expect(html).toContain("/papers/vada-tradition-in-indic-dialectic");
    expect(html).toContain("DOI: 10.1000/182");
  });

  it("handles authors with zero publications gracefully without breaking", async () => {
    const { generateAuthorHubSsrHtml } = await import("./app");
    const authorData = {
      name: "New Contributor",
      handle: "new-contributor",
      bio: "Contributing scholar.",
      articleCount: 0,
      paperCount: 0,
    };

    const html = generateAuthorHubSsrHtml(authorData, [], []);

    expect(html).toContain("New Contributor");
    expect(html).toContain("@new-contributor");
    expect(html).toContain("No published articles or papers currently catalogued");
    expect(html).toContain("itemtype=\"https://schema.org/ProfilePage\"");
  });
});
