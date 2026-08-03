import fs from 'fs';
import path from 'path';
import pg from 'pg';

const rootDir = 'C:/Users/ADMIN/Documents/Codex/2026-07-15/csduo-indic-https-github-com-csduo';
const envFile = fs.readFileSync(path.join(rootDir, '.env.production.local'), 'utf8');

let dbUrl = '';
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (key === 'DATABASE_URL') dbUrl = val;
  }
});

async function main() {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  console.log('Connected to Neon DB. Updating article status to PUBLISHED...');
  const resUpdate = await client.query(`UPDATE articles SET status = 'PUBLISHED' WHERE status != 'PUBLISHED';`);
  console.log(`Updated ${resUpdate.rowCount} articles to PUBLISHED.`);

  const resArticles = await client.query(`SELECT id, slug, title, status FROM articles;`);
  console.log('Current Articles in DB:');
  resArticles.rows.forEach((r: any) => console.log(` - [${r.status}] ${r.slug}: ${r.title}`));

  const angkorSlug = 'beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia';
  const resAngkor = await client.query(`SELECT * FROM articles WHERE slug LIKE $1 OR title ILIKE '%Vietnam%';`, ['%beyond-angkor%']);

  if (resAngkor.rows.length === 0) {
    console.log('Seeding Beyond Angkor article...');
    await client.query(`
      INSERT INTO articles (id, slug, title, subtitle, excerpt, body, category_slug, author_name, reading_minutes, hero_image_url, status, published_at, created_at, updated_at)
      VALUES (
        'angkor-pub-1',
        $1,
        'Beyond Angkor: Why Is Vietnam Frequently Excluded from the History of Hindu Influence in Southeast Asia?',
        'Champa & The Forgotten Kingdoms of Central Vietnam',
        'Why, then, does Champa remain a footnote in popular narratives of Hindu Southeast Asia? Why is Vietnam, a country whose central and southern regions were home to some of the region''s most vibrant Hindu kingdoms, so frequently excluded from the story?',
        '<p>Why, then, does Champa remain a footnote in popular narratives of Hindu Southeast Asia? Why is Vietnam, a country whose central and southern regions were home to some of the region''s most vibrant Hindu kingdoms, so frequently excluded from the story? This essay covers it in depth.</p>',
        'history',
        'Xiyato Saanvi',
        8,
        'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80',
        'PUBLISHED',
        NOW(),
        NOW(),
        NOW()
      ) ON CONFLICT (id) DO NOTHING;
    `, [angkorSlug]);
  }

  const websiteSlug = 'why-this-website-exists';
  const resWebsite = await client.query(`SELECT * FROM articles WHERE slug LIKE $1 OR title ILIKE '%Why This Website%';`, ['%why-this-website%']);

  if (resWebsite.rows.length === 0) {
    console.log('Seeding Why This Website Exists article...');
    await client.query(`
      INSERT INTO articles (id, slug, title, subtitle, excerpt, body, category_slug, author_name, reading_minutes, hero_image_url, status, published_at, created_at, updated_at)
      VALUES (
        'why-website-pub-1',
        $1,
        'Why This Website Exists',
        'A Manifesto for Nuanced Indic Research',
        'This website is being built as a serious research platform for Indic thought, culture, history, philosophy, politics, and society. The goal is to create deeply written, nuanced, and well-researched articles that go beyond casual internet content.',
        '<p>This website is being built as a serious research platform for Indic thought, culture, history, philosophy, politics, and society. The goal is to create deeply written, nuanced, and well-researched articles that go beyond casual internet content. It aims to become a strong intellectual space where essays, papers, reviews, and commentaries are published with academic rigor.</p>',
        'psychology',
        'Xiyato Saanvi',
        5,
        'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
        'PUBLISHED',
        NOW(),
        NOW(),
        NOW()
      ) ON CONFLICT (id) DO NOTHING;
    `, [websiteSlug]);
  }

  const finalArticles = await client.query(`SELECT slug, title, status FROM articles;`);
  console.log('FINAL ARTICLES IN DATABASE:');
  finalArticles.rows.forEach((r: any) => console.log(` -> [${r.status}] ${r.slug}: "${r.title}"`));

  await client.end();
}

main().catch(console.error);
