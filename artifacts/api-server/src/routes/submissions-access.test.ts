import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Who may submit, and how much a submission list returns at once. The
// database is replaced by an in-memory stand-in that records what the routes
// ask of it.
const state = vi.hoisted(() => ({
  viewer: { id: "author-1", name: "Xiyato Saanvi", email: "author@example.test", role: "USER", password: "hash" } as any,
  admin: null as null | { id: string; email: string; role: string },
  submissions: [] as any[],
  inserts: [] as any[],
  pages: [] as Array<{ limit?: number; offset?: number }>,
}));

vi.mock("drizzle-orm", () => {
  const op = (type: string) => (...args: unknown[]) => ({ type, args });
  const sql = Object.assign((..._args: unknown[]) => ({ type: "sql" }), { raw: () => ({ type: "sql" }) });
  return {
    and: op("and"), or: op("or"), eq: op("eq"), ne: op("ne"), ilike: op("ilike"),
    isNull: op("isNull"), isNotNull: op("isNotNull"), desc: op("desc"), asc: op("asc"),
    inArray: op("inArray"), sql,
    getTableColumns: (table: any) => Object.fromEntries(
      ["id", "userId", "title", "abstract", "body", "status", "createdAt", "deletedAt"].map((key) => [key, `${table.__name}.${key}`]),
    ),
  };
});

vi.mock("@workspace/db", () => {
  const table = (name: string) => new Proxy({ __name: name }, {
    get: (target, prop) => (prop in target ? (target as any)[prop] : `${name}.${String(prop)}`),
  });
  const tables: Record<string, any> = {
    usersTable: table("users"), articlesTable: table("articles"), papersTable: table("papers"),
    submissionsTable: table("submissions"), adminsTable: table("admins"), categoriesTable: table("categories"),
    mediaAssetsTable: table("media_assets"), notificationsTable: table("notifications"),
  };
  const rowsFor = (t: any, columns: Record<string, unknown> | undefined) => {
    if (t === tables.usersTable) return [{ ...state.viewer }];
    if (t === tables.adminsTable) return state.admin ? [{ ...state.admin }] : [];
    if (t === tables.submissionsTable) {
      if (columns && "count" in columns) return [{ count: state.submissions.length }];
      if (columns && "pending" in columns) return [{ pending: state.submissions.filter((row) => row.status === "RECEIVED").length }];
      // Only the selected columns come back, as from a real select.
      return state.submissions.map((row) => (columns ? Object.fromEntries(Object.keys(columns).map((k) => [k, row[k]])) : { ...row }));
    }
    return [];
  };
  const select = (columns?: Record<string, unknown>) => {
    let from: any;
    const page: { limit?: number; offset?: number } = {};
    const q: any = {
      from(t: any) { from = t; return q; }, leftJoin() { return q; }, innerJoin() { return q; },
      where() { return q; }, orderBy() { return q; },
      limit(n: number) { page.limit = n; return q; },
      offset(n: number) { page.offset = n; return q; },
      then(resolve: (rows: unknown[]) => void, reject: any) {
        try {
          if (from === tables.submissionsTable && !(columns && ("count" in columns || "pending" in columns))) state.pages.push({ ...page });
          const rows = rowsFor(from, columns);
          resolve(page.limit === undefined ? rows : rows.slice(page.offset ?? 0, (page.offset ?? 0) + page.limit));
        } catch (e) { reject(e); }
      },
      catch() { return q; },
    };
    return q;
  };
  const db = {
    select,
    insert: () => {
      let values: any;
      const chain: any = {
        values(v: any) { values = v; return chain; },
        returning: () => { state.inserts.push(values); return Promise.resolve([{ id: "new-1", ...values }]); },
      };
      return chain;
    },
    update: () => { const c: any = { set: () => c, where: () => c, returning: () => Promise.resolve([]) }; return c; },
    delete: () => { const c: any = { where: () => Promise.resolve([]) }; return c; },
  };
  return { db, withDbRetry: (fn: (client: unknown) => unknown) => fn(db), repairDatabaseSchema: async () => undefined, ...tables };
});

vi.mock("../lib/publication-sync", () => ({
  categorySlugCandidates: (v: string) => [v],
  normalizeCategorySlug: (v: string) => v,
  slugify: (v: string) => String(v || "").toLowerCase(),
  syncSubmissionFromPublication: async () => undefined,
  syncPublishedSubmissions: async () => ({}),
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

async function userCookie() {
  const { createUserToken } = await import("../lib/auth");
  return `user_session=${await createUserToken(state.viewer.id, state.viewer.email)}`;
}

async function adminCookie() {
  const { createAdminToken } = await import("../lib/auth");
  return `admin_session=${await createAdminToken(state.admin!.id, state.admin!.email, state.admin!.role)}`;
}

const SUBMISSION = {
  type: "ESSAY",
  submitterName: "Somebody",
  submitterEmail: "somebody@example.test",
  title: "On Inquiry",
  abstract: "An abstract.",
  consent: true,
};

function submission(n: number) {
  return {
    id: `sub-${n}`,
    userId: state.viewer.id,
    title: `Essay ${n}`,
    abstract: `Abstract ${n}`,
    body: `<p>The full text of essay ${n}.</p><script>alert(1)</script>`,
    status: "RECEIVED",
    createdAt: new Date(Date.UTC(2026, 8, n)),
    deletedAt: null,
  };
}

beforeEach(() => {
  state.viewer = { id: "author-1", name: "Xiyato Saanvi", email: "author@example.test", role: "USER", password: "hash" };
  state.admin = null;
  state.submissions = [];
  state.inserts = [];
  state.pages = [];
});

describe("submitting needs an account", () => {
  it("refuses an anonymous submission, upload or finished essay, and stores nothing", async () => {
    const { default: router } = await import("./submissions");
    const app = appWith(router);

    const json = await request(app).post("/api/submissions").send(SUBMISSION);
    expect(json.status).toBe(401);
    expect(json.body.code).toBe("AUTH_REQUIRED");

    const upload = await request(app).post("/api/submissions/upload").send(SUBMISSION);
    expect(upload.status).toBe(401);

    // Refused before the file is read.
    const multipart = await request(app)
      .post("/api/submissions/upload")
      .field("title", "On Inquiry")
      .attach("manuscript", Buffer.from("%PDF-1.4 a manuscript"), { filename: "essay.pdf", contentType: "application/pdf" });
    expect(multipart.status).toBe(401);

    const write = await request(app).post("/api/submissions/write").send({ ...SUBMISSION, body: "<p>Text</p>", status: "RECEIVED" });
    expect(write.status).toBe(401);
    expect(write.body.code).toBe("AUTH_REQUIRED");

    const draft = await request(app).post("/api/submissions/write").send({ title: "Draft", body: "<p>Text</p>", status: "DRAFT" });
    expect(draft.status).toBe(401);
    expect(draft.body.error).toBe("Sign in to save a draft");

    expect(state.inserts).toEqual([]);
  });

  it("accepts a signed-in author's submission under their account", async () => {
    const { default: router } = await import("./submissions");
    const res = await request(appWith(router)).post("/api/submissions").set("Cookie", await userCookie()).send(SUBMISSION);
    expect(res.status).toBe(201);
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0]).toMatchObject({ userId: "author-1", submitterName: "Xiyato Saanvi", submitterEmail: "author@example.test" });
  });
});

describe("an author's submission list", () => {
  it("comes a page at a time, newest first, without essay bodies", async () => {
    state.submissions = [1, 2, 3].map(submission);
    const { default: router } = await import("./submissions");
    const app = appWith(router);
    const cookie = await userCookie();

    const first = await request(app).get("/api/submissions?limit=2").set("Cookie", cookie);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ total: 3, limit: 2, offset: 0 });
    expect(first.body.submissions.map((s: any) => s.id)).toEqual(["sub-3", "sub-2"]);
    for (const item of first.body.submissions) expect(item).not.toHaveProperty("body");

    const second = await request(app).get("/api/submissions?limit=2&offset=2").set("Cookie", cookie);
    expect(second.body.submissions.map((s: any) => s.id)).toEqual(["sub-1"]);

    const capped = await request(app).get("/api/submissions?limit=5000").set("Cookie", cookie);
    expect(capped.body.limit).toBe(100);
  });
});

describe("the editorial desk's submission list", () => {
  beforeEach(() => {
    state.admin = { id: "admin-1", email: "editor@example.test", role: "ADMIN" };
  });

  it("is admin-only", async () => {
    const { default: router } = await import("./admin");
    const res = await request(appWith(router)).get("/api/admin/submissions");
    expect(res.status).toBe(401);
  });

  it("is paginated in the database and leaves out the bodies", async () => {
    state.submissions = [1, 2, 3].map(submission);
    const { default: router } = await import("./admin");
    const app = appWith(router);
    const cookie = await adminCookie();

    const res = await request(app).get("/api/admin/submissions?limit=2&offset=1").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 3, pending: 3, limit: 2, offset: 1 });
    expect(res.body.submissions).toHaveLength(2);
    for (const item of res.body.submissions) expect(item).not.toHaveProperty("body");
    expect(state.pages.at(-1)).toEqual({ limit: 2, offset: 1 });

    await request(app).get("/api/admin/submissions?limit=100000").set("Cookie", cookie);
    expect(state.pages.at(-1)).toEqual({ limit: 50, offset: 0 });
  });

  it("returns one submission's sanitised body on request", async () => {
    state.submissions = [submission(7)];
    const { default: router } = await import("./admin");
    const app = appWith(router);
    const cookie = await adminCookie();

    const res = await request(app).get("/api/admin/submissions/sub-7").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.submission.body).toContain("The full text of essay 7.");
    expect(res.body.submission.body).not.toContain("<script");

    state.submissions = [];
    const missing = await request(app).get("/api/admin/submissions/nope").set("Cookie", cookie);
    expect(missing.status).toBe(404);
  });
});
