import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GET /api/users/:id/profile is called by every visitor's browser and by
 * crawlers. It must never write to the database (audit finding ANV-CRAWL-17:
 * a crawl assigned handles to eight accounts through this endpoint).
 */

const state = vi.hoisted(() => ({
  updates: 0,
  inserts: 0,
  user: {
    id: "user-legacy",
    name: "Legacy Member",
    email: "legacy@example.test",
    bio: null,
    institution: null,
    avatarUrl: null,
    handle: null as string | null,
  },
}));

const handles = vi.hoisted(() => ({
  ensureHandle: vi.fn(async () => "should-not-be-assigned"),
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
  const tables = {
    usersTable: table("users"),
    articlesTable: table("articles"),
    papersTable: table("papers"),
    submissionsTable: table("submissions"),
    adminsTable: table("admins"),
    newsletterSubscribersTable: table("newsletter"),
  };

  const select = () => {
    let from: any;
    const query: any = {
      from(t: any) { from = t; return query; },
      leftJoin() { return query; },
      where() { return query; },
      orderBy() { return query; },
      limit() { return query; },
      then(resolve: (rows: unknown[]) => void) {
        resolve(from === tables.usersTable ? [{ ...state.user }] : []);
      },
    };
    return query;
  };

  const db = {
    select,
    update: () => {
      state.updates += 1;
      const chain: any = { set: () => chain, where: () => chain, returning: () => Promise.resolve([]) };
      return chain;
    },
    insert: () => {
      state.inserts += 1;
      const chain: any = { values: () => chain, returning: () => Promise.resolve([]), onConflictDoNothing: () => chain };
      return chain;
    },
  };

  return { db, ...tables };
});

vi.mock("../lib/handles", () => ({
  ensureHandle: handles.ensureHandle,
  validateHandle: () => ({ ok: true, handle: "x" }),
  handleIsAvailable: async () => true,
  generateHandle: async () => "x",
}));

vi.mock("../lib/notifier", () => ({ sendNewMemberNotification: async () => undefined }));
vi.mock("../lib/seo-service", () => ({ triggerPublicContentSeo: async () => null }));

describe("GET /api/users/:id/profile is side-effect free", () => {
  beforeEach(() => {
    state.updates = 0;
    state.inserts = 0;
    handles.ensureHandle.mockClear();
  });

  it("returns the profile of an account without a handle and writes nothing", async () => {
    const { default: authRouter } = await import("./auth");
    const app = express();
    app.use((req, _res, next) => {
      (req as any).log = { error: () => undefined, warn: () => undefined, info: () => undefined };
      next();
    });
    app.use("/api", authRouter);

    const res = await request(app).get("/api/users/user-legacy/profile");

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("legacy@example.test");
    expect(handles.ensureHandle).not.toHaveBeenCalled();
    expect(state.updates).toBe(0);
    expect(state.inserts).toBe(0);
  });
});
