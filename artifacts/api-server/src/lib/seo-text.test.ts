import path from "path";
import { describe, expect, it } from "vitest";
import * as server from "./seo-text";
import { cleanTitle, demoteBodyHeadings, deriveDescription, sentenceDescription } from "./seo-text";

describe("cleanTitle", () => {
  it("drops a dangling colon, hyphen or dash left behind by a split subtitle", () => {
    expect(cleanTitle("Beyond Angkor:")).toBe("Beyond Angkor");
    expect(cleanTitle("Beyond Angkor -")).toBe("Beyond Angkor");
    expect(cleanTitle("Beyond Angkor —  ")).toBe("Beyond Angkor");
    expect(cleanTitle("Beyond Angkor – :")).toBe("Beyond Angkor");
  });

  it("keeps punctuation inside the title and titles made only of punctuation", () => {
    expect(cleanTitle("Nyāya: Logic and Debate")).toBe("Nyāya: Logic and Debate");
    expect(cleanTitle("Why Champa?")).toBe("Why Champa?");
    expect(cleanTitle("—")).toBe("—");
    expect(cleanTitle(null)).toBe("");
  });
});

describe("deriveDescription", () => {
  const body = "<h1>Introduction</h1><p>Champa was a polity on the coast of what is now central and southern Vietnam. Its temples at My Son were built over several centuries. Its kings used Sanskrit in their inscriptions for a long time.</p>";

  it("uses the editor's SEO description as written", () => {
    expect(deriveDescription({ seoDescription: "Set by the editor.", summaries: ["Excerpt."], body })).toBe("Set by the editor.");
  });

  it("builds a 120–160 character description from whole sentences, leaving headings out", () => {
    const description = deriveDescription({ seoDescription: "", summaries: [""], body });
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toBe("Champa was a polity on the coast of what is now central and southern Vietnam. Its temples at My Son were built over several centuries.");
  });

  it("continues a short excerpt with the body", () => {
    const description = deriveDescription({ summaries: ["A study of Champa"], body });
    expect(description.startsWith("A study of Champa. Champa was a polity")).toBe(true);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it("removes the page markers of PDF imports", () => {
    const description = deriveDescription({ summaries: [], body: "<p>===== Page 1 ===== The first claim is short.</p>" });
    expect(description).toBe("The first claim is short.");
  });

  it("cuts one long sentence at a word boundary", () => {
    const long = `${"word ".repeat(60).trim()}.`;
    const description = sentenceDescription(long);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith("word…")).toBe(true);
  });
});

describe("demoteBodyHeadings", () => {
  it("shifts every body heading down a level when the body uses H1", () => {
    expect(demoteBodyHeadings('<h1 class="x">A</h1><h2>B</h2><h6>C</h6>')).toBe('<h2 class="x">A</h2><h3>B</h3><h6>C</h6>');
  });

  it("leaves a body without H1 alone", () => {
    expect(demoteBodyHeadings("<h2>A</h2><p>Text</p>")).toBe("<h2>A</h2><p>Text</p>");
  });
});

describe("client copy", () => {
  it("the SPA's seoText gives the same results as the server", async () => {
    const clientModule = path.resolve(__dirname, "../../../anvikshiki/src/lib/seoText.ts");
    const client = await import(/* @vite-ignore */ clientModule);
    const inputs = [
      { seoDescription: "", summaries: ["Short."], body: "<h1>One</h1><p>Alpha beta gamma delta. Epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega and more words.</p>" },
      { seoDescription: "Own text.", summaries: [], body: "" },
    ];
    for (const input of inputs) expect(client.deriveDescription(input)).toBe(server.deriveDescription(input));
    for (const title of ["A:", "B —", "C: D"]) expect(client.cleanTitle(title)).toBe(server.cleanTitle(title));
    expect(client.demoteBodyHeadings("<h1>A</h1><h2>B</h2>")).toBe(server.demoteBodyHeadings("<h1>A</h1><h2>B</h2>"));
  });
});
