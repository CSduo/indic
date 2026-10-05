import { describe, expect, it } from "vitest";
import { RSS_CACHE_CONTROL, RSS_SELF_URL, buildRssXml } from "./rss";

describe("RSS feed", () => {
  const xml = buildRssXml([
    {
      title: "Beyond Angkor",
      description: "Text with ]]> inside",
      link: "https://anvikshikijournal.in/articles/beyond-angkor",
      guid: "article-1",
      timestamp: Date.UTC(2026, 7, 1),
      creators: ["Xiyato Saanvi"],
      category: null,
    },
    {
      title: "A paper",
      description: "",
      link: "https://anvikshikijournal.in/papers/a-paper",
      guid: "paper-2",
      timestamp: Date.UTC(2026, 6, 1),
      creators: ["One Author", "Two Author"],
      category: "history",
    },
  ]);

  it("declares its own URL, title and language", () => {
    expect(xml).toContain(`<atom:link href="${RSS_SELF_URL}" rel="self" type="application/rss+xml" />`);
    expect(xml).toContain("<title>Ānvīkṣikī Journal</title>");
    expect(xml).toContain("<language>en</language>");
    expect(xml).toContain(`<lastBuildDate>${new Date(Date.UTC(2026, 7, 1)).toUTCString()}</lastBuildDate>`);
  });

  it("names authors with dc:creator, not the e-mail-only <author>", () => {
    expect(xml).toContain("<dc:creator><![CDATA[Xiyato Saanvi]]></dc:creator>");
    expect(xml).toContain("<dc:creator><![CDATA[Two Author]]></dc:creator>");
    expect(xml).not.toContain("<author>");
    expect(xml).not.toContain("<category>null</category>");
  });

  it("keeps CDATA sections intact and caches for minutes", () => {
    expect(xml).toContain("<![CDATA[Text with ]]]]><![CDATA[> inside]]>");
    expect(RSS_CACHE_CONTROL).toMatch(/max-age=300/);
  });
});
