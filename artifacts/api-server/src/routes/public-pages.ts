/**
 * Server-rendered public pages that used to be served as the empty SPA shell
 * (or as Express "Cannot GET"): /, /archive, /domains, /papers, /contact,
 * /privacy, /terms, /community and /submit.
 *
 * Each response carries its own title, description, self-canonical, one H1,
 * crawlable links (the site header and footer are added by renderSsrDocument)
 * and an __INITIAL_DATA__ block the client renders from first.
 */
import { Router, type Request, type Response } from "express";
import {
  CANONICAL_DOMAIN,
  SITE_NAME,
  DEFAULT_SOCIAL_IMAGE,
  PUBLIC_HTML_CACHE_CONTROL,
  escapeHtml,
  formatDate,
  formatIsoDate,
  jsonLdGraphScript,
  publisherNode,
  renderSsrDocument,
  socialImageMetaTags,
  type InitialData,
} from "../lib/ssr-html";
import {
  hasPublishedPapers,
  listPublishedWorks,
  listVisibleCategories,
  sortNewestFirst,
  withWorkCounts,
  type CategorySummary,
  type PublishedWorks,
  type WorkSummary,
} from "../lib/public-content";
import { CONTACT_EMAIL, PAGE_META } from "../lib/page-meta";

const router = Router();

export const ARCHIVE_PAGE_SIZE = 50;
const HOME_LATEST_COUNT = 12;
const WEBSITE_ID = `${CANONICAL_DOMAIN}/#website`;

interface PageHead {
  title: string;
  description: string;
  canonicalPath: string;
  indexable: boolean;
  jsonLd?: Array<Record<string, unknown>>;
}

function headTags({ title, description, canonicalPath, indexable, jsonLd }: PageHead): string {
  const canonicalUrl = `${CANONICAL_DOMAIN}${canonicalPath}`;
  const robots = indexable ? "index, follow, max-image-preview:large" : "noindex, follow";
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${robots}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_IN" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    ${socialImageMetaTags(DEFAULT_SOCIAL_IMAGE, SITE_NAME)}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    ${jsonLd && jsonLd.length > 0 ? jsonLdGraphScript(jsonLd) : ""}
  `;
}

function webPageNode(type: string, head: PageHead, extra: Record<string, unknown> = {}) {
  const url = `${CANONICAL_DOMAIN}${head.canonicalPath}`;
  return {
    "@type": type,
    "@id": `${url}#webpage`,
    "url": url,
    "name": head.title,
    "description": head.description,
    "inLanguage": "en",
    "isPartOf": { "@type": "WebSite", "@id": WEBSITE_ID },
    ...extra,
  };
}

function sendPage(
  req: Request,
  res: Response,
  head: PageHead,
  body: string,
  route: string,
  data: unknown,
  showPapers = false,
) {
  const initialData: InitialData = { route, path: req.path.replace(/\/+$/, "") || "/", data };
  if (!head.indexable) res.setHeader("X-Robots-Tag", "noindex, follow");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
  res.status(200).send(renderSsrDocument(headTags(head), body, initialData, { showPapers }));
}

/**
 * The database could not be read. A 503 tells crawlers to come back later,
 * and nothing is cached, so an outage never becomes a cached "no essays" page.
 */
export function sendUnavailable(req: Request, res: Response, err: unknown) {
  req.log?.error({ err }, "Public page data could not be loaded");
  const metaTags = `
    <title>Temporarily unavailable — Ānvīkṣikī</title>
    <meta name="robots" content="noindex, nofollow" />`;
  const body = `<main class="ssr-content">
    <h1>This page is temporarily unavailable</h1>
    <p>The list of published work could not be loaded. Please try again in a few minutes.</p>
  </main>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Retry-After", "120");
  res.status(503).send(renderSsrDocument(metaTags, body));
}

function workPath(work: WorkSummary): string {
  return `/${work.kind === "paper" ? "papers" : "articles"}/${encodeURIComponent(work.slug)}`;
}

function categoryNameMap(categories: Array<{ slug: string; name: string }>): Map<string, string> {
  return new Map(categories.map((c) => [c.slug, c.name]));
}

/** One work in a list: linked title, excerpt, date, author link and domain link. */
export function renderWorkItem(work: WorkSummary, categoryNames: Map<string, string>): string {
  const excerpt = work.excerpt ? work.excerpt.slice(0, 280) + (work.excerpt.length > 280 ? "…" : "") : "";
  const iso = formatIsoDate(work.publishedAt);
  const author = work.authorName
    ? work.authorPath
      ? `By <a href="${escapeHtml(work.authorPath)}">${escapeHtml(work.authorName)}</a>`
      : `By ${escapeHtml(work.authorName)}`
    : "";
  const categoryName = work.categorySlug ? categoryNames.get(work.categorySlug) : undefined;
  const domain = work.categorySlug && categoryName
    ? `<a href="/domains/${escapeHtml(work.categorySlug)}">${escapeHtml(categoryName)}</a>`
    : "";
  const meta = [
    author,
    iso ? `<time datetime="${iso}">${escapeHtml(formatDate(work.publishedAt))}</time>` : "",
    domain,
  ].filter(Boolean).join(" · ");
  return `<li class="ssr-work-item">
      <article>
        <h3><a href="${workPath(work)}">${escapeHtml(work.title)}</a></h3>
        ${meta ? `<p class="ssr-byline">${meta}</p>` : ""}
        ${excerpt ? `<p class="ssr-work-excerpt">${escapeHtml(excerpt)}</p>` : ""}
      </article>
    </li>`;
}

function renderWorkList(works: WorkSummary[], categoryNames: Map<string, string>): string {
  return `<ul class="ssr-work-list">
    ${works.map((w) => renderWorkItem(w, categoryNames)).join("\n    ")}
  </ul>`;
}

function itemListNode(works: WorkSummary[], startPosition = 1) {
  return {
    "@type": "ItemList",
    "itemListElement": works.map((work, i) => ({
      "@type": "ListItem",
      "position": startPosition + i,
      "url": `${CANONICAL_DOMAIN}${workPath(work)}`,
      "name": work.title,
    })),
  };
}

function mergedNewestFirst(works: PublishedWorks): WorkSummary[] {
  return sortNewestFirst([...works.articles, ...works.papers]);
}

async function loadListingData(): Promise<{ works: PublishedWorks; categories: CategorySummary[] }> {
  const [works, categories] = await Promise.all([listPublishedWorks(), listVisibleCategories()]);
  return { works, categories: withWorkCounts(categories, works) };
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

// ── / ─────────────────────────────────────────────────────────────────────────

export function renderHomeBody(works: PublishedWorks, categories: CategorySummary[]): string {
  const latest = mergedNewestFirst(works).slice(0, HOME_LATEST_COUNT);
  const names = categoryNameMap(categories);
  const total = works.articles.length + works.papers.length;
  const hubs = categories.filter((c) => c.articleCount + c.paperCount > 0);
  const newest = latest[0]?.publishedAt;

  const countLine = total > 0
    ? `<p>${pluralize(works.articles.length, "essay")}${works.papers.length > 0 ? ` and ${pluralize(works.papers.length, "research paper")}` : ""} published so far${newest ? `, most recently on <time datetime="${formatIsoDate(newest)}">${escapeHtml(formatDate(newest))}</time>` : ""}.</p>`
    : "";

  return `<main class="ssr-content ssr-home">
  <header class="ssr-domain-header">
    <h1 class="ssr-title">Ānvīkṣikī: essays on history, philosophy and politics</h1>
    <p class="ssr-description">${escapeHtml(PAGE_META.home.description)} The name is the classical Sanskrit term for the discipline of critical inquiry.</p>
    ${countLine}
    <p><a href="/about/anvikshiki">What “Ānvīkṣikī” means</a> · <a href="/about">About the journal</a> · <a href="/submit">Submit your work</a></p>
  </header>

  <section class="ssr-section">
    <h2>${works.papers.length > 0 ? "Latest essays and papers" : "Latest essays"}</h2>
    ${latest.length > 0
      ? renderWorkList(latest, names)
      : `<p>Nothing has been published yet. <a href="/submit">Submit your work</a>.</p>`}
    ${total > latest.length ? `<p><a href="/archive">All ${total} published works in the archive</a></p>` : `<p><a href="/archive">The archive</a></p>`}
  </section>

  ${hubs.length > 0 ? `<section class="ssr-section">
    <h2>Domains</h2>
    <ul>
      ${hubs.map((c) => `<li><a href="/domains/${escapeHtml(c.slug)}">${escapeHtml(c.name)}</a> (${pluralize(c.articleCount + c.paperCount, "work")})</li>`).join("\n      ")}
    </ul>
    <p><a href="/domains">All domains</a></p>
  </section>` : ""}
</main>`;
}

router.get("/", async (req, res) => {
  let data: Awaited<ReturnType<typeof loadListingData>>;
  try {
    data = await loadListingData();
  } catch (err) {
    sendUnavailable(req, res, err);
    return;
  }
  const { works, categories } = data;
  const head: PageHead = {
    ...PAGE_META.home,
    canonicalPath: "/",
    indexable: true,
  };
  const latest = mergedNewestFirst(works).slice(0, HOME_LATEST_COUNT);
  head.jsonLd = [
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      "url": `${CANONICAL_DOMAIN}/`,
      "name": SITE_NAME,
      "description": PAGE_META.home.description,
      "inLanguage": "en",
      "publisher": { "@id": `${CANONICAL_DOMAIN}/#organization` },
      "potentialAction": {
        "@type": "SearchAction",
        "target": { "@type": "EntryPoint", "urlTemplate": `${CANONICAL_DOMAIN}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    publisherNode(),
    webPageNode("CollectionPage", head, { "mainEntity": itemListNode(latest) }),
  ];
  sendPage(req, res, head, renderHomeBody(works, categories), "home", {
    articles: works.articles.slice(0, 24),
    papers: works.papers.slice(0, 24),
    articleTotal: works.articles.length,
    paperTotal: works.papers.length,
    domains: categories,
  }, works.papers.length > 0);
});

// ── /archive ──────────────────────────────────────────────────────────────────

export function renderArchiveBody(
  pageWorks: WorkSummary[],
  page: number,
  totalPages: number,
  total: number,
  categories: CategorySummary[],
): string {
  const names = categoryNameMap(categories);
  const pageLink = (n: number) => (n === 1 ? "/archive" : `/archive?page=${n}`);
  const pagination = totalPages > 1
    ? `<nav class="ssr-pagination" aria-label="Archive pages">
      ${page > 1 ? `<a href="${pageLink(page - 1)}" rel="prev">Newer works</a>` : "<span></span>"}
      <span>Page ${page} of ${totalPages}</span>
      ${page < totalPages ? `<a href="${pageLink(page + 1)}" rel="next">Older works</a>` : "<span></span>"}
    </nav>`
    : "";
  return `<main class="ssr-content ssr-archive">
  <header class="ssr-domain-header">
    <h1 class="ssr-title">Archive${page > 1 ? ` — page ${page}` : ""}</h1>
    <p class="ssr-description">${escapeHtml(PAGE_META.archive.description)}</p>
    <p>${pluralize(total, "published work")}. Browse by subject on the <a href="/domains">domains</a> page.</p>
  </header>
  <section class="ssr-section">
    ${pageWorks.length > 0 ? renderWorkList(pageWorks, names) : `<p>Nothing has been published yet.</p>`}
    ${pagination}
  </section>
</main>`;
}

router.get("/archive", async (req, res) => {
  const rawPage = req.query.page;
  let page = 1;
  if (rawPage !== undefined) {
    const value = Array.isArray(rawPage) ? rawPage[0] : rawPage;
    if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value) || value === "1") {
      // One URL per page: ?page=1 and malformed values go to the archive itself.
      res.redirect(301, "/archive");
      return;
    }
    page = Number(value);
  }

  let data: Awaited<ReturnType<typeof loadListingData>>;
  try {
    data = await loadListingData();
  } catch (err) {
    sendUnavailable(req, res, err);
    return;
  }
  const { works, categories } = data;
  const all = mergedNewestFirst(works);
  const totalPages = Math.max(1, Math.ceil(all.length / ARCHIVE_PAGE_SIZE));
  if (page > totalPages) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(404).send(renderSsrDocument(
      `<title>Archive page not found — Ānvīkṣikī</title>\n    <meta name="robots" content="noindex, nofollow" />`,
      `<main class="ssr-content"><h1>Archive page not found</h1><p>The archive has ${totalPages} ${totalPages === 1 ? "page" : "pages"}. <a href="/archive">Go to the first page</a>.</p></main>`,
    ));
    return;
  }
  const start = (page - 1) * ARCHIVE_PAGE_SIZE;
  const pageWorks = all.slice(start, start + ARCHIVE_PAGE_SIZE);
  const head: PageHead = {
    title: page > 1 ? `${PAGE_META.archive.title.replace(" — Ānvīkṣikī", "")}, page ${page} — Ānvīkṣikī` : PAGE_META.archive.title,
    description: PAGE_META.archive.description,
    canonicalPath: page > 1 ? `/archive?page=${page}` : "/archive",
    indexable: true,
  };
  head.jsonLd = [webPageNode("CollectionPage", head, { "mainEntity": itemListNode(pageWorks, start + 1) })];
  sendPage(
    req,
    res,
    head,
    renderArchiveBody(pageWorks, page, totalPages, all.length, categories),
    "archive",
    { page, totalPages, total: all.length, works: pageWorks, domains: categories },
    works.papers.length > 0,
  );
});

// ── /domains ──────────────────────────────────────────────────────────────────

export function renderDomainsBody(categories: CategorySummary[]): string {
  const withWork = categories
    .filter((c) => c.articleCount + c.paperCount > 0)
    .sort((a, b) => b.articleCount + b.paperCount - (a.articleCount + a.paperCount));
  const empty = categories.filter((c) => c.articleCount + c.paperCount === 0);
  return `<main class="ssr-content ssr-domains">
  <header class="ssr-domain-header">
    <h1 class="ssr-title">Domains</h1>
    <p class="ssr-description">${escapeHtml(PAGE_META.domains.description)}</p>
  </header>
  <section class="ssr-section">
    <h2>Domains with published work</h2>
    ${withWork.length > 0 ? `<ul class="ssr-work-list">
      ${withWork.map((c) => `<li class="ssr-work-item">
        <h3><a href="/domains/${escapeHtml(c.slug)}">${escapeHtml(c.name)}</a></h3>
        <p class="ssr-byline">${pluralize(c.articleCount, "essay")}${c.paperCount > 0 ? ` · ${pluralize(c.paperCount, "paper")}` : ""}</p>
        ${c.description ? `<p class="ssr-work-excerpt">${escapeHtml(c.description)}</p>` : ""}
      </li>`).join("\n      ")}
    </ul>` : `<p>Nothing has been published yet.</p>`}
  </section>
  ${empty.length > 0 ? `<section class="ssr-section">
    <h2>Domains with no published work yet</h2>
    <p>${empty.map((c) => escapeHtml(c.name)).join(", ")}. <a href="/submit">Submissions in these areas are welcome</a>.</p>
  </section>` : ""}
</main>`;
}

router.get("/domains", async (req, res) => {
  let data: Awaited<ReturnType<typeof loadListingData>>;
  try {
    data = await loadListingData();
  } catch (err) {
    sendUnavailable(req, res, err);
    return;
  }
  const { works, categories } = data;
  const head: PageHead = { ...PAGE_META.domains, canonicalPath: "/domains", indexable: true };
  head.jsonLd = [webPageNode("CollectionPage", head)];
  sendPage(req, res, head, renderDomainsBody(categories), "domains", { domains: categories }, works.papers.length > 0);
});

// ── /papers ───────────────────────────────────────────────────────────────────

/*
  There are no published papers yet. /papers stays a real page rather than a
  redirect so the URL keeps working when the first paper is published: while it
  is empty it says so plainly and is noindex (and left out of the sitemap); as
  soon as a paper exists it lists the papers and becomes indexable.
*/
router.get("/papers", async (req, res) => {
  let data: Awaited<ReturnType<typeof loadListingData>>;
  try {
    data = await loadListingData();
  } catch (err) {
    sendUnavailable(req, res, err);
    return;
  }
  const { works, categories } = data;
  const papers = works.papers;
  const head: PageHead = { ...PAGE_META.papers, canonicalPath: "/papers", indexable: papers.length > 0 };
  if (papers.length > 0) head.jsonLd = [webPageNode("CollectionPage", head, { "mainEntity": itemListNode(papers) })];
  const body = `<main class="ssr-content ssr-papers">
  <header class="ssr-domain-header">
    <h1 class="ssr-title">Research papers</h1>
    ${papers.length > 0
      ? `<p class="ssr-description">${escapeHtml(PAGE_META.papers.description)}</p>`
      : `<p class="ssr-description">No research papers have been published on Ānvīkṣikī yet. Published essays are listed in the <a href="/archive">archive</a>.</p>`}
  </header>
  ${papers.length > 0 ? `<section class="ssr-section">${renderWorkList(papers, categoryNameMap(categories))}</section>` : `<p><a href="/submit">Submit a research paper</a></p>`}
</main>`;
  sendPage(req, res, head, body, "papers", { papers }, papers.length > 0);
});

// ── /contact, /privacy, /terms, /community ──────────────────────────────────

export function renderContactBody(): string {
  return `<main class="ssr-content ssr-contact">
  <h1 class="ssr-title">Contact Ānvīkṣikī</h1>
  <p class="ssr-description">${escapeHtml(PAGE_META.contact.description)}</p>
  <h2>Email</h2>
  <p>Write to the editor at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. You can also use the contact form on this page, which needs JavaScript.</p>
  <h2>Submissions</h2>
  <p>Manuscripts are sent through the submission portal rather than by email. The <a href="/submit">submission guidelines</a> explain what to include.</p>
</main>`;
}

/** The policy text published on /privacy (same wording as the SPA page). */
export function renderPrivacyBody(): string {
  return `<main class="ssr-content ssr-legal">
  <h1 class="ssr-title">Privacy Policy</h1>
  <p>Last updated: June 2026</p>
  <p>Anvikshiki is committed to protecting your privacy.</p>
  <h2>1. Information We Collect</h2>
  <p>We collect email addresses for newsletter subscriptions and account creation. Submission forms collect name, email, and work details.</p>
  <h2>2. How We Use Information</h2>
  <p>We use your information to provide the service, communicate about submissions, and send newsletters (if subscribed).</p>
  <h2>3. Data Security</h2>
  <p>We implement reasonable security measures to protect your data. Passwords are hashed and sessions use secure cookies.</p>
  <h2>4. Third Parties</h2>
  <p>We do not sell your data. We use Supabase for data storage.</p>
  <p><a href="/terms">Terms of Service</a> · <a href="/contact">Contact</a></p>
</main>`;
}

/** The terms published on /terms (same wording as the SPA page). */
export function renderTermsBody(): string {
  return `<main class="ssr-content ssr-legal">
  <h1 class="ssr-title">Terms of Service</h1>
  <p>Last updated: June 2026</p>
  <p>Welcome to Anvikshiki. By accessing or using our platform, you agree to these terms.</p>
  <h2>1. Acceptance of Terms</h2>
  <p>By using Anvikshiki, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
  <h2>2. User Accounts</h2>
  <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
  <h2>3. Submissions</h2>
  <p>By submitting content, you confirm that the work is original or that you have permission to submit it.</p>
  <h2>4. Intellectual Property</h2>
  <p>Authors retain ownership of their work. By publishing on Anvikshiki, you grant us a license to display the content.</p>
  <p><a href="/privacy">Privacy Policy</a> · <a href="/contact">Contact</a></p>
</main>`;
}

/*
  The community area holds member profiles and placeholder feeds, not
  published work, so its landing page is noindex until there is real activity.
*/
export function renderCommunityBody(): string {
  return `<main class="ssr-content ssr-community">
  <h1 class="ssr-title">Community</h1>
  <p class="ssr-description">${escapeHtml(PAGE_META.community.description)} Taking part needs an account.</p>
  <p>Published essays are in the <a href="/archive">archive</a>. To contribute an essay, see the <a href="/submit">submission guidelines</a>.</p>
</main>`;
}

const STATIC_PAGES: Array<{
  path: string;
  key: "contact" | "privacy" | "terms" | "community";
  type: string;
  indexable: boolean;
  render: () => string;
}> = [
  { path: "/contact", key: "contact", type: "ContactPage", indexable: true, render: renderContactBody },
  { path: "/privacy", key: "privacy", type: "WebPage", indexable: true, render: renderPrivacyBody },
  { path: "/terms", key: "terms", type: "WebPage", indexable: true, render: renderTermsBody },
  { path: "/community", key: "community", type: "WebPage", indexable: false, render: renderCommunityBody },
];

for (const page of STATIC_PAGES) {
  router.get(page.path, async (req, res) => {
    const head: PageHead = { ...PAGE_META[page.key], canonicalPath: page.path, indexable: page.indexable };
    if (page.indexable) head.jsonLd = [webPageNode(page.type, head, { "publisher": { "@id": `${CANONICAL_DOMAIN}/#organization` } })];
    sendPage(req, res, head, page.render(), page.key, null, await hasPublishedPapers());
  });
}

// ── /submit ───────────────────────────────────────────────────────────────────

export function renderSubmitBody(categories: Array<{ slug: string; name: string }>): string {
  return `<main class="ssr-content ssr-submit-landing">
  <h1 class="ssr-title">Submit your work to Ānvīkṣikī</h1>
  <p class="ssr-description">Ānvīkṣikī accepts essays, research papers, reviews and commentary, book reviews and translations. Published work is free to read, and authors keep ownership of their work (see the <a href="/terms">terms</a>).</p>

  <h2>What to send</h2>
  <ul>
    <li>Original work that you wrote, or have permission to submit.</li>
    <li>A short abstract or summary of the piece.</li>
    <li>References and citations for quotations, figures and other sources.</li>
  </ul>

  ${categories.length > 0 ? `<h2>Subjects</h2>
  <p>Work is filed under one of these domains: ${categories.map((c) => escapeHtml(c.name)).join(", ")}. See the <a href="/domains">domains page</a> for what has been published in each.</p>` : ""}

  <h2>How to submit</h2>
  <p>Submitting needs an account. <a href="/login">Sign in or create an account</a>, then either write the piece in the browser editor or upload a PDF, Word (.doc or .docx) or plain-text file together with its details.</p>

  <h2>What happens next</h2>
  <p>Each submission is read by the editor, who may accept it, ask for revisions or decline it. Nothing is published without the editor's decision. You can follow the status of your submissions from your account.</p>

  <p>Questions about a submission? <a href="/contact">Contact the editor</a>.</p>
</main>`;
}

router.get("/submit", async (req, res) => {
  // The guidelines read well without the domain list, so a failed category
  // query only drops that paragraph.
  let categories: Array<{ slug: string; name: string }> = [];
  try {
    categories = await listVisibleCategories();
  } catch (err) {
    req.log?.warn({ err }, "Submit page: categories unavailable");
  }
  const head: PageHead = { ...PAGE_META.submit, canonicalPath: "/submit", indexable: true };
  head.jsonLd = [webPageNode("WebPage", head, { "publisher": { "@id": `${CANONICAL_DOMAIN}/#organization` } })];
  // The client renders the same guidelines, with the same domain list.
  const data = { domains: categories.map((c) => ({ slug: c.slug, name: c.name })) };
  sendPage(req, res, head, renderSubmitBody(categories), "submit", data, await hasPublishedPapers());
});

export default router;
