ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "source_submission_id" text;
ALTER TABLE "papers" ADD COLUMN IF NOT EXISTS "source_submission_id" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_source_submission_id_fkey'
  ) THEN
    ALTER TABLE "articles"
      ADD CONSTRAINT "articles_source_submission_id_fkey"
      FOREIGN KEY ("source_submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'papers_source_submission_id_fkey'
  ) THEN
    ALTER TABLE "papers"
      ADD CONSTRAINT "papers_source_submission_id_fkey"
      FOREIGN KEY ("source_submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "articles_source_submission_id_idx"
  ON "articles" ("source_submission_id");
CREATE UNIQUE INDEX IF NOT EXISTS "papers_source_submission_id_idx"
  ON "papers" ("source_submission_id");
