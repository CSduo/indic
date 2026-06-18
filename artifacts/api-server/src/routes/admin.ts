import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import { adminsTable, adminSessionsTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth.js";
import { loginRateLimiter } from "../middlewares/rateLimiter.js";
import { z } from "zod/v4";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_NAME = "anvikshiki_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24h

// POST /admin/login
router.post("/admin/login", loginRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(adminSessionsTable).values({ id: sessionId, adminId: admin.id, expiresAt });

  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });

  res.json({ id: admin.id, email: admin.email, role: admin.role });
});

// POST /admin/logout
router.post("/admin/logout", async (req, res) => {
  const sessionId = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (sessionId) {
    await db.delete(adminSessionsTable).where(eq(adminSessionsTable.id, sessionId));
  }
  res.clearCookie(COOKIE_NAME);
  res.status(204).send();
});

// GET /admin/me
router.get("/admin/me", requireAdmin, (req, res) => {
  const admin = (req as typeof req & { admin: { id: number; email: string; role: string } }).admin;
  res.json({ id: admin.id, email: admin.email, role: admin.role });
});

// GET /admin/settings
router.get("/admin/settings", requireAdmin, async (_req, res) => {
  let [settings] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, 1));
  if (!settings) {
    [settings] = await db.insert(siteSettingsTable).values({ id: 1 }).returning();
  }
  res.json({
    featuredArticleId: settings.featuredArticleId,
    siteTitle: settings.siteTitle,
    siteDescription: settings.siteDescription,
  });
});

// PATCH /admin/settings
router.patch("/admin/settings", requireAdmin, async (req, res) => {
  const schema = z.object({
    featuredArticleId: z.number().int().nullable().optional(),
    siteTitle: z.string().min(1).optional(),
    siteDescription: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error }); return; }

  const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, 1));
  let settings;
  if (!existing) {
    [settings] = await db.insert(siteSettingsTable).values({ id: 1, ...parsed.data }).returning();
  } else {
    [settings] = await db.update(siteSettingsTable).set(parsed.data).where(eq(siteSettingsTable.id, 1)).returning();
  }
  res.json({
    featuredArticleId: settings!.featuredArticleId,
    siteTitle: settings!.siteTitle,
    siteDescription: settings!.siteDescription,
  });
});

export default router;
