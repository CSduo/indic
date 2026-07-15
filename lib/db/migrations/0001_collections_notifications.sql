CREATE TABLE IF NOT EXISTS "collections" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "collections_user_idx" ON "collections" ("user_id");

CREATE TABLE IF NOT EXISTS "collection_items" (
  "id" text PRIMARY KEY NOT NULL,
  "collection_id" text NOT NULL REFERENCES "collections"("id") ON DELETE CASCADE,
  "item_type" "item_type" NOT NULL,
  "item_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "collection_items_unique"
  ON "collection_items" ("collection_id", "item_type", "item_id");
CREATE INDEX IF NOT EXISTS "collection_items_collection_idx"
  ON "collection_items" ("collection_id");

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(80) DEFAULT 'SYSTEM' NOT NULL,
  "message" text NOT NULL,
  "href" text,
  "read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("user_id", "read");
