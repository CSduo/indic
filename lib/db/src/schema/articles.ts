import {
  pgTable, text, serial, integer, boolean, timestamp, jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { authorsTable } from "./authors";

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  excerpt: text("excerpt"),
  content: text("content").notNull().default(""),
  coverImage: text("cover_image"),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  authorId: integer("author_id").references(() => authorsTable.id),
  status: text("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  readingTime: integer("reading_time").notNull().default(5),
  audioUrl: text("audio_url"),
  keyTakeaways: jsonb("key_takeaways").$type<string[]>(),
  referencesList: jsonb("references_list").$type<string[]>(),
  views: integer("views").notNull().default(0),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
