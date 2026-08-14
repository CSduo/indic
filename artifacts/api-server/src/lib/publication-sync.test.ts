import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These tests deliberately use a small fluent-query fake rather than a real
 * database. Publication reconciliation is safety-critical: it must never
 * manufacture a public record unless the explicit publish path asks it to.
 */
const fixture = vi.hoisted(() => {
  const tables = {
    articles: {
      id: "articles.id",
      slug: "articles.slug",
      sourceSubmissionId: "articles.sourceSubmissionId",
      deletedAt: "articles.deletedAt",
      status: "articles.status",
    },
    papers: {
      id: "papers.id",
      slug: "papers.slug",
      sourceSubmissionId: "papers.sourceSubmissionId",
      deletedAt: "papers.deletedAt",
      status: "papers.status",
    },
    categories: {
      slug: "categories.slug",
      sortOrder: "categories.sortOrder",
    },
    submissions: {
      id: "submissions.id",
      status: "submissions.status",
      deletedAt: "submissions.deletedAt",
    },
  };

  const state = {
    submissions: [] as any[],
    articleLinks: new Map<string, any>(),
    paperLinks: new Map<string, any>(),
    articleInserts: [] as any[],
    paperInserts: [] as any[],
    updates: [] as any[],
    reset() {
      this.submissions = [];
      this.articleLinks.clear();
      this.paperLinks.clear();
      this.articleInserts = [];
      this.paperInserts = [];
      this.updates = [];
    },
  };

  return { tables, state };
});

vi.mock("drizzle-orm", () => ({
  eq: (field: unknown, value: unknown) => ({ type: "eq", field, value }),
  and: (...conditions: unknown[]) => ({ type: "and", conditions }),
  asc: (field: unknown) => ({ type: "asc", field }),
  inArray: (field: unknown, values: unknown[]) => ({ type: "inArray", field, values }),
  isNull: (field: unknown) => ({ type: "isNull", field }),
}));

vi.mock("./content", () => ({
  sanitizeArticleBody: (value: unknown) => String(value ?? ""),
}));

vi.mock("@workspace/db", () => {
  const findEq = (condition: any, field: unknown): unknown => {
    if (!condition) return undefined;
    if (condition.type === "eq" && condition.field === field) return condition.value;
    if (condition.type === "and") {
      for (const nested of condition.conditions) {
        const value = findEq(nested, field);
        if (value !== undefined) return value;
      }
    }
    return undefined;
  };

  const db = {
    select: () => {
      let table: unknown;
      let condition: unknown;

      const rows = () => {
        if (table === fixture.tables.submissions) return fixture.state.submissions;
        if (table === fixture.tables.categories) return [{ slug: "archive" }];

        if (table === fixture.tables.articles) {
          const submissionId = findEq(condition, fixture.tables.articles.sourceSubmissionId) as string | undefined;
          return submissionId ? [fixture.state.articleLinks.get(submissionId)].filter(Boolean) : [];
        }

        if (table === fixture.tables.papers) {
          const submissionId = findEq(condition, fixture.tables.papers.sourceSubmissionId) as string | undefined;
          return submissionId ? [fixture.state.paperLinks.get(submissionId)].filter(Boolean) : [];
        }

        return [];
      };

      const query: any = {
        from(nextTable: unknown) {
          table = nextTable;
          return query;
        },
        where(nextCondition: unknown) {
          condition = nextCondition;
          return query;
        },
        orderBy() {
          return query;
        },
        limit(limit: number) {
          return Promise.resolve(rows().slice(0, limit));
        },
        then(onFulfilled: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) {
          return Promise.resolve(rows()).then(onFulfilled, onRejected);
        },
      };

      return query;
    },
    insert: (table: unknown) => ({
      values: (values: any) => ({
        onConflictDoNothing: () => {
          const result: any = Promise.resolve([]);
          result.returning = () => {
            if (table === fixture.tables.articles) {
              const row = { ...values, id: "article-created" };
              fixture.state.articleInserts.push(values);
              fixture.state.articleLinks.set(values.sourceSubmissionId, row);
              return Promise.resolve([{ id: row.id, slug: row.slug }]);
            }

            if (table === fixture.tables.papers) {
              const row = { ...values, id: "paper-created" };
              fixture.state.paperInserts.push(values);
              fixture.state.paperLinks.set(values.sourceSubmissionId, row);
              return Promise.resolve([{ id: row.id, slug: row.slug }]);
            }

            return Promise.resolve([]);
          };
          return result;
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => ({
        where: () => {
          fixture.state.updates.push({ table, values });
          const result: any = Promise.resolve([]);
          result.returning = () => Promise.resolve([]);
          return result;
        },
      }),
    }),
  };

  return {
    articlesTable: fixture.tables.articles,
    papersTable: fixture.tables.papers,
    categoriesTable: fixture.tables.categories,
    submissionsTable: fixture.tables.submissions,
    db,
  };
});

function submission(overrides: Record<string, unknown> = {}) {
  return {
    id: "submission-1",
    type: "ESSAY",
    status: "PUBLISHED",
    title: "A published submission",
    abstract: "An abstract",
    body: "<p>Body</p>",
    submitterName: "Test Scholar",
    domain: null,
    notes: null,
    coverImageUrl: null,
    manuscriptUrl: null,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  } as any;
}

async function loadPublicationSync() {
  return import("./publication-sync");
}

beforeEach(() => {
  fixture.state.reset();
  vi.resetModules();
});

describe("publication reconciliation safety", () => {
  it("skips an unlinked published submission during reconciliation without creating a public record", async () => {
    fixture.state.submissions = [submission()];
    const { syncPublishedSubmissions } = await loadPublicationSync();

    await expect(syncPublishedSubmissions()).resolves.toEqual({
      checked: 1,
      updatedArticles: 0,
      updatedPapers: 0,
      skipped: 1,
    });
    expect(fixture.state.articleInserts).toEqual([]);
    expect(fixture.state.paperInserts).toEqual([]);
  });

  it("does not restore or update a linked trashed publication", async () => {
    const current = submission();
    fixture.state.articleLinks.set(current.id, {
      id: "article-in-trash",
      slug: "article-in-trash",
      deletedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    const { ensurePublicPublicationForSubmission } = await loadPublicationSync();

    await expect(ensurePublicPublicationForSubmission(current)).resolves.toEqual({
      kind: "article",
      status: "skipped",
      id: "article-in-trash",
      slug: "article-in-trash",
      reason: "publication-trashed",
    });
    expect(fixture.state.updates).toEqual([]);
    expect(fixture.state.articleInserts).toEqual([]);
  });

  it("does not republish a linked archived record during reconciliation", async () => {
    const current = submission();
    fixture.state.articleLinks.set(current.id, {
      id: "article-archived",
      slug: "article-archived",
      status: "ARCHIVED",
      deletedAt: null,
    });
    const { ensurePublicPublicationForSubmission } = await loadPublicationSync();

    await expect(ensurePublicPublicationForSubmission(current)).resolves.toEqual({
      kind: "article",
      status: "skipped",
      id: "article-archived",
      slug: "article-archived",
      reason: "publication-not-public",
    });
    expect(fixture.state.updates).toEqual([]);
    expect(fixture.state.articleInserts).toEqual([]);
  });

  it("skips non-public and trashed submissions before touching publication data", async () => {
    const { ensurePublicPublicationForSubmission } = await loadPublicationSync();

    await expect(ensurePublicPublicationForSubmission(submission({ status: "ACCEPTED" }))).resolves.toMatchObject({
      status: "skipped",
      reason: "submission-not-public",
    });
    await expect(ensurePublicPublicationForSubmission(submission({ deletedAt: new Date("2026-01-02T00:00:00.000Z") }))).resolves.toMatchObject({
      status: "skipped",
      reason: "submission-trashed",
    });
    expect(fixture.state.articleInserts).toEqual([]);
    expect(fixture.state.paperInserts).toEqual([]);
    expect(fixture.state.updates).toEqual([]);
  });

  it("creates a source-linked public record only when allowCreate is explicit", async () => {
    const current = submission({ id: "submission-to-publish", title: "Explicit publication" });
    const { ensurePublicPublicationForSubmission } = await loadPublicationSync();

    await expect(ensurePublicPublicationForSubmission(current, { allowCreate: true })).resolves.toEqual({
      kind: "article",
      status: "created",
      id: "article-created",
      slug: "explicit-publication",
    });
    expect(fixture.state.articleInserts).toHaveLength(1);
    expect(fixture.state.articleInserts[0]).toMatchObject({
      sourceSubmissionId: "submission-to-publish",
      status: "PUBLISHED",
      slug: "explicit-publication",
    });
  });
});
