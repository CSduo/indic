import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  hashPassword, comparePassword, createUserToken,
  getUserAuth, setUserCookie, clearUserCookie
} from "../lib/auth";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }
    const { email, password } = parsed.data;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = await createUserToken(user.id, user.email);
    setUserCookie(res, token);
    return res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/signup
router.post("/auth/signup", async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }
    const { name, email, password } = parsed.data;
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const hashedPassword = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({ name, email, password: hashedPassword }).returning();
    const token = await createUserToken(user.id, user.email);
    setUserCookie(res, token);
    return res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create account" });
  }
});

// GET /api/auth/me
router.get("/auth/me", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Not authenticated" });
    const [user] = await db.select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role })
      .from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  clearUserCookie(res);
  return res.json({ success: true });
});

export default router;
