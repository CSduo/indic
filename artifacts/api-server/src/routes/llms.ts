import { Router } from "express";
import { listPublishedWorks, sortNewestFirst } from "../lib/public-content";
import { PAGE_META } from "../lib/page-meta";
import { CANONICAL_DOMAIN } from "../lib/ssr-html";
import { cleanTitle } from "../lib/seo-text";

/*
 * /llms.txt — a plain factual summary for AI assistants and crawlers that read
 * it (llmstxt.org): what the journal publishes, its main pages and every
 * published essay with a one-line summary. It contains no instructions to
 * models and is generated from the same data as the pages.
 */
const router = Router();

router.get("/llms.txt", async (_req, res) => {
  try {
    const works = await listPublishedWorks();
    const essays = sortNewestFirst(works.articles);
    const papers = sortNewestFirst(works.papers);
    const line = (path: string, title: string, summary: string | null) =>
      `- [${cleanTitle(title)}](${CANONICAL_DOMAIN}${path})${summary ? `: ${summary.slice(0, 220).trim()}` : ""}`;

    const body = [
      "# Ānvīkṣikī (Anvikshiki Journal)",
      "",
      `> ${PAGE_META.home.description}`,
      "",
      "Ānvīkṣikī is an independent English-language journal at anvikshikijournal.in publishing essays on history, philosophy, politics and civilisational thought from an Indic perspective. It is not affiliated with other publications that share the name.",
      "",
      "## Main pages",
      `- [Home](${CANONICAL_DOMAIN}/)`,
      `- [Archive of published essays](${CANONICAL_DOMAIN}/archive)`,
      `- [Subject domains](${CANONICAL_DOMAIN}/domains)`,
      `- [What "Ānvīkṣikī" means](${CANONICAL_DOMAIN}/about/anvikshiki)`,
      `- [About the journal](${CANONICAL_DOMAIN}/about)`,
      `- [Submit your work](${CANONICAL_DOMAIN}/submit)`,
      `- [RSS feed](${CANONICAL_DOMAIN}/rss.xml)`,
      "",
      "## Essays",
      ...(essays.length ? essays.map((w) => line(`/articles/${encodeURIComponent(w.slug)}`, w.title, w.excerpt)) : ["- No essays published yet."]),
      ...(papers.length ? ["", "## Papers", ...papers.map((w) => line(`/papers/${encodeURIComponent(w.slug)}`, w.title, w.excerpt))] : []),
      "",
    ].join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
    res.status(200).send(body);
  } catch {
    res.setHeader("Cache-Control", "no-store");
    res.status(503).type("text/plain").send("Temporarily unavailable.");
  }
});

export default router;
