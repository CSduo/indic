import path from "path";
import { describe, expect, it } from "vitest";
import { normalizeStoredReferences, parseReferencesInput, referencesToCitations } from "./lib/references";
import { renderReferences } from "./lib/ssr-html";

/*
  References & Sources. The SPA keeps its own copy of the lenient normaliser
  (artifacts/anvikshiki/src/lib/references.ts) so a page renders the same list
  before and after the app takes over; both copies run on the same inputs here.
*/
const CLIENT_MODULE = path.resolve(__dirname, "../../anvikshiki/src/lib/references.ts");

const STORED: unknown[] = [
  "A plain string reference",
  { title: "Has a link", url: "https://example.org/a", authors: "A. Author", year: "2020", publisher: "Press" },
  { name: "Old shape", href: "https://example.org/b", journal: "Journal", citation: "p. 4" },
  { title: "Unsafe link", url: "javascript:alert(1)" },
  { title: "<b>Markup</b> in title", doi: "https://doi.org/10.1002/bewi.202400027" },
  { url: "https://www.example.com/only-a-link" },
  { title: "", url: "" },
  { title: "Bad DOI", doi: "not-a-doi" },
  42,
  null,
  ["nested"],
];

describe("references", () => {
  it("client and server normalise stored references identically", async () => {
    const client = await import(CLIENT_MODULE);
    expect(client.normalizeStoredReferences(STORED)).toEqual(normalizeStoredReferences(STORED));
  });

  it("drops unsafe links and markup instead of rendering them", () => {
    const refs = normalizeStoredReferences(STORED);
    expect(refs.find(r => r.title === "Unsafe link")?.url).toBeUndefined();
    expect(refs.find(r => r.title === "Markup in title")?.doi).toBe("10.1002/bewi.202400027");
    expect(refs.find(r => r.title === "example.com")?.url).toBe("https://www.example.com/only-a-link");
    const html = renderReferences(STORED, "Editor's note & credit");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<b>");
    expect(html).toContain("Editor&#39;s note &amp; credit");
  });

  it("validates author input with messages an author can act on", () => {
    expect(parseReferencesInput(undefined)).toEqual({ ok: true, value: undefined });
    expect(parseReferencesInput([{ title: "", url: "", authors: "" }])).toEqual({ ok: true, value: [] });
    expect(parseReferencesInput(JSON.stringify([{ title: "A book" }]))).toEqual({ ok: true, value: [{ title: "A book" }] });
    expect(parseReferencesInput([{ authors: "Someone" }])).toEqual({ ok: false, error: "Reference 1: a title is required." });
    const badLink = parseReferencesInput([{ title: "T", url: "example.org" }]);
    expect(badLink.ok).toBe(false);
    const badDoi = parseReferencesInput([{ title: "T", doi: "1234" }]);
    expect(badDoi.ok).toBe(false);
  });

  it("emits schema.org citations with the DOI as identifier", () => {
    const [citation] = referencesToCitations([{ title: "Paper", authors: "A. One; B. Two", year: "2025", doi: "10.1/x" }]);
    expect(citation).toMatchObject({ "@type": "CreativeWork", name: "Paper", url: "https://doi.org/10.1/x", datePublished: "2025" });
    expect((citation.author as unknown[]).length).toBe(2);
  });
});
