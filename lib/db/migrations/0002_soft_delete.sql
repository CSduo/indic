ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "papers" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

CREATE INDEX IF NOT EXISTS "articles_deleted_at_idx" ON "articles" ("deleted_at");
CREATE INDEX IF NOT EXISTS "papers_deleted_at_idx" ON "papers" ("deleted_at");
CREATE INDEX IF NOT EXISTS "submissions_deleted_at_idx" ON "submissions" ("deleted_at");
