import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./app";

describe("API security boundary", () => {
  it("keeps the liveness probe available without a database", async () => {
    const response = await request(app).get("/api/healthz");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
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
