import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CLIENT_ONLY_ROUTES, SERVER_RENDERED_ROUTES, looksLikeFile, matchClientOnlyRoute, normalizedPagePath } from "./spa-routes";

describe("SPA route list", () => {
  it("covers exactly the routes in App.tsx", () => {
    const appSource = fs.readFileSync(path.resolve(__dirname, "../../../anvikshiki/src/App.tsx"), "utf8");
    const appRoutes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
    const known = [...SERVER_RENDERED_ROUTES, ...CLIENT_ONLY_ROUTES.map((r) => r.path)];
    expect(new Set(known)).toEqual(new Set(appRoutes));
    expect(known.length).toBe(new Set(known).size);
  });

  it("marks every signed-in and administrative screen private", () => {
    for (const route of CLIENT_ONLY_ROUTES) {
      if (/^\/(admin|account|login|messages|saved|submit\/)/.test(route.path)) expect(route.private, route.path).toBe(true);
    }
  });

  it("matches client-only routes exactly", () => {
    expect(matchClientOnlyRoute("/account/edit/my-draft")?.private).toBe(true);
    expect(matchClientOnlyRoute("/search")?.private).toBe(false);
    expect(matchClientOnlyRoute("/account/edit")).toBeNull();
    expect(matchClientOnlyRoute("/admin/anything-else")).toBeNull();
    expect(matchClientOnlyRoute("/Login")).toBeNull();
  });
});

describe("normalizedPagePath", () => {
  it("drops trailing slashes and lower-cases a known section", () => {
    expect(normalizedPagePath("/about/")).toBe("/about");
    expect(normalizedPagePath("/articles/x//")).toBe("/articles/x");
    expect(normalizedPagePath("/Articles/Some-Slug")).toBe("/articles/Some-Slug");
    expect(normalizedPagePath("/about")).toBeNull();
    expect(normalizedPagePath("/")).toBeNull();
  });

  it("never redirects off-site or touches the API", () => {
    expect(normalizedPagePath("//evil.example/")).toBeNull();
    expect(normalizedPagePath("/\\evil.example/")).toBeNull();
    expect(normalizedPagePath("/api/articles/")).toBeNull();
    expect(normalizedPagePath("/Unknown")).toBeNull();
  });
});

describe("looksLikeFile", () => {
  it("tells file requests from page URLs", () => {
    expect(looksLikeFile("/assets/index-abc.js")).toBe(true);
    expect(looksLikeFile("/favicon.ico")).toBe(true);
    expect(looksLikeFile("/articles/some-slug")).toBe(false);
  });
});
