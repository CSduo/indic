import { and, asc, eq, inArray } from "drizzle-orm";
import {
  articlesTable,
  categoriesTable,
  db,
  papersTable,
  submissionsTable,
  type Submission,
} from "@workspace/db";
import { sanitizeArticleBody } from "./content";

type PublicationKind = "article" | "paper";

const PUBLIC_SUBMISSION_STATUSES = [
  "PUBLISHED",
] as const;

const DEFAULT_CATEGORIES = [
  { slug: "philosophy", name: "Philosophy", description: "Philosophical schools and systems of thought", icon: "Compass", sortOrder: 1 },
  { slug: "history", name: "History", description: "Historical chronicles, narratives, and research", icon: "History", sortOrder: 2 },
  { slug: "psychology", name: "Psychology", description: "Mind, consciousness, and behavioral studies", icon: "Brain", sortOrder: 3 },
  { slug: "sociology", name: "Sociology", description: "Social structures, communities, and institutions", icon: "Users", sortOrder: 4 },
  { slug: "science", name: "Science", description: "Traditional sciences and modern research", icon: "Atom", sortOrder: 5 },
  { slug: "geopolitics", name: "Geopolitics", description: "Strategy, geography, and global relationships", icon: "Globe", sortOrder: 6 },
  { slug: "civilizational-thought", name: "Civilizational Thought", description: "Foundations of civilizational identity and theory", icon: "BookOpen", sortOrder: 7 },
  { slug: "aesthetics", name: "Aesthetics", description: "Art, literature, poetry, and theories of beauty", icon: "Palette", sortOrder: 8 },
  { slug: "sanskrit-studies", name: "Sanskrit Studies", description: "Philology, grammar, texts, and linguistics", icon: "Languages", sortOrder: 9 },
  { slug: "political-theory", name: "Political Theory", description: "Statecraft, governance, and polity studies", icon: "Shield", sortOrder: 10 },
  { slug: "translations", name: "Translations", description: "Translations of classical and contemporary texts", icon: "FileText", sortOrder: 11 },
  { slug: "multimedia", name: "Multimedia", description: "Audio, video, and rich-media research", icon: "Video", sortOrder: 12 },
  { slug: "papers", name: "Papers", description: "Research papers and monographs", icon: "FileSearch", sortOrder: 13 },
  { slug: "archive", name: "Archive", description: "Historical archive files and miscellaneous work", icon: "Archive", sortOrder: 14 },
] as const;

let categoriesReady: Promise<void> | null = null;

export function ensureDefaultCategories() {
  if (!categoriesReady) {
    categoriesReady = db
      .insert(categoriesTable)
      .values([...DEFAULT_CATEGORIES])
      .onConflictDoNothing({ target: categoriesTable.slug })
      .then(() => undefined);
  }
  return categoriesReady;
}

export type PublicPublicationResult = {
  kind: PublicationKind | null;
  status: "created" | "existing" | "skipped";
  id?: string;
  slug?: string;
  reason?: string;
};

const CATEGORY_ALIASES: Record<string, string> = {
  civilization: "civilizational-thought",
  civilizations: "civilizational-thought",
  civilisation: "civilizational-thought",
  civilisations: "civilizational-thought",
  "civilizational": "civilizational-thought",
  "civilisational": "civilizational-thought",
  sanskrit: "sanskrit-studies",
  "sanskrit-study": "sanskrit-studies",
  political: "political-theory",
  politics: "political-theory",
  "book-review": "sociology",
  translation: "translations",
};

export function slugify(value: string | null | undefined, fallback = "submission") {
  const slug = (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function normalizeCategorySlug(value: string | null | undefined) {
  const slug = slugify(value, "archive");
  return CATEGORY_ALIASES[slug] || slug;
}

export function categorySlugCandidates(value: string | null | undefined) {
  const normalized = normalizeCategorySlug(value);
  return [
    normalized,
    ...Object.entries(CATEGORY_ALIASES)
      .filter(([, target]) => target === normalized)
      .map(([alias]) => alias),
  ];
}

function extractLineValue(notes: string | null | undefined, label: string) {
  if (!notes) return null;
  const match = notes.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || null;
}

export function getSubmissionDomain(submission: Submission) {
  return submission.domain || extractLineValue(submission.notes, "Domain");
}

function getSubmissionCoverImage(submission: Submission) {
  if (submission.coverImageUrl) return submission.coverImageUrl;
  return (
    extractLineValue(submission.notes, "Cover image") ||
    extractLineValue(submission.notes, "Cover URL") ||
    null
  );
}

async function resolveCategorySlug(rawCategory: string | null | undefined) {
  await ensureDefaultCategories();
  let slug = normalizeCategorySlug(rawCategory);

  const [category] = await db
    .select({ slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug))
    .limit(1);

  if (category) return category.slug;

  for (const fallbackSlug of ["archive", "philosophy"]) {
    const [fallback] = await db
      .select({ slug: categoriesTable.slug })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, fallbackSlug))
      .limit(1);
    if (fallback) return fallback.slug;
  }

  const [firstCategory] = await db
    .select({ slug: categoriesTable.slug })
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.sortOrder))
    .limit(1);

  return firstCategory?.slug || "archive";
}

async function uniqueArticleSlug(baseSlug: string, submissionId: string) {
  const words = baseSlug.split("-").filter(w => w && !["a", "an", "the", "in", "of", "on", "at", "to", "for", "with", "is", "and"].includes(w));
  const cleanBase = (words.length > 7 ? words.slice(0, 7) : words).join("-") || "article";

  const [existing] = await db
    .select({ id: articlesTable.id })
    .from(articlesTable)
    .where(eq(articlesTable.slug, cleanBase))
    .limit(1);

  if (!existing) return cleanBase;
  return `${cleanBase}-${submissionId.slice(0, 4)}`;
}

async function uniquePaperSlug(baseSlug: string, submissionId: string) {
  const words = baseSlug.split("-").filter(w => w && !["a", "an", "the", "in", "of", "on", "at", "to", "for", "with", "is", "and"].includes(w));
  const cleanBase = (words.length > 7 ? words.slice(0, 7) : words).join("-") || "paper";

  const [existing] = await db
    .select({ id: papersTable.id })
    .from(papersTable)
    .where(eq(papersTable.slug, cleanBase))
    .limit(1);

  if (!existing) return cleanBase;
  return `${cleanBase}-${submissionId.slice(0, 4)}`;
}

export async function ensurePublicPublicationForSubmission(
  submission: Submission,
  options: { categorySlug?: string | null; publishedAt?: Date } = {},
): Promise<PublicPublicationResult> {
  if (!PUBLIC_SUBMISSION_STATUSES.includes(submission.status as typeof PUBLIC_SUBMISSION_STATUSES[number])) {
    return { kind: null, status: "skipped", reason: "submission-not-public" };
  }

  const kind: PublicationKind = submission.type === "PAPER" ? "paper" : "article";
  const categorySlug = await resolveCategorySlug(
    options.categorySlug || getSubmissionDomain(submission) || "archive",
  );
  const baseSlug = slugify(submission.title || "untitled-submission");
  const publishedAt = options.publishedAt || submission.publishedAt || submission.updatedAt || new Date();
  const body = sanitizeArticleBody(submission.body || submission.abstract || submission.title || "No body content provided.");
  const authorName = submission.submitterName || "Anonymous Scholar";
  const coverImageUrl = getSubmissionCoverImage(submission) || "/images/provided/home-falcon-city-panorama-hero.jpg";

  if (kind === "paper") {
    const [existing] = await db
      .select({ id: papersTable.id, slug: papersTable.slug })
      .from(papersTable)
      .where(eq(papersTable.title, submission.title || "Untitled Paper"))
      .limit(1);

    if (existing) {
      await db
        .update(papersTable)
        .set({
          title: submission.title || "Untitled Paper",
          abstract: submission.abstract || "",
          body,
          categorySlug,
          authorName,
          pdfUrl: submission.manuscriptUrl || (submission as any).fileUrl || null,
          coverImageUrl,
          status: "PUBLISHED",
          publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(papersTable.id, existing.id));
      return { kind, status: "existing", id: existing.id, slug: existing.slug };
    }

    const slug = await uniquePaperSlug(baseSlug, submission.id);
    const [paper] = await db
      .insert(papersTable)
      .values({
        slug,
        title: submission.title || "Untitled Paper",
        abstract: submission.abstract || "",
        body,
        categorySlug,
        tags: [],
        authorName,
        pdfUrl: submission.manuscriptUrl || (submission as any).fileUrl || null,
        coverImageUrl,
        citationText: null,
        peerReviewed: false,
        paperType: "RESEARCH_PAPER",
        status: "PUBLISHED",
        publishedAt,
      })
      .returning({ id: papersTable.id, slug: papersTable.slug });

    return { kind, status: "created", id: paper.id, slug: paper.slug };
  }

  const [existing] = await db
    .select({ id: articlesTable.id, slug: articlesTable.slug })
    .from(articlesTable)
    .where(eq(articlesTable.title, submission.title || "Untitled Article"))
    .limit(1);

  if (existing) {
    await db
      .update(articlesTable)
      .set({
        title: submission.title || "Untitled Article",
        excerpt: submission.abstract || submission.title || "Article excerpt",
        body,
        categorySlug,
        authorName,
        heroImageUrl: coverImageUrl,
        heroImageAlt: submission.title || "Article Cover",
        audioUrl: (submission as any).audioUrl || null,
        status: "PUBLISHED",
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(articlesTable.id, existing.id));
    return { kind, status: "existing", id: existing.id, slug: existing.slug };
  }

  const slug = await uniqueArticleSlug(baseSlug, submission.id);
  const [article] = await db
    .insert(articlesTable)
    .values({
      slug,
      title: submission.title || "Untitled Article",
      subtitle: null,
      excerpt: submission.abstract || submission.title || "Article excerpt",
      body,
      categorySlug,
      tags: [],
      authorName,
      heroImageUrl: coverImageUrl,
      heroImageAlt: submission.title || "Article Cover",
      audioUrl: (submission as any).audioUrl || null,
      keyTakeaways: [],
      status: "PUBLISHED",
      featured: false,
      publishedAt,
    })
    .returning({ id: articlesTable.id, slug: articlesTable.slug });

  return { kind, status: "created", id: article.id, slug: article.slug };
}

export async function syncPublishedSubmissions() {
  await ensureDefaultCategories();
  const publishedSubmissions = await db
    .select()
    .from(submissionsTable)
    .where(inArray(submissionsTable.status, [...PUBLIC_SUBMISSION_STATUSES]));

  const summary = {
    checked: publishedSubmissions.length,
    createdArticles: 0,
    createdPapers: 0,
    existing: 0,
    skipped: 0,
  };

  for (const submission of publishedSubmissions) {
    const result = await ensurePublicPublicationForSubmission(submission);
    if (result.status === "existing") summary.existing += 1;
    if (result.status === "skipped") summary.skipped += 1;
    if (result.status === "created" && result.kind === "article") summary.createdArticles += 1;
    if (result.status === "created" && result.kind === "paper") summary.createdPapers += 1;
  }

  return summary;
}

let scheduledSync: Promise<unknown> | null = null;

export function schedulePublishedSubmissionSync(logger: {
  info?: (value: unknown, message?: string) => void;
  warn?: (value: unknown, message?: string) => void;
} = {}) {
  if (scheduledSync || !process.env.DATABASE_URL) return scheduledSync;

  scheduledSync = new Promise((resolve) => {
    setTimeout(resolve, 0);
  })
    .then(() => syncPublishedSubmissions())
    .then((summary) => {
      logger.info?.({ summary }, "Published submissions synchronized");
      return summary;
    })
    .catch((err) => {
      logger.warn?.({ err }, "Failed to synchronize published submissions");
    });

  return scheduledSync;
}
