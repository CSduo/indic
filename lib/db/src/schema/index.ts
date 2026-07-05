import {
  pgTable, text, varchar, boolean, integer, timestamp, jsonb,
  uniqueIndex, index, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Enums
export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);
export const adminRoleEnum = pgEnum("admin_role", ["ADMIN", "EDITOR", "REVIEWER"]);
export const contentStatusEnum = pgEnum("content_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const submissionTypeEnum = pgEnum("submission_type", ["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]);
export const submissionStatusEnum = pgEnum("submission_status", ["DRAFT", "RECEIVED", "UNDER_REVIEW", "REVISION_REQUESTED", "ACCEPTED", "REJECTED", "PUBLISHED", "ARCHIVED"]);
export const paperTypeEnum = pgEnum("paper_type", ["RESEARCH_PAPER", "WORKING_PAPER", "REVIEW_ESSAY", "MONOGRAPH", "TRANSLATION", "ARCHIVAL_NOTE"]);
export const fileCategoryEnum = pgEnum("file_category", ["MANUSCRIPT", "COVER", "SUPPORTING", "SUPPLEMENTARY"]);
export const priorityEnum = pgEnum("priority", ["LOW", "NORMAL", "HIGH", "URGENT"]);
export const itemTypeEnum = pgEnum("item_type", ["ARTICLE", "PAPER"]);

// Users
export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: text("name"),
  password: text("password"),
  role: roleEnum("role").notNull().default("USER"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  institution: text("institution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admins
export const adminsTable = pgTable("admins", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: adminRoleEnum("role").notNull().default("ADMIN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Categories
export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Articles
export const articlesTable = pgTable("articles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  excerpt: text("excerpt"),
  body: text("body").notNull().default(""),
  categorySlug: varchar("category_slug", { length: 100 }).notNull().references(() => categoriesTable.slug),
  tags: text("tags").array().notNull().default([]),
  authorName: text("author_name"),
  readingMinutes: integer("reading_minutes"),
  heroImageUrl: text("hero_image_url"),
  heroImageAlt: text("hero_image_alt"),
  keyTakeaways: text("key_takeaways").array().notNull().default([]),
  references: jsonb("references").notNull().default([]),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  audioUrl: text("audio_url"),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  featured: boolean("featured").notNull().default(false),
  deleted: boolean("deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  submissionId: text("submission_id"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("articles_status_idx").on(t.status),
  index("articles_category_idx").on(t.categorySlug),
  index("articles_published_at_idx").on(t.publishedAt),
  index("articles_deleted_idx").on(t.deleted),
]);

// Papers
export const papersTable = pgTable("papers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  title: text("title").notNull(),
  abstract: text("abstract"),
  body: text("body").notNull().default(""),
  categorySlug: varchar("category_slug", { length: 100 }).notNull().references(() => categoriesTable.slug),
  tags: text("tags").array().notNull().default([]),
  authorName: text("author_name"),
  readingMinutes: integer("reading_minutes"),
  pdfUrl: text("pdf_url"),
  coverImageUrl: text("cover_image_url"),
  citationText: text("citation_text"),
  references: jsonb("references").notNull().default([]),
  peerReviewed: boolean("peer_reviewed").notNull().default(false),
  paperType: paperTypeEnum("paper_type").notNull().default("RESEARCH_PAPER"),
  year: integer("year"),
  doi: text("doi"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at"),
  submissionId: text("submission_id"),
  deleted: boolean("deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("papers_status_idx").on(t.status),
  index("papers_category_idx").on(t.categorySlug),
  index("papers_deleted_idx").on(t.deleted),
]);

// Submissions
export const submissionsTable = pgTable("submissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => usersTable.id),
  submitterName: varchar("submitter_name", { length: 160 }).notNull(),
  submitterEmail: varchar("submitter_email", { length: 255 }).notNull(),
  type: submissionTypeEnum("type").notNull(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  body: text("body"),
  notes: text("notes"),
  domain: varchar("domain", { length: 150 }),
  manuscriptUrl: text("manuscript_url"),
  manuscriptPublicId: text("manuscript_public_id"),
  manuscriptResourceType: text("manuscript_resource_type"),
  coverImageUrl: text("cover_image_url"),
  coverImagePublicId: text("cover_image_public_id"),
  coverImageResourceType: text("cover_image_resource_type"),
  consent: boolean("consent").notNull().default(false),
  status: submissionStatusEnum("status").notNull().default("RECEIVED"),
  priority: priorityEnum("priority").notNull().default("NORMAL"),
  assignedEditorId: text("assigned_editor_id"),
  editorNotes: text("editor_notes"),
  deleted: boolean("deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comments
export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  articleId: text("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  parentId: text("parent_id"), // null = top-level comment, set = reply
  authorName: varchar("author_name", { length: 160 }).notNull(),
  authorEmail: varchar("author_email", { length: 255 }),
  content: text("content").notNull(),
  approved: boolean("approved").notNull().default(false),
  deleted: boolean("deleted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("comments_article_idx").on(t.articleId),
  index("comments_approved_idx").on(t.approved),
  index("comments_parent_idx").on(t.parentId),
]);

// Newsletter subscribers
export const newsletterSubscribersTable = pgTable("newsletter_subscribers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: text("name"),
  userId: text("user_id").references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Saved items
export const savedItemsTable = pgTable("saved_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  itemType: itemTypeEnum("item_type").notNull(),
  itemId: text("item_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("saved_items_unique").on(t.userId, t.itemType, t.itemId),
  index("saved_items_user_idx").on(t.userId),
]);

// Audit logs
export const auditLogsTable = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  adminId: text("admin_id").references(() => adminsTable.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Site settings
export const siteSettingsTable = pgTable("site_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Media assets
export const mediaAssetsTable = pgTable("media_assets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  url: text("url").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  extension: text("extension").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Types
export type User = typeof usersTable.$inferSelect;
export type Admin = typeof adminsTable.$inferSelect;
export type Category = typeof categoriesTable.$inferSelect;
export type Article = typeof articlesTable.$inferSelect;
export type Paper = typeof papersTable.$inferSelect;
export type Submission = typeof submissionsTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type NewsletterSubscriber = typeof newsletterSubscribersTable.$inferSelect;
export type SavedItem = typeof savedItemsTable.$inferSelect;

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaperSchema = createInsertSchema(papersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true, updatedAt: true });
