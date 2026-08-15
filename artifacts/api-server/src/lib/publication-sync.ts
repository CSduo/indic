import { and, asc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
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

/**
 * Statuses a work may hold when an editor explicitly asks for it to be pushed
 * live. ACCEPTED is included because the desk's "Publish" action patches the
 * status and runs the publication step in the same request — reading the status
 * back as not-yet-public made that action refuse its own write.
 */
const PUBLISHABLE_ON_DEMAND_STATUSES = new Set(["PUBLISHED", "ACCEPTED"]);

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
      .then(() => undefined)
      .catch((err) => {
        console.warn("ensureDefaultCategories non-fatal error:", err);
        categoriesReady = null;
      });
  }
  return categoriesReady || Promise.resolve();
}

/** A unique-violation on the slug — the only insert failure worth a fresh slug. */
function isSlugConflict(err: any): boolean {
  if (err?.code === "23505") return true;
  const message = String(err?.message || "").toLowerCase();
  return message.includes("duplicate key") && message.includes("slug");
}

/**
 * Turn a failed publication into an error an editor can act on. The old bare
 * "Publication link could not be created" hid the actual cause — usually a
 * missing column on a drifted database, or a category that no longer exists.
 */
function publicationFailure(kind: PublicationKind, cause: unknown): Error {
  const detail = (cause as any)?.message ? `: ${(cause as any).message}` : "";
  const error = new Error(`The public ${kind} record could not be created${detail}`);
  (error as any).cause = cause;
  return error;
}

export type PublicPublicationResult = {
  kind: PublicationKind | null;
  status: "created" | "existing" | "restored" | "skipped";
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

  const candidates = [
    cleanBase,
    `${cleanBase}-${submissionId.slice(0, 4)}`,
    `${cleanBase}-${submissionId.slice(0, 8)}`,
    `${cleanBase}-${submissionId.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`,
  ];

  for (const candidate of candidates) {
    const [taken] = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .where(eq(articlesTable.slug, candidate))
      .limit(1);
    if (!taken) return candidate;
  }

  return `${cleanBase}-${Date.now().toString(36)}`;
}

async function uniquePaperSlug(baseSlug: string, submissionId: string) {
  const words = baseSlug.split("-").filter(w => w && !["a", "an", "the", "in", "of", "on", "at", "to", "for", "with", "is", "and"].includes(w));
  const cleanBase = (words.length > 7 ? words.slice(0, 7) : words).join("-") || "paper";

  const candidates = [
    cleanBase,
    `${cleanBase}-${submissionId.slice(0, 4)}`,
    `${cleanBase}-${submissionId.slice(0, 8)}`,
    `${cleanBase}-${submissionId.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`,
  ];

  for (const candidate of candidates) {
    const [taken] = await db
      .select({ id: papersTable.id })
      .from(papersTable)
      .where(eq(papersTable.slug, candidate))
      .limit(1);
    if (!taken) return candidate;
  }

  return `${cleanBase}-${Date.now().toString(36)}`;
}

export async function ensurePublicPublicationForSubmission(
  submission: Submission,
  options: { categorySlug?: string | null; publishedAt?: Date; allowCreate?: boolean } = {},
): Promise<PublicPublicationResult> {
  if (submission.deletedAt) {
    return { kind: null, status: "skipped", reason: "submission-trashed" };
  }

  const allowCreate = options.allowCreate === true;

  // A reconciliation pass (allowCreate: false) only ever touches already-public
  // work. An explicit editorial publish (allowCreate: true) may also act on an
  // ACCEPTED submission, which is the state the desk's Publish button sends.
  const publishableStatuses: ReadonlySet<string> = allowCreate
    ? PUBLISHABLE_ON_DEMAND_STATUSES
    : new Set(PUBLIC_SUBMISSION_STATUSES);
  if (!publishableStatuses.has(submission.status)) {
    return { kind: null, status: "skipped", reason: "submission-not-public" };
  }

  const kind: PublicationKind = submission.type === "PAPER" ? "paper" : "article";

  if (kind === "paper") {
    let [existing] = await db
      .select({ id: papersTable.id, slug: papersTable.slug, status: papersTable.status, deletedAt: papersTable.deletedAt })
      .from(papersTable)
      .where(eq(papersTable.sourceSubmissionId, submission.id))
      .limit(1);

    if (!existing && allowCreate && submission.title) {
      const baseSlug = slugify(submission.title);
      const [candidate] = await db
        .select({ id: papersTable.id, slug: papersTable.slug, status: papersTable.status, deletedAt: papersTable.deletedAt })
        .from(papersTable)
        .where(or(
          eq(papersTable.slug, baseSlug),
          ilike(papersTable.title, submission.title.trim())
        ))
        .limit(1);
      if (candidate) existing = candidate;
    }

    if (existing) {
      if (existing.deletedAt && !allowCreate) {
        return { kind, status: "skipped", id: existing.id, slug: existing.slug, reason: "publication-trashed" };
      }
      if (!existing.deletedAt && existing.status !== "PUBLISHED" && !allowCreate) {
        return { kind, status: "skipped", id: existing.id, slug: existing.slug, reason: "publication-not-public" };
      }
      const restoredFromTrash = Boolean(existing.deletedAt);
      const categorySlug = await resolveCategorySlug(
        options.categorySlug || getSubmissionDomain(submission) || "archive",
      );
      const publishedAt = options.publishedAt || submission.publishedAt || submission.updatedAt || new Date();
      const body = sanitizeArticleBody(submission.body || submission.abstract || submission.title || "No body content provided.");
      const authorName = submission.submitterName || "Anonymous Scholar";
      const coverImageUrl = getSubmissionCoverImage(submission) || "/images/provided/home-falcon-city-panorama-hero.jpg";
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
          deletedAt: null,
          sourceSubmissionId: submission.id,
          updatedAt: new Date(),
        })
        .where(eq(papersTable.id, existing.id));
      return {
        kind,
        status: restoredFromTrash ? "restored" : "existing",
        id: existing.id,
        slug: existing.slug,
      };
    }

    if (!allowCreate) {
      return { kind, status: "skipped", reason: "publication-not-linked" };
    }

    const categorySlug = await resolveCategorySlug(
      options.categorySlug || getSubmissionDomain(submission) || "archive",
    );
    const baseSlug = slugify(submission.title || "untitled-submission");
    const publishedAt = options.publishedAt || submission.publishedAt || submission.updatedAt || new Date();
    const body = sanitizeArticleBody(submission.body || submission.abstract || submission.title || "No body content provided.");
    const authorName = submission.submitterName || "Anonymous Scholar";
    const coverImageUrl = getSubmissionCoverImage(submission) || "/images/provided/home-falcon-city-panorama-hero.jpg";
    let candidateSlug = await uniquePaperSlug(baseSlug, submission.id);
    let lastInsertError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [paper] = await db
          .insert(papersTable)
          .values({
            slug: candidateSlug,
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
            sourceSubmissionId: submission.id,
          })
          .returning({ id: papersTable.id, slug: papersTable.slug });

        if (paper) return { kind, status: "created", id: paper.id, slug: paper.slug };
      } catch (insertErr: any) {
        lastInsertError = insertErr;
        console.warn(`Paper insertion attempt ${attempt + 1} failed:`, insertErr);
        // Only a slug collision is worth retrying with a new slug. A missing
        // column or a failed foreign key will fail identically every time, so
        // retrying just delays a misleading "could not be created" message.
        if (!isSlugConflict(insertErr)) break;
        candidateSlug = `${baseSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }

    const [matching] = await db
      .select({ id: papersTable.id, slug: papersTable.slug })
      .from(papersTable)
      .where(or(
        eq(papersTable.sourceSubmissionId, submission.id),
        ilike(papersTable.title, (submission.title || "").trim())
      ))
      .limit(1);

    if (matching) {
      await db.update(papersTable).set({
        sourceSubmissionId: submission.id,
        status: "PUBLISHED",
        deletedAt: null,
        updatedAt: new Date(),
      }).where(eq(papersTable.id, matching.id));
      return { kind, status: "existing", id: matching.id, slug: matching.slug };
    }

    throw publicationFailure("paper", lastInsertError);
  }

  let [existing] = await db
    .select({ id: articlesTable.id, slug: articlesTable.slug, status: articlesTable.status, deletedAt: articlesTable.deletedAt })
    .from(articlesTable)
    .where(eq(articlesTable.sourceSubmissionId, submission.id))
    .limit(1);

  if (!existing && allowCreate && submission.title) {
    const baseSlug = slugify(submission.title);
    const [candidate] = await db
      .select({ id: articlesTable.id, slug: articlesTable.slug, status: articlesTable.status, deletedAt: articlesTable.deletedAt })
      .from(articlesTable)
      .where(or(
        eq(articlesTable.slug, baseSlug),
        ilike(articlesTable.title, submission.title.trim())
      ))
      .limit(1);
    if (candidate) existing = candidate;
  }

  if (existing) {
    if (existing.deletedAt && !allowCreate) {
      return { kind, status: "skipped", id: existing.id, slug: existing.slug, reason: "publication-trashed" };
    }
    if (!existing.deletedAt && existing.status !== "PUBLISHED" && !allowCreate) {
      return { kind, status: "skipped", id: existing.id, slug: existing.slug, reason: "publication-not-public" };
    }
    const restoredFromTrash = Boolean(existing.deletedAt);
    const categorySlug = await resolveCategorySlug(
      options.categorySlug || getSubmissionDomain(submission) || "archive",
    );
    const publishedAt = options.publishedAt || submission.publishedAt || submission.updatedAt || new Date();
    const body = sanitizeArticleBody(submission.body || submission.abstract || submission.title || "No body content provided.");
    const authorName = submission.submitterName || "Anonymous Scholar";
    const coverImageUrl = getSubmissionCoverImage(submission) || "/images/provided/home-falcon-city-panorama-hero.jpg";
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
        deletedAt: null,
        sourceSubmissionId: submission.id,
        updatedAt: new Date(),
      })
      .where(eq(articlesTable.id, existing.id));
    return {
      kind,
      status: restoredFromTrash ? "restored" : "existing",
      id: existing.id,
      slug: existing.slug,
    };
  }

  if (!allowCreate) {
    return { kind, status: "skipped", reason: "publication-not-linked" };
  }

  const categorySlug = await resolveCategorySlug(
    options.categorySlug || getSubmissionDomain(submission) || "archive",
  );
  const baseSlug = slugify(submission.title || "untitled-submission");
  const publishedAt = options.publishedAt || submission.publishedAt || submission.updatedAt || new Date();
  const body = sanitizeArticleBody(submission.body || submission.abstract || submission.title || "No body content provided.");
  const authorName = submission.submitterName || "Anonymous Scholar";
  const coverImageUrl = getSubmissionCoverImage(submission) || "/images/provided/home-falcon-city-panorama-hero.jpg";
  let candidateSlug = await uniqueArticleSlug(baseSlug, submission.id);
  let lastInsertError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [article] = await db
        .insert(articlesTable)
        .values({
          slug: candidateSlug,
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
          sourceSubmissionId: submission.id,
        })
        .returning({ id: articlesTable.id, slug: articlesTable.slug });

      if (article) return { kind, status: "created", id: article.id, slug: article.slug };
    } catch (insertErr: any) {
      lastInsertError = insertErr;
      console.warn(`Article insertion attempt ${attempt + 1} failed:`, insertErr);
      if (!isSlugConflict(insertErr)) break;
      candidateSlug = `${baseSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  const [matching] = await db
    .select({ id: articlesTable.id, slug: articlesTable.slug })
    .from(articlesTable)
    .where(or(
      eq(articlesTable.sourceSubmissionId, submission.id),
      ilike(articlesTable.title, (submission.title || "").trim())
    ))
    .limit(1);

  if (matching) {
    await db.update(articlesTable).set({
      sourceSubmissionId: submission.id,
      status: "PUBLISHED",
      deletedAt: null,
      updatedAt: new Date(),
    }).where(eq(articlesTable.id, matching.id));
    return { kind, status: "existing", id: matching.id, slug: matching.slug };
  }

  throw publicationFailure("article", lastInsertError);
}

/**
 * Push an author's edit of a live article or paper back onto the submission it
 * came from. Without this the next reconciliation pass would copy the stale
 * submission text over the edit and the change would appear to un-save itself.
 */
export async function syncSubmissionFromPublication(
  publication: any,
  kind: PublicationKind,
): Promise<boolean> {
  const submissionId = publication?.sourceSubmissionId;
  if (!submissionId) return false;

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (publication.title) updates.title = publication.title;
  if (publication.authorName) updates.submitterName = publication.authorName;
  if (publication.categorySlug) updates.domain = normalizeCategorySlug(publication.categorySlug);
  if (typeof publication.body === "string") updates.body = publication.body;

  if (kind === "paper") {
    if (typeof publication.abstract === "string") updates.abstract = publication.abstract;
    if (publication.coverImageUrl !== undefined) updates.coverImageUrl = publication.coverImageUrl;
    if (publication.pdfUrl !== undefined) updates.manuscriptUrl = publication.pdfUrl;
  } else {
    if (typeof publication.excerpt === "string") updates.abstract = publication.excerpt;
    if (publication.heroImageUrl !== undefined) updates.coverImageUrl = publication.heroImageUrl;
    if (publication.audioUrl !== undefined) updates.audioUrl = publication.audioUrl;
  }

  const [updated] = await db
    .update(submissionsTable)
    .set(updates)
    .where(eq(submissionsTable.id, submissionId))
    .returning({ id: submissionsTable.id });

  return Boolean(updated);
}

export async function unpublishPublicPublicationForSubmission(submissionId: string) {
  const now = new Date();
  const [article] = await db
    .update(articlesTable)
    .set({ status: "ARCHIVED", updatedAt: now })
    .where(and(eq(articlesTable.sourceSubmissionId, submissionId), isNull(articlesTable.deletedAt)))
    .returning({ id: articlesTable.id });
  const [paper] = await db
    .update(papersTable)
    .set({ status: "ARCHIVED", updatedAt: now })
    .where(and(eq(papersTable.sourceSubmissionId, submissionId), isNull(papersTable.deletedAt)))
    .returning({ id: papersTable.id });
  return { articleId: article?.id, paperId: paper?.id };
}

export async function syncPublishedSubmissions() {
  await ensureDefaultCategories();

  const publishedSubmissions = await db
    .select()
    .from(submissionsTable)
    .where(and(
      inArray(submissionsTable.status, [...PUBLIC_SUBMISSION_STATUSES]),
      isNull(submissionsTable.deletedAt),
    ));

  const summary = {
    checked: publishedSubmissions.length,
    updatedArticles: 0,
    updatedPapers: 0,
    skipped: 0,
  };

  for (const submission of publishedSubmissions) {
    const result = await ensurePublicPublicationForSubmission(submission, { allowCreate: false });
    if (result.status === "existing" && result.kind === "article") summary.updatedArticles += 1;
    if (result.status === "existing" && result.kind === "paper") summary.updatedPapers += 1;
    if (result.status === "skipped") summary.skipped += 1;
  }

  return summary;
}

/**
 * Rebuild the public article or paper for every submission an editor has
 * already marked PUBLISHED but whose public record is missing — the state an
 * earlier silent publish failure leaves behind.
 *
 * This deliberately does *not* publish ACCEPTED work, invent titles, or rename
 * authors. An earlier revision force-published submissions whose title matched
 * two hardcoded strings and rewrote every author name to a single person; that
 * put unreviewed work on the public site under the wrong byline.
 */
export async function repairMissingPublications(): Promise<{
  checked: number;
  repaired: Array<{ submissionId: string; kind: PublicationKind | null; slug?: string }>;
  failed: Array<{ submissionId: string; reason: string }>;
}> {
  const result = {
    checked: 0,
    repaired: [] as Array<{ submissionId: string; kind: PublicationKind | null; slug?: string }>,
    failed: [] as Array<{ submissionId: string; reason: string }>,
  };

  await ensureDefaultCategories();

  const publishedSubmissions = await db
    .select()
    .from(submissionsTable)
    .where(and(
      inArray(submissionsTable.status, [...PUBLIC_SUBMISSION_STATUSES]),
      isNull(submissionsTable.deletedAt),
    ));

  result.checked = publishedSubmissions.length;

  for (const submission of publishedSubmissions) {
    try {
      const publication = await ensurePublicPublicationForSubmission(submission, {
        allowCreate: true,
        publishedAt: submission.publishedAt || undefined,
        categorySlug: submission.domain || undefined,
      });
      if (publication.status === "created" || publication.status === "restored") {
        result.repaired.push({
          submissionId: submission.id,
          kind: publication.kind,
          slug: publication.slug,
        });
      }
    } catch (err: any) {
      result.failed.push({ submissionId: submission.id, reason: err?.message || String(err) });
    }
  }

  return result;
}
