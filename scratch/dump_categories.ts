import { db } from "../lib/db/src/index";

async function main() {
  try {
    const cats = await db.execute("SELECT * FROM categories ORDER BY sort_order");
    console.log("--- CATEGORIES ---");
    console.log(cats.rows);

    const arts = await db.execute("SELECT id, title, category_slug, status, deleted FROM articles LIMIT 10");
    console.log("--- ARTICLES ---");
    console.log(arts.rows);

    const subs = await db.execute("SELECT id, title, domain, status, deleted FROM submissions LIMIT 10");
    console.log("--- SUBMISSIONS ---");
    console.log(subs.rows);
  } catch (e) {
    console.error(e);
  }
}

main().catch(console.error);
