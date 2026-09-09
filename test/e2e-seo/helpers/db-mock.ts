import { vi } from "vitest";
import {
  articlesTable,
  papersTable,
  usersTable,
  categoriesTable,
} from "../../../lib/db/src/schema/index";
import {
  FIXTURE_ARTICLES,
  FIXTURE_PAPERS,
  FIXTURE_AUTHORS,
  FIXTURE_CATEGORIES,
} from "./mock-db";

export {
  articlesTable,
  papersTable,
  usersTable,
  categoriesTable,
};

function extractSlug(condition: any): string | null {
  if (!condition) return null;
  // Drizzle eq operator inspection
  if (condition.type === "eq" || condition.operator === "=") {
    if (typeof condition.value === "string" && condition.value !== "PUBLISHED") return condition.value;
  }
  // Check conditions array (and / or)
  const nested = condition.conditions || condition.chunks;
  if (Array.isArray(nested)) {
    for (const c of nested) {
      const s = extractSlug(c);
      if (s) return s;
    }
  }
  // If condition query has query chunks
  if (condition.queryChunks) {
    for (const chunk of condition.queryChunks) {
      if (typeof chunk?.value === "string" && !chunk.value.includes("%") && chunk.value !== "PUBLISHED") {
        return chunk.value;
      }
      if (Array.isArray(chunk)) {
        for (const item of chunk) {
          if (typeof item?.value === "string" && !item.value.includes("%") && item.value !== "PUBLISHED") {
            return item.value;
          }
        }
      }
    }
  }
  return null;
}

export function createMockDb() {
  const mockDb = {
    select: (fields?: any) => {
      let targetTable: any = null;
      let whereCondition: any = null;
      let limitCount: number | null = null;

      const builder: any = {
        from: (table: any) => {
          targetTable = table;
          return builder;
        },
        where: (condition: any) => {
          whereCondition = condition;
          return builder;
        },
        orderBy: (..._args: any[]) => {
          return builder;
        },
        limit: (limit: number) => {
          limitCount = limit;
          return builder;
        },
        then: (resolve: (val: any) => void, reject?: (err: any) => void) => {
          try {
            let results: any[] = [];
            const searchedSlug = extractSlug(whereCondition);

            // Match by table identity
            const isArticles = targetTable === articlesTable || (targetTable?.[Symbol.for("drizzle:Name")] === "articles");
            const isPapers = targetTable === papersTable || (targetTable?.[Symbol.for("drizzle:Name")] === "papers");
            const isUsers = targetTable === usersTable || (targetTable?.[Symbol.for("drizzle:Name")] === "users");
            const isCategories = targetTable === categoriesTable || (targetTable?.[Symbol.for("drizzle:Name")] === "categories");

            if (isArticles) {
              results = FIXTURE_ARTICLES.filter(a => {
                if (searchedSlug) {
                  const clean = searchedSlug.replace(/-[a-f0-9]{4,8}$/, "");
                  return (a.slug === searchedSlug || a.slug === clean) && a.status === "PUBLISHED" && !a.deletedAt;
                }
                return a.status === "PUBLISHED" && !a.deletedAt;
              });
            } else if (isPapers) {
              results = FIXTURE_PAPERS.filter(p => {
                if (searchedSlug) {
                  const clean = searchedSlug.replace(/-[a-f0-9]{4,8}$/, "");
                  return (p.slug === searchedSlug || p.slug === clean) && p.status === "PUBLISHED" && !p.deletedAt;
                }
                return p.status === "PUBLISHED" && !p.deletedAt;
              });
            } else if (isUsers) {
              results = FIXTURE_AUTHORS.filter(u => {
                if (searchedSlug) {
                  return u.handle === searchedSlug || u.id === searchedSlug;
                }
                return true;
              });
            } else if (isCategories) {
              results = FIXTURE_CATEGORIES.filter(c => {
                if (searchedSlug) {
                  return c.slug === searchedSlug;
                }
                return true;
              });
            }

            if (fields && typeof fields === "object" && !Array.isArray(fields)) {
              results = results.map(row => {
                const projected: any = {};
                for (const key of Object.keys(fields)) {
                  projected[key] = row[key];
                }
                return projected;
              });
            }

            if (limitCount !== null) {
              results = results.slice(0, limitCount);
            }

            resolve(results);
          } catch (err) {
            if (reject) reject(err);
            else throw err;
          }
        },
      };

      return builder;
    },
  };

  return mockDb;
}
