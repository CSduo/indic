import { db } from "../lib/db/src/index";
import { submissionsTable, articlesTable, papersTable } from "../lib/db/src/schema/index";
import { eq } from "drizzle-orm";

async function checkSubmissions() {
  try {
    const userId = "f6200aac-6489-49df-94d8-301aa3539557";
    
    console.log("Checking submissions for user:", userId);
    const userSubmissions = await db.select()
      .from(submissionsTable)
      .where(eq(submissionsTable.userId, userId));

    console.log(`Found ${userSubmissions.length} submissions:`);
    for (const sub of userSubmissions) {
      console.log(`- ID: ${sub.id}, Title: "${sub.title}", Status: ${sub.status}, Type: ${sub.type}, Domain: ${sub.domain}, Deleted: ${sub.deleted}`);
    }

    console.log("\nChecking articles in database:");
    const allArticles = await db.select().from(articlesTable);
    console.log(`Total articles in DB: ${allArticles.length}`);
    for (const art of allArticles) {
      if (art.submissionId || art.authorName?.toLowerCase().includes("chaitanya")) {
        console.log(`- Article ID: ${art.id}, Title: "${art.title}", Status: ${art.status}, SubmissionId: ${art.submissionId}, Author: ${art.authorName}, Deleted: ${art.deleted}`);
      }
    }

    console.log("\nChecking papers in database:");
    const allPapers = await db.select().from(papersTable);
    console.log(`Total papers in DB: ${allPapers.length}`);
    for (const pap of allPapers) {
      if (pap.submissionId || pap.authorName?.toLowerCase().includes("chaitanya")) {
        console.log(`- Paper ID: ${pap.id}, Title: "${pap.title}", Status: ${pap.status}, SubmissionId: ${pap.submissionId}, Author: ${pap.authorName}, Deleted: ${pap.deleted}`);
      }
    }
  } catch (err) {
    console.error("Error checking submissions:", err);
  } finally {
    process.exit(0);
  }
}

checkSubmissions();
