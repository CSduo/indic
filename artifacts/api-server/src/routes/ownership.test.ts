import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
  Who may edit, trash or delete a published work. Ownership is the account
  whose submission produced the work (articles.source_submission_id ->
  submissions.user_id). A byline is free text and display names are not
  unique, so an account that merely takes an author's name must get 403 on
  every route, and nothing may be written.
*/

process.env.AUTH_SECRET ||= "test-auth-secret-not-real";
process.env.ADMIN_SECRET ||= "test-admin-secret-not-real";

const state = vi.hoisted(() => ({
  updates: [] as Array<{ table: string; set: any }>,
  viewer: { id: "owner-1", name: "Xiyato Saanvi", email: "owner@example.test", role: "USER" },
  article: {
    id: "article-1",
    slug: "an-essay",
    title: "Original title",
    authorName: "Xiyato Saanvi",
    status: "PUBLISHED",
    deletedAt: null as Date | null,
    body: "<p>original</p>",
    references: [] as unknown[],
    sourceSubmissionId: "sub-1",
  },
  submission: { id: "sub-1", userId: "owner-1", submitterEmail: "owner@example.test", title: "Original title" },
}));

vi.mock("drizzle-orm", () => {
  const op = (type: string) => (...args: unknown[]) => ({ type, args });
  const sql = Object.assign((..._args: unknown[]) => ({ type: "sql" }), { raw: () => ({ type: "sql" }) });
  return {
    and: op("and"), or: op("or"), eq: op("eq"), ne: op("ne"), ilike: op("ilike"),
    isNull: op("isNull"), isNotNull: op("isNotNull"), desc: op("desc"), asc: op("asc"),
    inArray: op("inArray"), sql,
  };
});

vi.mock("@workspace/db", () => {
  const table = (name: string) => new Proxy({ __name: name }, {
    get: (target, prop) => (prop in target ? (target as any)[prop] : `${name}.${String(prop)}`),
  });
  const tables: Record<string, any> = {
    usersTable: table("users"), articlesTable: table("articles"), papersTable: table("papers"),
    submissionsTable: table("submissions"), adminsTable: table("admins"), categoriesTable: table("categories"),
    mediaAssetsTable: table("media_assets"),
  };
  const rowsFor = (t: any) => {
    if (t === tables.usersTable) return [{ ...state.viewer }];
    if (t === tables.articlesTable) return [{ ...state.article }];
    if (t === tables.submissionsTable) return [{ ...state.submission }];
    return [];
  };
  const select = () => {
    let from: any;
    const q: any = {
      from(t: any) { from = t; return q; }, leftJoin() { return q; }, innerJoin() { return q; },
      where() { return q; }, orderBy() { return q; }, limit() { return q; },
      then(resolve: (rows: unknown[]) => void, reject: any) { try { resolve(rowsFor(from)); } catch (e) { reject(e); } },
      catch() { return q; },
    };
    return q;
  };
  const db = {
    select,
    update: (t: any) => {
      let set: any;
      const chain: any = {
        set(v: any) { set = v; state.updates.push({ table: t.__name, set: v }); return chain; },
        where() { return chain; },
        returning: () => Promise.resolve([{ ...state.article, ...set }]),
        then(resolve: any) { resolve([]); },
        catch() { return chain; },
      };
      return chain;
    },
    insert: () => { const c: any = { values: () => c, returning: () => Promise.resolve([]) }; return c; },
    delete: () => { const c: any = { where: () => Promise.resolve([]) }; return c; },
  };
  return { db, withDbRetry: (fn: () => unknown) => fn(), ...tables };
});

vi.mock("../lib/publication-sync", () => ({
  categorySlugCandidates: (v: string) => [v],
  normalizeCategorySlug: (v: string) => v,
  slugify: (v: string) => String(v || "").toLowerCase(),
  syncSubmissionFromPublication: async () => undefined,
  ensurePublicPublicationForSubmission: async () => ({ kind: null, status: "skipped" }),
  unpublishPublicPublicationForSubmission: async () => undefined,
}));
vi.mock("../lib/seo-service", () => ({ triggerPublicContentSeo: async () => null }));
vi.mock("../lib/notifier", () => ({ sendSubmissionNotification: async () => undefined }));

function appWith(router: any) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, _res, next) => { (req as any).log = { error() {}, warn() {}, info() {} }; next(); });
  app.use("/api", router);
  return app;
}

async function sessionFor(id: string, email: string) {
  const { createUserToken } = await import("../lib/auth");
  return `user_session=${await createUserToken(id, email)}`;
}

describe("published-work ownership", () => {
  beforeEach(() => {
    state.updates = [];
    state.viewer = { id: "owner-1", name: "Xiyato Saanvi", email: "owner@example.test", role: "USER" };
  });

  describe("an account that only shares the author's display name", () => {
    beforeEach(() => {
      state.viewer = { id: "impostor-1", name: "Xiyato Saanvi", email: "xiyatosaanvi@example.test", role: "USER" };
    });

    it("cannot rewrite the live article through the account desk", async () => {
      const { default: router } = await import("./submissions");
      const res = await request(appWith(router))
        .put(`/api/submissions/art-${state.article.id}`)
        .set("Cookie", await sessionFor(state.viewer.id, state.viewer.email))
        .send({ title: "Defaced title", body: "<p>other text</p>" });
      expect(res.status).toBe(403);
      expect(state.updates.filter(u => u.table === "articles")).toEqual([]);
    });

    it("cannot move it to Trash or delete it", async () => {
      const { default: router } = await import("./submissions");
      const cookie = await sessionFor(state.viewer.id, state.viewer.email);
      const trash = await request(appWith(router)).delete(`/api/submissions/art-${state.article.id}`).set("Cookie", cookie);
      const purge = await request(appWith(router)).delete(`/api/submissions/art-${state.article.id}/permanent`).set("Cookie", cookie);
      expect(trash.status).toBe(403);
      expect(purge.status).toBe(403);
      expect(state.updates.filter(u => u.table === "articles")).toEqual([]);
    });

    it("cannot read the work through the desk or edit it through the article route", async () => {
      const { default: submissions } = await import("./submissions");
      const { default: articles } = await import("./articles");
      const cookie = await sessionFor(state.viewer.id, state.viewer.email);
      const read = await request(appWith(submissions)).get(`/api/submissions/art-${state.article.id}`).set("Cookie", cookie);
      const edit = await request(appWith(articles))
        .patch(`/api/articles/${state.article.slug}/edit`)
        .set("Cookie", cookie)
        .send({ title: "Defaced via PATCH" });
      expect(read.status).toBe(403);
      expect(edit.status).toBe(403);
      expect(state.updates.filter(u => u.table === "articles")).toEqual([]);
    });
  });

  it("the account that submitted the work can still edit it", async () => {
    const { default: router } = await import("./articles");
    const res = await request(appWith(router))
      .patch(`/api/articles/${state.article.slug}/edit`)
      .set("Cookie", await sessionFor(state.viewer.id, state.viewer.email))
      .send({ title: "Revised title" });
    expect(res.status).toBe(200);
    expect(state.updates.some(u => u.table === "articles" && u.set.title === "Revised title")).toBe(true);
  });
});
