import {
  pgTable, text, serial, integer, boolean, timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { authorsTable } from "./authors";

export const papersTable = pgTable("papers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull().default(""),
  pdfUrl: text("pdf_url"),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  authorId: integer("author_id").references(() => authorsTable.id),
  status: text("status").notNull().default("draft"),
  peerReviewed: boolean("peer_reviewed").notNull().default(false),
  citationText: text("citation_text"),
  publicationType: text("publication_type"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  downloadCount: integer("download_count").notNull().default(0),
});

export const insertPaperSchema = createInsertSchema(papersTable).omit({ id: true });
export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type Paper = typeof papersTable.$inferSelect;
