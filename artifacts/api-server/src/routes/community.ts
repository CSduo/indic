import { Router } from "express";
import { z } from "zod";
import { db, followsTable, usersTable, articlesTable } from "@workspace/db";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { getUserAuth } from "../lib/auth";
import { notifyUser } from "../lib/notify";
import { parsePagination } from "../lib/request";

const router = Router();

/**
 * The public shape of a member.
 *
 * Email is never in this list. It is a login credential and a contact detail
 * people did not agree to publish, and a directory that exposes it becomes an
 * address-harvesting endpoint the moment it is indexed. Names, avatars, bios,
 * and institutions are the things someone puts on a profile expecting them to
 * be seen.
 */
const MEMBER_FIELDS = {
  id: usersTable.id,
  name: usersTable.name,
  handle: usersTable.handle,
  avatarUrl: usersTable.avatarUrl,
  bio: usersTable.bio,
  institution: usersTable.institution,
  createdAt: usersTable.createdAt,
};

function publicName(row: { name: string | null; id: string }): string {
  return (row.name || "").trim() || "Member";
}

/**
 * GET /api/community/members — the directory.
 *
 * Open to signed-out visitors so the community is visible from the public
 * site, but it returns nothing that could be used to contact someone off the
 * platform. Acting on a member — following, messaging — still requires an
 * account, which is enforced on those routes rather than here.
 */
router.get("/community/members", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    const viewerId = auth?.userId || null;
    const { limit, offset } = parsePagination(req.query.limit, req.query.offset);
    const q = String(req.query.q || "").trim();

    const conditions: any[] = [];
    if (q.length >= 1) {
      const term = `%${q.replace(/[%_\\]/g, m => `\\${m}`)}%`;
      /*
        Name, handle, bio and institution — never email, so an address cannot
        be confirmed by probing this endpoint. The handle is included because
        it is how people refer to each other once they have one; a member you
        know only as @arya-ambadi was unfindable without it.
      */
      const bare = term.replace("@", "");
      conditions.push(or(
        ilike(usersTable.name, term),
        ilike(usersTable.handle, bare),
        ilike(usersTable.bio, term),
        ilike(usersTable.institution, term),
      )!);
    }

    const rows = await db
      .select(MEMBER_FIELDS)
      .from(usersTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(usersTable)
      .where(conditions.length ? and(...conditions) : undefined);

    const ids = rows.map(r => r.id);

    // Follower counts and published-work counts in two aggregates rather than
    // per member, so the directory does not slow down as it grows.
    const [followerRows, workRows, followingRows] = await Promise.all([
      ids.length
        ? db.select({ followingId: followsTable.followingId, count: sql<number>`count(*)` })
            .from(followsTable)
            .where(inArray(followsTable.followingId, ids))
            .groupBy(followsTable.followingId)
        : Promise.resolve([] as any[]),
      ids.length
        ? db.select({ authorName: articlesTable.authorName, count: sql<number>`count(*)` })
            .from(articlesTable)
            .where(eq(articlesTable.status, "PUBLISHED"))
            .groupBy(articlesTable.authorName)
        : Promise.resolve([] as any[]),
      viewerId && ids.length
        ? db.select({ followingId: followsTable.followingId })
            .from(followsTable)
            .where(and(eq(followsTable.followerId, viewerId), inArray(followsTable.followingId, ids)))
        : Promise.resolve([] as any[]),
    ]);

    const followerCount = new Map(followerRows.map((r: any) => [r.followingId, Number(r.count)]));
    const iFollow = new Set(followingRows.map((r: any) => r.followingId));
    const worksByName = new Map(
      workRows.map((r: any) => [String(r.authorName || "").toLowerCase().trim(), Number(r.count)]),
    );

    return res.json({
      members: rows.map(r => ({
        id: r.id,
        name: publicName(r),
        handle: r.handle || null,
        avatarUrl: r.avatarUrl,
        bio: r.bio,
        institution: r.institution,
        followers: followerCount.get(r.id) || 0,
        publishedWorks: worksByName.get(publicName(r).toLowerCase()) || 0,
        youFollow: iFollow.has(r.id),
        isYou: r.id === viewerId,
      })),
      total: Number(total),
      limit,
      offset,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to list members");
    return res.status(500).json({ error: "Could not load the directory" });
  }
});

/** POST /api/users/:id/follow — follow someone. */
router.post("/users/:id/follow", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth?.userId) return res.status(401).json({ error: "Sign in to follow people" });
    if (req.params.id === auth.userId) return res.status(400).json({ error: "You cannot follow yourself" });

    const [target] = await db.select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable).where(eq(usersTable.id, req.params.id)).limit(1);
    if (!target) return res.status(404).json({ error: "That member no longer exists" });

    const [me] = await db.select({ name: usersTable.name })
      .from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);

    const inserted = await db.insert(followsTable)
      .values({ followerId: auth.userId, followingId: target.id })
      .onConflictDoNothing()
      .returning({ id: followsTable.id });

    // Only announce a genuinely new follow — re-posting the same request
    // should not fire the notification again.
    if (inserted.length > 0) {
      await notifyUser({
        userId: target.id,
        type: "NEW_FOLLOWER",
        message: `${me?.name || "Someone"} started following you.`,
        href: `/profile/${auth.userId}`,
        pushTitle: "New follower",
        tag: `follow-${auth.userId}`,
      });
    }

    return res.json({ success: true, following: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to follow");
    return res.status(500).json({ error: "Could not follow that member" });
  }
});

/** DELETE /api/users/:id/follow — unfollow. */
router.delete("/users/:id/follow", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth?.userId) return res.status(401).json({ error: "Sign in first" });

    await db.delete(followsTable).where(and(
      eq(followsTable.followerId, auth.userId),
      eq(followsTable.followingId, req.params.id),
    ));

    return res.json({ success: true, following: false });
  } catch (err) {
    req.log?.error({ err }, "Failed to unfollow");
    return res.status(500).json({ error: "Could not unfollow that member" });
  }
});

/** GET /api/users/:id/social — follower and following counts, plus your relationship. */
router.get("/users/:id/social", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    const viewerId = auth?.userId || null;
    const targetId = req.params.id;

    const [[followers], [following], mine, theirs] = await Promise.all([
      db.select({ n: sql<number>`count(*)` }).from(followsTable).where(eq(followsTable.followingId, targetId)),
      db.select({ n: sql<number>`count(*)` }).from(followsTable).where(eq(followsTable.followerId, targetId)),
      viewerId
        ? db.select({ id: followsTable.id }).from(followsTable)
            .where(and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, targetId))).limit(1)
        : Promise.resolve([] as any[]),
      viewerId
        ? db.select({ id: followsTable.id }).from(followsTable)
            .where(and(eq(followsTable.followerId, targetId), eq(followsTable.followingId, viewerId))).limit(1)
        : Promise.resolve([] as any[]),
    ]);

    return res.json({
      followers: Number(followers?.n || 0),
      following: Number(following?.n || 0),
      youFollow: mine.length > 0,
      followsYou: theirs.length > 0,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to read social counts");
    return res.status(500).json({ error: "Could not load that profile" });
  }
});

/** GET /api/users/:id/followers and /following — the lists behind those counts. */
for (const kind of ["followers", "following"] as const) {
  router.get(`/users/:id/${kind}`, async (req, res) => {
    try {
      const { limit, offset } = parsePagination(req.query.limit, req.query.offset);
      const joinOn = kind === "followers" ? followsTable.followerId : followsTable.followingId;
      const filterBy = kind === "followers" ? followsTable.followingId : followsTable.followerId;

      const rows = await db
        .select({ id: usersTable.id, name: usersTable.name, handle: usersTable.handle, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio })
        .from(followsTable)
        .innerJoin(usersTable, eq(usersTable.id, joinOn))
        .where(eq(filterBy, req.params.id))
        .orderBy(desc(followsTable.createdAt))
        .limit(limit)
        .offset(offset);

      return res.json({
        people: rows.map(r => ({ id: r.id, name: publicName(r), handle: r.handle || null, avatarUrl: r.avatarUrl, bio: r.bio })),
      });
    } catch (err) {
      req.log?.error({ err }, `Failed to list ${kind}`);
      return res.status(500).json({ error: "Could not load that list" });
    }
  });
}

export default router;
