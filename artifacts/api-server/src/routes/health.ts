import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, usersTable, submissionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", async (_req, res) => {
  let dbReachable = false;
  let usersTableExists = false;
  let submissionsTableExists = false;
  let dbError: string | null = null;

  try {
    // Check connection reachability
    await db.execute(sql`SELECT 1`);
    dbReachable = true;

    // Check users table existence
    try {
      await db.select().from(usersTable).limit(1);
      usersTableExists = true;
    } catch (e: any) {
      console.warn("usersTable check failed:", e?.message);
    }

    // Check submissions table existence
    try {
      await db.select().from(submissionsTable).limit(1);
      submissionsTableExists = true;
    } catch (e: any) {
      console.warn("submissionsTable check failed:", e?.message);
    }
  } catch (err: any) {
    dbError = err?.message || String(err);
  }

  res.json({
    ok: dbReachable && usersTableExists && submissionsTableExists,
    service: "anvikshiki-api",
    time: new Date().toISOString(),
    environment: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      hasAdminSecret: Boolean(process.env.ADMIN_SECRET),
      hasCloudinaryUrl: Boolean(process.env.CLOUDINARY_URL),
      storageProvider: process.env.STORAGE_PROVIDER || "local",
      isVercel: Boolean(process.env.VERCEL)
    },
    database: {
      reachable: dbReachable,
      usersTableExists,
      submissionsTableExists,
      error: dbError || undefined
    }
  });
});

router.get("/health/debug-user", async (_req, res) => {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const { articlesTable, papersTable, categoriesTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const { syncPublishedArchives } = await import("../lib/publishHelper");
    const userId = "f6200aac-6489-49df-94d8-301aa3539557";

    // 1. Check existing categories
    let categoriesList = await db.select().from(categoriesTable);
    let seeded = false;

    if (categoriesList.length === 0) {
      const standardCategories = [
        { slug: "philosophy", name: "Philosophy", description: "Indic philosophical schools and thought systems", icon: "Compass", sortOrder: 1 },
        { slug: "history", name: "History", description: "Indic historical chronicles, narratives, and research", icon: "History", sortOrder: 2 },
        { slug: "psychology", name: "Psychology", description: "Mind, consciousness, and behavioral studies", icon: "Brain", sortOrder: 3 },
        { slug: "sociology", name: "Sociology", description: "Indic social structure, dynamics, and institutions", icon: "Users", sortOrder: 4 },
        { slug: "science", name: "Science", description: "Traditional Indic sciences and modern research", icon: "Atom", sortOrder: 5 },
        { slug: "geopolitics", name: "Geopolitics", description: "Indic strategic thoughts and global relationships", icon: "Globe", sortOrder: 6 },
        { slug: "civilizational-thought", name: "Civilizational Thought", description: "Foundations of civilizational identity and theory", icon: "BookOpen", sortOrder: 7 },
        { slug: "aesthetics", name: "Aesthetics", description: "Indic art, literature, poetry, and beauty theory", icon: "Palette", sortOrder: 8 },
        { slug: "sanskrit-studies", name: "Sanskrit Studies", description: "Philology, grammar, texts, and linguistics", icon: "Languages", sortOrder: 9 },
        { slug: "political-theory", name: "Political Theory", description: "Indic statecraft, governance, and polity studies", icon: "Shield", sortOrder: 10 },
        { slug: "translations", name: "Translations", description: "Translations of classical and contemporary Indic texts", icon: "FileText", sortOrder: 11 },
        { slug: "multimedia", name: "Multimedia", description: "Audio, video, and rich-media research content", icon: "Video", sortOrder: 12 },
        { slug: "papers", name: "Papers", description: "Research papers and monographs", icon: "FileSearch", sortOrder: 13 },
        { slug: "archive", name: "Archive", description: "General historical archive files and miscellaneous works", icon: "Archive", sortOrder: 14 }
      ];

      for (const cat of standardCategories) {
        await db.insert(categoriesTable).values(cat);
      }
      categoriesList = await db.select().from(categoriesTable);
      seeded = true;
    }

    // 2. Run sync
    const syncCount = await syncPublishedArchives();

    // 3. Fetch submissions, articles, papers
    const userSubmissions = await db.select().from(submissionsTable).where(eq(submissionsTable.userId, userId));
    const allArticles = await db.select().from(articlesTable);
    const allPapers = await db.select().from(papersTable);

    return res.json({
      success: true,
      seeded,
      syncCount,
      categoriesCount: categoriesList.length,
      categories: categoriesList.map(c => c.slug),
      submissions: userSubmissions,
      articles: allArticles.filter(a => a.submissionId || a.authorName?.toLowerCase().includes("chaitanya")),
      papers: allPapers.filter(p => p.submissionId || p.authorName?.toLowerCase().includes("chaitanya"))
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
});

export default router;
