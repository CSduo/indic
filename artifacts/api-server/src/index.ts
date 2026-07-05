import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { submissionsTable, articlesTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Background database sync to auto-generate missing public articles for published submissions
async function syncPublishedArticles() {
  try {
    logger.info("Starting background published articles database sync...");
    const publishedSubmissions = await db.select()
      .from(submissionsTable)
      .where(eq(submissionsTable.status, "PUBLISHED"));

    logger.info(`Sync: Found ${publishedSubmissions.length} published submissions in DB. Verifying sync...`);

    for (const sub of publishedSubmissions) {
      const [existing] = await db.select({ id: articlesTable.id })
        .from(articlesTable)
        .where(eq(articlesTable.submissionId, sub.id))
        .limit(1);

      if (!existing) {
        logger.info(`Sync: Re-creating missing public article for "${sub.title}" (submission: ${sub.id})`);
        
        let catSlug = "philosophy";
        if (sub.domain) {
          const normalized = sub.domain.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
          const knownSlugs = [
            "philosophy","history","psychology","sociology","science","geopolitics",
            "civilizational-thought","aesthetics","sanskrit-studies","political-theory",
            "translations","multimedia","papers","archive"
          ];
          if (knownSlugs.includes(normalized)) {
            catSlug = normalized;
          } else if (normalized === "civilization" || normalized === "civilisations" || normalized === "civilizations") {
            catSlug = "civilizational-thought";
          } else if (normalized === "sanskrit") {
            catSlug = "sanskrit-studies";
          } else {
            catSlug = "archive";
          }
        }

        // Verify category exists
        const [catRow] = await db.select().from(categoriesTable)
          .where(eq(categoriesTable.slug, catSlug)).limit(1);
        if (!catRow) {
          const [fallback] = await db.select().from(categoriesTable)
            .orderBy(categoriesTable.sortOrder).limit(1);
          if (fallback) catSlug = fallback.slug;
        }

        const baseSlug = sub.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const uniqueSlug = `${baseSlug}-${Date.now()}`;

        let heroImageUrl = sub.coverImageUrl || null;
        if (!heroImageUrl && sub.notes) {
          const imgMatch = sub.notes.match(/Cover(?:\s*image)?(?:\s*URL)?:\s*(https?:\/\/\S+|\/api\/uploads\/\S+)/i);
          if (imgMatch) heroImageUrl = imgMatch[1].trim();
        }

        await db.insert(articlesTable).values({
          slug: uniqueSlug,
          title: sub.title,
          subtitle: null,
          excerpt: sub.abstract || "",
          body: sub.body || sub.abstract || "",
          categorySlug: catSlug,
          tags: [],
          authorName: sub.submitterName,
          heroImageUrl,
          heroImageAlt: sub.title,
          keyTakeaways: [],
          status: "PUBLISHED",
          featured: false,
          publishedAt: sub.updatedAt || new Date(),
          submissionId: sub.id,
        });
      }
    }
    logger.info("Published articles database synchronization completed.");
  } catch (err) {
    logger.error({ err }, "Error running background published articles synchronization");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // Trigger database sync asynchronously on startup
  syncPublishedArticles();
});
