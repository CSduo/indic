import { describe, expect, it } from "vitest";
import { authorDescription, composeDescription, domainHubDescription, groupByYear, relatedWorks } from "./hub-content";
import { renderContinueReading } from "./listing-html";
import { DESCRIPTION_MAX, DESCRIPTION_MIN } from "./seo-text";
import type { WorkSummary } from "./public-content";

function work(n: number, overrides: Partial<WorkSummary> = {}): WorkSummary {
  return {
    kind: "article",
    id: `w${n}`,
    slug: `essay-${n}`,
    title: `Essay ${n}`,
    excerpt: null,
    authorName: "Xiyato Saanvi",
    authorPath: "/authors/xiyatosaanvi",
    categorySlug: "history",
    publishedAt: new Date(Date.UTC(2026, 7, n)).toISOString(),
    updatedAt: null,
    readingMinutes: 8,
    heroImageUrl: null,
    description: `What essay ${n} is about.`,
    topics: [],
    ...overrides,
  };
}

const HISTORY = { name: "History", description: "Historical chronicles, narratives, and research" };

describe("composeDescription", () => {
  it("keeps whole sentences within the limit, skipping one that would overflow", () => {
    const long = `${"A sentence that is far too long to fit. ".repeat(4).trim()}`;
    const out = composeDescription(["Seven essays on history and politics published on the journal so far.", long, "All of it is free to read.", "Every one has references."]);
    expect(out).toBe("Seven essays on history and politics published on the journal so far. All of it is free to read. Every one has references.");
    expect(out.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });
});

describe("domain hub descriptions", () => {
  it("state the count, what the domain covers and the newest titles, never opening with the name", () => {
    const text = domainHubDescription(HISTORY, [work(1, { title: "Beyond Angkor" }), work(3, { title: "The Triple Fragmentation" }), work(2, { title: "Girmit" })]);
    expect(text).toBe("3 essays in History published on Ānvīkṣikī, covering historical chronicles, narratives, and research. Among them are “The Triple Fragmentation” and “Girmit”.");
    expect(text.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(text.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("names every work when that is all of them, and says so when there are none", () => {
    expect(domainHubDescription({ name: "Science", description: null }, [work(1, { kind: "paper", title: "On Āryabhaṭa" })]))
      .toBe("1 research paper in Science published on Ānvīkṣikī. It is “On Āryabhaṭa”. All of it is free to read.");
    expect(domainHubDescription({ name: "Aesthetics", description: "Art, literature, poetry, and theories of beauty" }, []))
      .toBe("Ānvīkṣikī files essays and papers under Aesthetics, but none has been published in it yet. The domain covers art, literature, poetry, and theories of beauty.");
  });
});

describe("author descriptions", () => {
  const names = new Map([["history", "History"], ["philosophy", "Philosophy"]]);

  it("use the author's own bio when it can stand as a description", () => {
    const bio = "Writes on the history of the Indian Ocean world, the Indian diaspora and the politics of caste, with a particular interest in Fiji and the indenture system.";
    expect(authorDescription("Xiyato Saanvi", [work(1)], names, bio)).toBe(bio);
  });

  it("otherwise describe the published work", () => {
    expect(authorDescription("Guest Writer", [work(2, { title: "On Kabir" })], names))
      .toBe("1 essay by Guest Writer published on Ānvīkṣikī, in History. It is “On Kabir”. All of it is free to read.");
    expect(authorDescription("Xiyato Saanvi", [work(1, { title: "A" }), work(2, { title: "B", categorySlug: "philosophy" })], names))
      .toBe("2 essays by Xiyato Saanvi published on Ānvīkṣikī, in Philosophy and History. They are “B” and “A”. All of it is free to read.");
    expect(authorDescription("New Member", [], names)).toBe("Author profile for New Member on Ānvīkṣikī.");
  });
});

describe("related works", () => {
  const all = [
    work(1, { categorySlug: "philosophy", topics: ["Upanishads"] }),
    work(2, { categorySlug: "history", topics: ["Fiji"] }),
    work(3, { categorySlug: "history", topics: ["Champa"] }),
    work(4, { categorySlug: "politics", topics: ["Fiji", "Girmit"] }),
    work(5, { categorySlug: "aesthetics", topics: [] }),
  ];

  it("ranks a shared domain, then shared topics, then the newest, and never the work itself", () => {
    const related = relatedWorks({ kind: "article", id: "w2", categorySlug: "history", topics: ["Fiji", "girmit"] }, all);
    expect(related.map((w) => w.id)).toEqual(["w4", "w3", "w5"]);
  });

  it("matches topics regardless of case and diacritics", () => {
    const related = relatedWorks({ kind: "article", id: "w9", categorySlug: null, topics: ["upanishads"] }, all, 1);
    expect(related.map((w) => w.id)).toEqual(["w1"]);
  });
});

describe("grouping by year", () => {
  it("puts the newest year first and undated works last", () => {
    const groups = groupByYear([work(1), work(2, { publishedAt: null }), work(3, { publishedAt: "2024-05-01T00:00:00.000Z" })]);
    expect(groups.map((g) => g.year)).toEqual([2026, 2024, null]);
  });
});

describe("the links that close a work's page", () => {
  it("has no 'Related essays' heading when there is nothing related", () => {
    const html = renderContinueReading([], new Map(), null);
    expect(html).not.toContain("<h2");
    expect(html).toContain('aria-label="More to read"');
    expect(html).toContain('<a href="/archive">Every essay in the archive</a>');
  });
});
