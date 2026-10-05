import { describe, expect, it } from "vitest";
import { makeAuthorResolver, resolveAuthorRequest, singleAuthorPath, workAuthorSegments, type AuthorUser, type AuthorWork } from "./author-identity";

const users: AuthorUser[] = [
  { id: "u1", handle: "xiyatosaanvi", name: "Xiyato Saanvi" },
  { id: "u2", handle: null, name: "No Handle" },
  { id: "u3", handle: "quietreader", name: "Quiet Reader" },
];
const works: AuthorWork[] = [
  { kind: "article", authorName: "Xiyato Saanvi", authorId: "u1" },
  { kind: "article", authorName: "Dr. Arya Ambadi", authorId: null },
  { kind: "paper", authorName: "Xiyato Saanvi, Guest Writer", authorId: null },
];

describe("resolveAuthorRequest", () => {
  it("renders an exact handle and redirects its other spellings", () => {
    const hit = resolveAuthorRequest("xiyatosaanvi", users, works);
    expect(hit.kind).toBe("render");
    if (hit.kind === "render") expect(hit.works).toHaveLength(2);
    for (const variant of ["XiyatoSaanvi", "@xiyatosaanvi", "u1", "xiyato-saanvi", "Xiyato Saanvi"]) {
      expect(resolveAuthorRequest(variant, users, works), variant).toEqual({ kind: "redirect", segment: "xiyatosaanvi" });
    }
  });

  it("serves byline-only authors at their name slug", () => {
    const hit = resolveAuthorRequest("arya-ambadi", users, works);
    expect(hit.kind).toBe("render");
    if (hit.kind === "render") expect(hit.displayName).toBe("Dr. Arya Ambadi");
    expect(resolveAuthorRequest("guest-writer", users, works).kind).toBe("render");
  });

  it("does no substring or partial matching", () => {
    for (const partial of ["xiyato", "saanvi", "arya", "ambadi", "writer", "", "@"]) {
      expect(resolveAuthorRequest(partial, users, works), partial).toEqual({ kind: "not-found" });
    }
  });

  it("keeps accounts without published work reachable with no works", () => {
    const handle = resolveAuthorRequest("quietreader", users, works);
    expect(handle.kind === "render" && handle.works.length).toBe(0);
    const id = resolveAuthorRequest("u2", users, works);
    expect(id.kind === "render" && id.segment).toBe("u2");
  });
});

describe("author links", () => {
  const resolve = makeAuthorResolver(users);
  it("use the handle for an account's work and the name slug otherwise", () => {
    expect(singleAuthorPath(works[0], resolve)).toBe("/authors/xiyatosaanvi");
    expect(singleAuthorPath(works[1], resolve)).toBe("/authors/arya-ambadi");
    expect(singleAuthorPath(works[2], resolve)).toBeNull();
    expect(workAuthorSegments(works[2], resolve)).toEqual(["xiyatosaanvi", "guest-writer"]);
  });
});
