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
  publishedAt: timestamp("published_at"),
  deletedAt: timestamp("deleted_at"),
  sourceSubmissionId: text("source_submission_id").references(() => submissionsTable.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("articles_status_idx").on(t.status),
  index("articles_category_idx").on(t.categorySlug),
  index("articles_published_at_idx").on(t.publishedAt),
  index("articles_deleted_at_idx").on(t.deletedAt),
  uniqueIndex("articles_source_submission_id_idx").on(t.sourceSubmissionId),
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
  deletedAt: timestamp("deleted_at"),
  sourceSubmissionId: text("source_submission_id").references(() => submissionsTable.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("papers_status_idx").on(t.status),
  index("papers_category_idx").on(t.categorySlug),
  index("papers_deleted_at_idx").on(t.deletedAt),
  uniqueIndex("papers_source_submission_id_idx").on(t.sourceSubmissionId),
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
  domain: varchar("domain", { length: 160 }),
  notes: text("notes"),
  manuscriptUrl: text("manuscript_url"),
  manuscriptPublicId: text("manuscript_public_id"),
  manuscriptResourceType: text("manuscript_resource_type"),
  coverImageUrl: text("cover_image_url"),
  coverImagePublicId: text("cover_image_public_id"),
  coverImageResourceType: text("cover_image_resource_type"),
  audioUrl: text("audio_url"),
  audioPublicId: text("audio_public_id"),
  consent: boolean("consent").notNull().default(false),
  status: submissionStatusEnum("status").notNull().default("RECEIVED"),
  priority: priorityEnum("priority").notNull().default("NORMAL"),
  assignedEditorId: text("assigned_editor_id"),
  editorNotes: text("editor_notes"),
  publishedAt: timestamp("published_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("submissions_deleted_at_idx").on(t.deletedAt),
]);

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

// Named collections for organizing saved reading.
export const collectionsTable = pgTable("collections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("collections_user_idx").on(t.userId),
]);

export const collectionItemsTable = pgTable("collection_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  collectionId: text("collection_id").notNull().references(() => collectionsTable.id, { onDelete: "cascade" }),
  itemType: itemTypeEnum("item_type").notNull(),
  itemId: text("item_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("collection_items_unique").on(t.collectionId, t.itemType, t.itemId),
  index("collection_items_collection_idx").on(t.collectionId),
]);

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 80 }).notNull().default("SYSTEM"),
  message: text("message").notNull(),
  href: text("href"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("notifications_user_idx").on(t.userId),
  index("notifications_unread_idx").on(t.userId, t.read),
]);

/**
 * One person following another. Directional and unique, so following someone
 * twice is impossible and "follows back" is simply the mirrored row existing.
 */
export const followsTable = pgTable("follows", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  followerId: text("follower_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  followingId: text("following_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("follows_unique").on(t.followerId, t.followingId),
  index("follows_following_idx").on(t.followingId),
]);

export const conversationKindEnum = pgEnum("conversation_kind", ["DIRECT", "GROUP"]);
export const conversationRoleEnum = pgEnum("conversation_role", ["MEMBER", "ADMIN"]);
export const messageKindEnum = pgEnum("message_kind", ["TEXT", "IMAGE", "AUDIO", "FILE", "SYSTEM"]);

/**
 * A direct thread between two people, or a named group.
 *
 * `directKey` is what stops two people ending up with two parallel private
 * threads: for a DIRECT conversation it holds both user ids sorted and joined,
 * so the unique index makes a second one impossible no matter who opens it
 * first. It is null for groups, which may legitimately repeat their members.
 *
 * `lastMessageAt` is denormalised so the inbox can be ordered without touching
 * the messages table — that list is read constantly and must stay cheap.
 */
export const conversationsTable = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kind: conversationKindEnum("kind").notNull().default("DIRECT"),
  title: varchar("title", { length: 200 }),
  avatarUrl: text("avatar_url"),
  directKey: text("direct_key"),
  createdBy: text("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  /**
   * A direct thread opened by someone the recipient does not follow starts as
   * a request: it sits in a separate list, the sender may write once, and
   * nothing further is delivered until the recipient accepts. `acceptedAt`
   * null with a `requestedBy` set is what "pending" means; both null is a
   * group, which has no request step.
   */
  requestedBy: text("requested_by").references(() => usersTable.id, { onDelete: "set null" }),
  acceptedAt: timestamp("accepted_at"),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  lastMessagePreview: text("last_message_preview"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("conversations_direct_key_idx").on(t.directKey),
  index("conversations_last_message_idx").on(t.lastMessageAt),
]);

/**
 * Who is in a conversation, and how much of it they have read.
 *
 * `lastReadAt` is the whole basis of unread counts and read receipts, so it
 * lives on the membership rather than being derived per message — one row per
 * person per thread instead of one row per person per message.
 *
 * Leaving sets `leftAt` rather than deleting the row: the history stays
 * coherent, and "X left the group" can still be shown.
 */
export const conversationMembersTable = pgTable("conversation_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: conversationRoleEnum("role").notNull().default("MEMBER"),
  lastReadAt: timestamp("last_read_at"),
  muted: boolean("muted").notNull().default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
}, (t) => [
  uniqueIndex("conversation_members_unique").on(t.conversationId, t.userId),
  index("conversation_members_user_idx").on(t.userId),
]);

/**
 * One message. Media lives on the same row rather than a side table because a
 * message carries at most one attachment here, and a join per message on the
 * hottest read path in the product is not worth the normalisation.
 *
 * Deleting sets `deletedAt` and blanks the body at read time: an "unsent"
 * message must leave a visible gap in the thread, otherwise replies to it stop
 * making sense.
 */
export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  senderId: text("sender_id").references(() => usersTable.id, { onDelete: "set null" }),
  kind: messageKindEnum("kind").notNull().default("TEXT"),
  body: text("body"),
  mediaUrl: text("media_url"),
  mediaMimeType: text("media_mime_type"),
  mediaSizeBytes: integer("media_size_bytes"),
  mediaName: text("media_name"),
  replyToId: text("reply_to_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("messages_conversation_idx").on(t.conversationId, t.createdAt),
]);

/** One emoji from one person on one message. */
export const messageReactionsTable = pgTable("message_reactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text("message_id").notNull().references(() => messagesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  emoji: varchar("emoji", { length: 16 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("message_reactions_unique").on(t.messageId, t.userId, t.emoji),
  index("message_reactions_message_idx").on(t.messageId),
]);

/**
 * Who is typing, refreshed by the client and treated as expired after a few
 * seconds. A table rather than memory because serverless instances do not
 * share state — anything held in a process is invisible to the next request.
 */
export const typingIndicatorsTable = pgTable("typing_indicators", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("typing_indicators_unique").on(t.conversationId, t.userId),
]);

/**
 * Browser push endpoints, one row per device a reader has approved.
 *
 * Tied to a user id, which is what makes the behaviour "notifications follow
 * the account": a signed-out visitor has no row, so nothing is ever sent to
 * them, and signing back in on the same browser resumes delivery.
 *
 * The endpoint is unique because the browser reissues the same URL for the
 * same device, so a second approval must update rather than duplicate.
 */
export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
}, (t) => [
  index("push_subscriptions_user_idx").on(t.userId),
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
export type Collection = typeof collectionsTable.$inferSelect;
export type CollectionItem = typeof collectionItemsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaperSchema = createInsertSchema(papersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true, updatedAt: true });
