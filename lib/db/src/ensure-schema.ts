/**
 * Idempotent schema repair.
 *
 * The production database predates several migrations and `drizzle-kit push` is
 * a manual step that is not part of the Vercel build. When a column that the
 * Drizzle schema knows about is missing from the live table, every query that
 * names it fails with `column ... does not exist` — which is why publishing a
 * submission, loading an article, or saving an edit returned a 500 while the
 * code itself was correct.
 *
 * Every statement below is `IF NOT EXISTS`, so running this on an already
 * up-to-date database is a no-op. It never drops or rewrites data.
 */

/** name -> ordered label list, created only when the type is absent. */
const ENUMS: Record<string, string[]> = {
  role: ["USER", "ADMIN"],
  admin_role: ["ADMIN", "EDITOR", "REVIEWER"],
  content_status: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  submission_type: ["ESSAY", "PAPER", "REVIEW", "COMMENTARY"],
  submission_status: ["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "ACCEPTED", "REJECTED", "PUBLISHED", "ARCHIVED"],
  paper_type: ["RESEARCH_PAPER", "WORKING_PAPER", "REVIEW_ESSAY", "MONOGRAPH", "TRANSLATION", "ARCHIVAL_NOTE"],
  file_category: ["MANUSCRIPT", "COVER", "SUPPORTING", "SUPPLEMENTARY"],
  priority: ["LOW", "NORMAL", "HIGH", "URGENT"],
  item_type: ["ARTICLE", "PAPER"],
};

const ENUM_STATEMENTS = Object.entries(ENUMS).map(([name, labels]) => `
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
      CREATE TYPE "${name}" AS ENUM (${labels.map(l => `'${l}'`).join(", ")});
    END IF;
  END $$;`);

// Core tables, in foreign-key order. A database that already has them is
// untouched; a brand-new one is provisioned end to end.
const TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "users" (
     "id" text PRIMARY KEY NOT NULL,
     "email" varchar(255) NOT NULL UNIQUE,
     "name" text,
     "password" text,
     "role" "role" DEFAULT 'USER' NOT NULL,
     "avatar_url" text,
     "bio" text,
     "institution" text,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "updated_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "admins" (
     "id" text PRIMARY KEY NOT NULL,
     "email" varchar(255) NOT NULL UNIQUE,
     "password" text NOT NULL,
     "name" text,
     "role" "admin_role" DEFAULT 'ADMIN' NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "updated_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "categories" (
     "id" text PRIMARY KEY NOT NULL,
     "slug" varchar(100) NOT NULL UNIQUE,
     "name" varchar(255) NOT NULL,
     "description" text,
     "icon" text,
     "sort_order" integer DEFAULT 0 NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "updated_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "submissions" (
     "id" text PRIMARY KEY NOT NULL,
     "user_id" text REFERENCES "users"("id"),
     "submitter_name" varchar(160) NOT NULL,
     "submitter_email" varchar(255) NOT NULL,
     "type" "submission_type" NOT NULL,
     "title" text NOT NULL,
     "abstract" text NOT NULL,
     "body" text,
     "domain" varchar(160),
     "notes" text,
     "manuscript_url" text,
     "manuscript_public_id" text,
     "manuscript_resource_type" text,
     "cover_image_url" text,
     "cover_image_public_id" text,
     "cover_image_resource_type" text,
     "audio_url" text,
     "audio_public_id" text,
     "consent" boolean DEFAULT false NOT NULL,
     "status" "submission_status" DEFAULT 'RECEIVED' NOT NULL,
     "priority" "priority" DEFAULT 'NORMAL' NOT NULL,
     "assigned_editor_id" text,
     "editor_notes" text,
     "published_at" timestamp,
     "deleted_at" timestamp,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "updated_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "articles" (
     "id" text PRIMARY KEY NOT NULL,
     "slug" varchar(500) NOT NULL UNIQUE,
     "title" text NOT NULL,
     "subtitle" text,
     "excerpt" text,
     "body" text DEFAULT '' NOT NULL,
     "category_slug" varchar(100) NOT NULL REFERENCES "categories"("slug"),
     "tags" text[] DEFAULT '{}' NOT NULL,
     "author_name" text,
     "reading_minutes" integer,
     "hero_image_url" text,
     "hero_image_alt" text,
     "key_takeaways" text[] DEFAULT '{}' NOT NULL,
     "references" jsonb DEFAULT '[]'::jsonb NOT NULL,
     "seo_title" text,
     "seo_description" text,
     "audio_url" text,
     "status" "content_status" DEFAULT 'DRAFT' NOT NULL,
     "featured" boolean DEFAULT false NOT NULL,
     "published_at" timestamp,
     "deleted_at" timestamp,
     "source_submission_id" text REFERENCES "submissions"("id") ON DELETE RESTRICT,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "updated_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "papers" (
     "id" text PRIMARY KEY NOT NULL,
     "slug" varchar(500) NOT NULL UNIQUE,
     "title" text NOT NULL,
     "abstract" text,
     "body" text DEFAULT '' NOT NULL,
     "category_slug" varchar(100) NOT NULL REFERENCES "categories"("slug"),
     "tags" text[] DEFAULT '{}' NOT NULL,
     "author_name" text,
     "reading_minutes" integer,
     "pdf_url" text,
     "cover_image_url" text,
     "citation_text" text,
     "references" jsonb DEFAULT '[]'::jsonb NOT NULL,
     "peer_reviewed" boolean DEFAULT false NOT NULL,
     "paper_type" "paper_type" DEFAULT 'RESEARCH_PAPER' NOT NULL,
     "year" integer,
     "doi" text,
     "seo_title" text,
     "seo_description" text,
     "status" "content_status" DEFAULT 'DRAFT' NOT NULL,
     "published_at" timestamp,
     "deleted_at" timestamp,
     "source_submission_id" text REFERENCES "submissions"("id") ON DELETE RESTRICT,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "updated_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "comments" (
     "id" text PRIMARY KEY NOT NULL,
     "article_id" text NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
     "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
     "parent_id" text,
     "author_name" varchar(160) NOT NULL,
     "author_email" varchar(255),
     "content" text NOT NULL,
     "approved" boolean DEFAULT false NOT NULL,
     "deleted" boolean DEFAULT false NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "updated_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
     "id" text PRIMARY KEY NOT NULL,
     "email" varchar(255) NOT NULL UNIQUE,
     "name" text,
     "user_id" text REFERENCES "users"("id"),
     "is_active" boolean DEFAULT true NOT NULL,
     "source" text,
     "created_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "saved_items" (
     "id" text PRIMARY KEY NOT NULL,
     "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
     "item_type" "item_type" NOT NULL,
     "item_id" text NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "audit_logs" (
     "id" text PRIMARY KEY NOT NULL,
     "admin_id" text REFERENCES "admins"("id"),
     "action" text NOT NULL,
     "entity_type" text,
     "entity_id" text,
     "metadata" jsonb,
     "ip_address" text,
     "created_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "push_subscriptions" (
     "id" text PRIMARY KEY NOT NULL,
     "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
     "endpoint" text NOT NULL UNIQUE,
     "p256dh" text NOT NULL,
     "auth" text NOT NULL,
     "user_agent" text,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "last_used_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "media_assets" (
     "id" text PRIMARY KEY NOT NULL,
     "url" text NOT NULL,
     "storage_key" text NOT NULL,
     "mime_type" text NOT NULL,
     "extension" text NOT NULL,
     "size_bytes" integer NOT NULL,
     "width" integer,
     "height" integer,
     "alt_text" text,
     "context" text,
     "created_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "site_settings" (
     "id" text PRIMARY KEY NOT NULL,
     "key" varchar(100) NOT NULL UNIQUE,
     "value" text NOT NULL,
     "description" text,
     "updated_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "notifications" (
     "id" text PRIMARY KEY NOT NULL,
     "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
     "type" varchar(80) DEFAULT 'SYSTEM' NOT NULL,
     "message" text NOT NULL,
     "href" text,
     "read" boolean DEFAULT false NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "collections" (
     "id" text PRIMARY KEY NOT NULL,
     "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
     "title" varchar(200) NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "updated_at" timestamp DEFAULT now() NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS "collection_items" (
     "id" text PRIMARY KEY NOT NULL,
     "collection_id" text NOT NULL REFERENCES "collections"("id") ON DELETE CASCADE,
     "item_type" "item_type" NOT NULL,
     "item_id" text NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   );`,
];

/** table -> "column definition" fragments appended to ADD COLUMN IF NOT EXISTS. */
const COLUMN_STATEMENTS: Record<string, string[]> = {
  users: [
    `"avatar_url" text`,
    `"bio" text`,
    `"institution" text`,
  ],
  articles: [
    `"subtitle" text`,
    `"excerpt" text`,
    `"body" text NOT NULL DEFAULT ''`,
    `"tags" text[] NOT NULL DEFAULT '{}'`,
    `"author_name" text`,
    `"reading_minutes" integer`,
    `"hero_image_url" text`,
    `"hero_image_alt" text`,
    `"key_takeaways" text[] NOT NULL DEFAULT '{}'`,
    `"references" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    `"seo_title" text`,
    `"seo_description" text`,
    `"audio_url" text`,
    `"featured" boolean NOT NULL DEFAULT false`,
    `"published_at" timestamp`,
    `"deleted_at" timestamp`,
    `"source_submission_id" text`,
  ],
  papers: [
    `"abstract" text`,
    `"body" text NOT NULL DEFAULT ''`,
    `"tags" text[] NOT NULL DEFAULT '{}'`,
    `"author_name" text`,
    `"reading_minutes" integer`,
    `"pdf_url" text`,
    `"cover_image_url" text`,
    `"citation_text" text`,
    `"references" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    `"peer_reviewed" boolean NOT NULL DEFAULT false`,
    `"year" integer`,
    `"doi" text`,
    `"seo_title" text`,
    `"seo_description" text`,
    `"published_at" timestamp`,
    `"deleted_at" timestamp`,
    `"source_submission_id" text`,
  ],
  submissions: [
    `"body" text`,
    `"domain" varchar(160)`,
    `"notes" text`,
    `"manuscript_url" text`,
    `"manuscript_public_id" text`,
    `"manuscript_resource_type" text`,
    `"cover_image_url" text`,
    `"cover_image_public_id" text`,
    `"cover_image_resource_type" text`,
    `"audio_url" text`,
    `"audio_public_id" text`,
    `"consent" boolean NOT NULL DEFAULT false`,
    `"priority" "priority" NOT NULL DEFAULT 'NORMAL'`,
    `"assigned_editor_id" text`,
    `"editor_notes" text`,
    `"published_at" timestamp`,
    `"deleted_at" timestamp`,
  ],
  categories: [
    `"description" text`,
    `"icon" text`,
    `"sort_order" integer NOT NULL DEFAULT 0`,
    `"visible" boolean NOT NULL DEFAULT true`,
  ],
};

const INDEX_STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS "articles_status_idx" ON "articles" ("status");`,
  `CREATE INDEX IF NOT EXISTS "articles_deleted_at_idx" ON "articles" ("deleted_at");`,
  `CREATE INDEX IF NOT EXISTS "articles_published_at_idx" ON "articles" ("published_at");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "articles_source_submission_id_idx" ON "articles" ("source_submission_id");`,
  `CREATE INDEX IF NOT EXISTS "papers_status_idx" ON "papers" ("status");`,
  `CREATE INDEX IF NOT EXISTS "papers_deleted_at_idx" ON "papers" ("deleted_at");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "papers_source_submission_id_idx" ON "papers" ("source_submission_id");`,
  `CREATE INDEX IF NOT EXISTS "submissions_deleted_at_idx" ON "submissions" ("deleted_at");`,
  `CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");`,
  `CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" ("user_id");`,
  `CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("user_id", "read");`,
  `CREATE INDEX IF NOT EXISTS "articles_category_idx" ON "articles" ("category_slug");`,
  `CREATE INDEX IF NOT EXISTS "papers_category_idx" ON "papers" ("category_slug");`,
  `CREATE INDEX IF NOT EXISTS "comments_article_idx" ON "comments" ("article_id");`,
  `CREATE INDEX IF NOT EXISTS "comments_approved_idx" ON "comments" ("approved");`,
  `CREATE INDEX IF NOT EXISTS "comments_parent_idx" ON "comments" ("parent_id");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "saved_items_unique" ON "saved_items" ("user_id", "item_type", "item_id");`,
  `CREATE INDEX IF NOT EXISTS "saved_items_user_idx" ON "saved_items" ("user_id");`,
  `CREATE INDEX IF NOT EXISTS "collections_user_idx" ON "collections" ("user_id");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "collection_items_unique" ON "collection_items" ("collection_id", "item_type", "item_id");`,
  `CREATE INDEX IF NOT EXISTS "collection_items_collection_idx" ON "collection_items" ("collection_id");`,
];

export type SchemaRepairReport = {
  applied: number;
  failed: Array<{ statement: string; error: string }>;
  /** True when the repair was skipped because the database already matched. */
  skipped?: boolean;
};

/** Key in `site_settings` holding the fingerprint of the last applied repair. */
export const SCHEMA_MARKER_KEY = "schema_repair_fingerprint";

/**
 * Cheap deterministic fingerprint of the statement list. Changing, adding, or
 * removing any statement changes this value, which is what triggers a re-run.
 */
export function schemaFingerprint(): string {
  const source = schemaRepairStatements().join("\n");
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) + hash + source.charCodeAt(i)) | 0;
  }
  return `v1-${(hash >>> 0).toString(36)}-${source.length}`;
}

/** Every repair statement, in dependency order. */
export function schemaRepairStatements(): string[] {
  return [
    ...ENUM_STATEMENTS,
    ...TABLE_STATEMENTS,
    ...Object.entries(COLUMN_STATEMENTS).flatMap(([table, columns]) =>
      columns.map(column => `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${column};`),
    ),
    ...INDEX_STATEMENTS,
  ];
}

/**
 * Run every repair statement through `execute`. Individual failures are
 * collected rather than thrown: one unsupported statement must not stop the
 * rest of the repair, and it must never take the API down.
 */
export async function runSchemaRepair(
  execute: (statement: string) => Promise<unknown>,
): Promise<SchemaRepairReport> {
  const report: SchemaRepairReport = { applied: 0, failed: [] };

  for (const statement of schemaRepairStatements()) {
    try {
      await execute(statement);
      report.applied += 1;
    } catch (err: any) {
      report.failed.push({
        statement: statement.replace(/\s+/g, " ").slice(0, 160),
        error: err?.message || String(err),
      });
    }
  }

  return report;
}
