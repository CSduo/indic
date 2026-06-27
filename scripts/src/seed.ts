/**
 * Seed script — run with:
 *   pnpm --filter scripts exec tsx src/seed.ts
 *
 * Creates 14 categories (matching domainMeta.ts) + a sample admin account.
 * Safe to run multiple times — uses insert-or-ignore pattern.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcryptjs from "bcryptjs";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const CATEGORIES = [
  { slug: "philosophy",              name: "Philosophy",              icon: "owl",     sortOrder: 1,  description: "Explore reality, self, truth, ethics, logic, and the examined life." },
  { slug: "history",                 name: "History",                 icon: "horse",   sortOrder: 2,  description: "Civilizational memory — events, epochs, and the forces that shaped the world." },
  { slug: "psychology",              name: "Psychology",              icon: "butterfly", sortOrder: 3, description: "Mind, behaviour, consciousness, and the inner architecture of the self." },
  { slug: "sociology",               name: "Sociology",               icon: "bee",     sortOrder: 4,  description: "Society, culture, structures of power, and collective human behaviour." },
  { slug: "science",                 name: "Science",                 icon: "snake",   sortOrder: 5,  description: "Nature, cosmos, method, and the empirical quest for understanding." },
  { slug: "geopolitics",             name: "Geopolitics",             icon: "eagle",   sortOrder: 6,  description: "Power, territory, civilizations, and the geography of political conflict." },
  { slug: "civilizational-thought",  name: "Civilizational Thought",  icon: "lotus",   sortOrder: 7,  description: "The rise, decline, and memory of great civilizations across time." },
  { slug: "aesthetics",              name: "Aesthetics & Arts",       icon: "peacock", sortOrder: 8,  description: "Beauty, art, literature, music, and the forms of human expression." },
  { slug: "sanskrit-studies",        name: "Sanskrit Studies",        icon: "swan",    sortOrder: 9,  description: "Sanskrit texts, classical grammar, Vedic literature, and related traditions." },
  { slug: "political-theory",        name: "Political Theory",        icon: "lion",    sortOrder: 10, description: "Statecraft, constitutions, justice, authority, and the philosophy of governance." },
  { slug: "translations",            name: "Translations",            icon: "ibis",    sortOrder: 11, description: "Classical and modern texts brought into living language and contemporary thought." },
  { slug: "multimedia",              name: "Arts & Literature",       icon: "deer",    sortOrder: 12, description: "Essays at the intersection of visual culture, literature, and creative inquiry." },
  { slug: "papers",                  name: "Research Papers",         icon: "crane",   sortOrder: 13, description: "Peer-reviewed and working papers from researchers across disciplines." },
  { slug: "archive",                 name: "Archive",                 icon: "tortoise", sortOrder: 14, description: "The complete archive of published essays, papers, and curated collections." },
];

async function seed() {
  console.log("🌱 Seeding categories...");

  for (const cat of CATEGORIES) {
    try {
      await pool.query(
        `INSERT INTO categories (id, slug, name, description, icon, sort_order, visible, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, now(), now())
         ON CONFLICT (slug) DO NOTHING`,
        [cat.slug, cat.name, cat.description, cat.icon, cat.sortOrder]
      );
      console.log(`  ✓ ${cat.name}`);
    } catch (err: any) {
      console.error(`  ✗ ${cat.name}: ${err.message}`);
    }
  }

  // Seed admin from env
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && (adminPasswordHash || adminPassword)) {
    console.log("\n🔐 Seeding admin account...");
    const hash = adminPasswordHash || await bcryptjs.hash(adminPassword!, 12);
    try {
      await pool.query(
        `INSERT INTO admins (id, email, password, name, role, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'System Admin', 'ADMIN', now(), now())
         ON CONFLICT (email) DO NOTHING`,
        [adminEmail.toLowerCase(), hash]
      );
      console.log(`  ✓ Admin: ${adminEmail}`);
    } catch (err: any) {
      console.error(`  ✗ Admin: ${err.message}`);
    }
  } else {
    console.log("\n⚠️  Skipping admin seed — set ADMIN_EMAIL + ADMIN_PASSWORD_HASH in .env");
  }

  await pool.end();
  console.log("\n✅ Seed complete.");
}

seed().catch(err => {
  console.error(err);
  pool.end();
  process.exit(1);
});
