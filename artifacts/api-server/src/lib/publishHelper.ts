import { db } from "@workspace/db";
import { submissionsTable, articlesTable, papersTable, categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

// Helper to normalize category/domain slugs consistently
export function normalizeCategorySlug(domain: string | null | undefined): string {
  if (!domain) return "philosophy";
  const normalized = domain.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  
  const knownSlugs = [
    "philosophy", "history", "psychology", "sociology", "science", "geopolitics",
    "civilizational-thought", "aesthetics", "sanskrit-studies", "political-theory",
    "translations", "multimedia", "papers", "archive"
  ];

  if (knownSlugs.includes(normalized)) return normalized;
  if (normalized === "civilization" || normalized === "civilisations" || normalized === "civilizations") {
    return "civilizational-thought";
  }
  if (normalized === "sanskrit") {
    return "sanskrit-studies";
  }
  return "archive";
}

// Reusable function to publish a submission to articlesTable or papersTable
export async function publishSubmission(submissionId: string, categoryOverride?: string) {
  const [submission] = await db.select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, submissionId))
    .limit(1);

  if (!submission) throw new Error("Submission not found");

  // Determine normalized category slug
  let catSlug = categoryOverride || normalizeCategorySlug(submission.domain);

  // Verify category exists in DB; fallback to first available if not found
  const [catRow] = await db.select().from(categoriesTable)
    .where(eq(categoriesTable.slug, catSlug)).limit(1);
  if (!catRow) {
    const [fallback] = await db.select().from(categoriesTable)
      .orderBy(categoriesTable.sortOrder).limit(1);
    if (fallback) catSlug = fallback.slug;
  }

  const baseSlug = submission.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const uniqueSlug = `${baseSlug}-${Date.now()}`;

  // Extract cover image
  let heroImageUrl = submission.coverImageUrl || null;
  if (!heroImageUrl && submission.notes) {
    const imgMatch = submission.notes.match(/Cover(?:\s*image)?(?:\s*URL)?:\s*(https?:\/\/\S+|\/api\/uploads\/\S+)/i);
    if (imgMatch) heroImageUrl = imgMatch[1].trim();
  }

  const isPaper = submission.type === "PAPER";

  if (isPaper) {
    // Check if duplicate exists in papersTable
    const [existing] = await db.select({ id: papersTable.id })
      .from(papersTable)
      .where(eq(papersTable.submissionId, submission.id))
      .limit(1);

    if (!existing) {
      await db.insert(papersTable).values({
        slug: uniqueSlug,
        title: submission.title,
        abstract: submission.abstract,
        body: submission.body || submission.abstract || "",
        categorySlug: catSlug,
        tags: [],
        authorName: submission.submitterName,
        coverImageUrl: heroImageUrl,
        pdfUrl: submission.manuscriptUrl,
        paperType: "RESEARCH_PAPER",
        status: "PUBLISHED",
        publishedAt: new Date(),
        submissionId: submission.id,
      });
    } else {
      // Update existing paper if needed
      await db.update(papersTable).set({
        title: submission.title,
        abstract: submission.abstract,
        body: submission.body || submission.abstract || "",
        categorySlug: catSlug,
        authorName: submission.submitterName,
        coverImageUrl: heroImageUrl,
        pdfUrl: submission.manuscriptUrl,
        updatedAt: new Date(),
      }).where(eq(papersTable.id, existing.id));
    }
  } else {
    // Check if duplicate exists in articlesTable
    const [existing] = await db.select({ id: articlesTable.id })
      .from(articlesTable)
      .where(eq(articlesTable.submissionId, submission.id))
      .limit(1);

    if (!existing) {
      await db.insert(articlesTable).values({
        slug: uniqueSlug,
        title: submission.title,
        subtitle: null,
        excerpt: submission.abstract || "",
        body: submission.body || submission.abstract || "",
        categorySlug: catSlug,
        tags: [],
        authorName: submission.submitterName,
        heroImageUrl,
        heroImageAlt: submission.title,
        keyTakeaways: [],
        status: "PUBLISHED",
        featured: false,
        publishedAt: new Date(),
        submissionId: submission.id,
      });
    } else {
      // Update existing article if needed
      await db.update(articlesTable).set({
        title: submission.title,
        excerpt: submission.abstract || "",
        body: submission.body || submission.abstract || "",
        categorySlug: catSlug,
        authorName: submission.submitterName,
        heroImageUrl,
        updatedAt: new Date(),
      }).where(eq(articlesTable.id, existing.id));
    }
  }
}

// Function to synchronize and heal all published submissions that are missing public articles/papers
export async function syncPublishedArchives() {
  const publishedSubmissions = await db.select()
    .from(submissionsTable)
    .where(eq(submissionsTable.status, "PUBLISHED"));

  let syncedCount = 0;
  for (const sub of publishedSubmissions) {
    try {
      const isPaper = sub.type === "PAPER";
      let hasRecord = false;

      if (isPaper) {
        const [existing] = await db.select({ id: papersTable.id })
          .from(papersTable)
          .where(eq(papersTable.submissionId, sub.id))
          .limit(1);
        hasRecord = !!existing;
      } else {
        const [existing] = await db.select({ id: articlesTable.id })
          .from(articlesTable)
          .where(eq(articlesTable.submissionId, sub.id))
          .limit(1);
        hasRecord = !!existing;
      }

      if (!hasRecord) {
        await publishSubmission(sub.id);
        syncedCount++;
      }
    } catch (e) {
      console.error(`Failed to sync published submission ${sub.id}:`, e);
    }
  }
  return syncedCount;
}
