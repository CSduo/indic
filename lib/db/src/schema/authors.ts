import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const authorsTable = pgTable("authors", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  title: text("title"),
});

export const insertAuthorSchema = createInsertSchema(authorsTable).omit({ id: true });
export type InsertAuthor = z.infer<typeof insertAuthorSchema>;
export type Author = typeof authorsTable.$inferSelect;
