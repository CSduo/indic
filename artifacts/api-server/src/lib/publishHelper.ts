import { db, submissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ensurePublicPublicationForSubmission,
  normalizeCategorySlug,
  syncPublishedSubmissions,
} from "./publication-sync";

export { normalizeCategorySlug };

export async function publishSubmission(submissionId: string, categoryOverride?: string) {
  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, submissionId))
    .limit(1);

  if (!submission) throw new Error("Submission not found");

  return ensurePublicPublicationForSubmission(submission, {
    categorySlug: categoryOverride,
  });
}

export async function syncPublishedArchives() {
  const summary = await syncPublishedSubmissions();
  return summary.createdArticles + summary.createdPapers;
}
