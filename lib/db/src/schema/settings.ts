import { pgTable, text, integer } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  featuredArticleId: integer("featured_article_id"),
  siteTitle: text("site_title").notNull().default("Ānvīkṣikī"),
  siteDescription: text("site_description").notNull().default("A civilizational intellectual journal for essays, papers, and serious inquiry."),
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
