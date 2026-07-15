import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, papersTable, submissionsTable, usersTable } from "@workspace/db";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import {
  hashPassword, comparePassword, createUserToken,
  getUserAuth, setUserCookie, clearUserCookie,
} from "../lib/auth";
import { z } from "zod";
import { sendNewMemberNotification } from "../lib/notifier";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(128),
});

function parseAuthError(err: any): { error: string; code: string; hint?: string } {
  const errMsg = err?.message || String(err);
  let hint: string | undefined = undefined;
  let code = "SIGNUP_FAILED";
  let error = "Failed to create account";

  if (errMsg.includes("relation") && errMsg.includes("does not exist")) {
    hint = "Database table 'users' does not exist. Please run database schema migrations.";
    code = "DB_TABLE_MISSING";
  } else if (errMsg.includes("connection") || errMsg.includes("connect") || errMsg.includes("Pool")) {
    hint = "Failed to connect to the database. Please verify your DATABASE_URL credentials and connectivity.";
    code = "DB_CONNECTION_FAILURE";
  } else if (errMsg.includes("password authentication failed")) {
    hint = "Database credentials are incorrect.";
    code = "DB_AUTH_FAILURE";
  } else if (errMsg.includes("SSL")) {
    hint = "SSL connection is required by the database host. Check your SSL configuration.";
    code = "DB_SSL_REQUIRED";
  } else if (errMsg.includes("unique constraint") || errMsg.includes("duplicate key")) {
    hint = "A user with this email already exists.";
    code = "DB_UNIQUE_VIOLATION";
  }

  return { error, code, hint };
}

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }
    const { email, password } = parsed.data;
    const [user] = await db.select().from(usersTable).where(ilike(usersTable.email, email)).limit(1);
    const passwordHash = user?.password || "$2b$12$C6UzMDM.H6dfI/f/IKcEe.4wWLpYzj8f8XV7M1cQv6nXcTjQpY9yK";
    const valid = await comparePassword(password, passwordHash);
    if (!user || !user.password || !valid) {
      return res.status(401).json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
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
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { name, email, password } = parsed.data;
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      return res.status(409).json({ error: "Email already registered", code: "EMAIL_EXISTS" });
    }
    const hashedPassword = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({ name, email, password: hashedPassword }).returning();
    const token = await createUserToken(user.id, user.email);
    setUserCookie(res, token);
    sendNewMemberNotification(user.name || name, user.email)
      .catch(err => req.log.warn({ err }, "Failed to send member notification"));
    return res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err: any) {
    req.log.error(err);
    const parsedErr = parseAuthError(err);
    return res.status(500).json(parsedErr);
  }
});

const PROFILE_FIELDS = {
  id: usersTable.id,
  email: usersTable.email,
  name: usersTable.name,
  role: usersTable.role,
  avatarUrl: usersTable.avatarUrl,
  bio: usersTable.bio,
  institution: usersTable.institution,
};

// GET /api/auth/me
router.get("/auth/me", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Not authenticated" });
    const [user] = await db.select(PROFILE_FIELDS)
      .from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/auth/register — alias for /auth/signup (frontend compatibility)
router.post("/auth/register", async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { name, email, password } = parsed.data;
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing) {
      return res.status(409).json({ error: "Email already registered", code: "EMAIL_EXISTS" });
    }
    const hashedPassword = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({ name, email, password: hashedPassword }).returning();
    const token = await createUserToken(user.id, user.email);
    setUserCookie(res, token);
    sendNewMemberNotification(user.name || name, user.email)
      .catch(err => req.log.warn({ err }, "Failed to send member notification"));
    return res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err: any) {
    req.log.error(err);
    const parsedErr = parseAuthError(err);
    return res.status(500).json(parsedErr);
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  clearUserCookie(res);
  return res.json({ success: true });
});

// POST /api/auth/change-password
router.post("/auth/change-password", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Not authenticated" });

    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(12).max(128),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    if (!user || !user.password) return res.status(400).json({ error: "Account has no password set" });

    const valid = await comparePassword(parsed.data.currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const hashed = await hashPassword(parsed.data.newPassword);
    await db.update(usersTable).set({ password: hashed, updatedAt: new Date() }).where(eq(usersTable.id, auth.userId));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to change password" });
  }
});

// PUT /api/auth/profile
router.put("/auth/profile", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Not authenticated" });

    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      bio: z.string().max(500).optional(),
      institution: z.string().max(200).optional(),
      avatarUrl: z.string().url().max(2000).optional().or(z.literal("")),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
    if (parsed.data.institution !== undefined) updates.institution = parsed.data.institution;
    if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl || null;

    const [user] = await db.update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, auth.userId))
      .returning(PROFILE_FIELDS);

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, user });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

// GET /api/users/:userId/profile — public profile page data
router.get("/users/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;
    const [user] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      bio: usersTable.bio,
      institution: usersTable.institution,
      avatarUrl: usersTable.avatarUrl,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });

    const articles = await db.select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      excerpt: articlesTable.excerpt,
      heroImageUrl: articlesTable.heroImageUrl,
      categorySlug: articlesTable.categorySlug,
      publishedAt: articlesTable.publishedAt,
    }).from(articlesTable)
      .leftJoin(submissionsTable, eq(articlesTable.submissionId, submissionsTable.id))
      .where(and(
        eq(articlesTable.status, "PUBLISHED"),
        eq(articlesTable.deleted, false),
        or(
          eq(submissionsTable.userId, userId),
          ilike(articlesTable.authorName, user.name || "__no_author_name__")
        )
      ))
      .orderBy(desc(articlesTable.publishedAt))
      .limit(20);

    const papers = await db.select({
      id: papersTable.id,
      slug: papersTable.slug,
      title: papersTable.title,
      abstract: papersTable.abstract,
      coverImageUrl: papersTable.coverImageUrl,
      categorySlug: papersTable.categorySlug,
      publishedAt: papersTable.publishedAt,
    }).from(papersTable)
      .leftJoin(submissionsTable, eq(papersTable.submissionId, submissionsTable.id))
      .where(and(
        eq(papersTable.status, "PUBLISHED"),
        eq(papersTable.deleted, false),
        or(
          eq(submissionsTable.userId, userId),
          ilike(papersTable.authorName, user.name || "__no_author_name__")
        )
      ))
      .orderBy(desc(papersTable.publishedAt))
      .limit(20);

    return res.json({ user, articles, papers });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// POST /api/auth/google — Verify Google ID Token and login/signup
router.post("/auth/google", async (req, res) => {
  try {
    const parsedCredential = z.object({
      credential: z.string().min(100).max(10_000),
    }).safeParse(req.body);
    if (!parsedCredential.success) {
      return res.status(400).json({ error: "Google credential is required" });
    }
    const { credential } = parsedCredential.data;

    // Verify token with Google's tokeninfo API
    const googleVerifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!googleVerifyRes.ok) {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    const payload = await googleVerifyRes.json() as {
      email?: string;
      name?: string;
      picture?: string;
      aud?: string;
      email_verified?: string;
    };
    
    // Safety check: Validate client ID if configured
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
    if (isProduction && !expectedClientId) {
      return res.status(503).json({ error: "Google sign-in is not configured" });
    }
    if (expectedClientId && payload.aud !== expectedClientId) {
      return res.status(400).json({ error: "Audience mismatch (Client ID does not match)" });
    }

    const email = payload.email?.trim().toLowerCase();
    if (!email || payload.email_verified !== "true") {
      return res.status(400).json({ error: "Email not provided by Google account" });
    }

    const name = payload.name || email.split("@")[0];
    const avatarUrl = payload.picture || null;

    // Check if user exists
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      // Auto-signup the user
      [user] = await db.insert(usersTable).values({
        name,
        email,
        avatarUrl,
        // Since they log in with Google, we don't set a password (it remains null/empty)
      }).returning();
      sendNewMemberNotification(user.name || name, user.email)
        .catch(err => req.log.warn({ err }, "Failed to send member notification"));
    } else if (!user.avatarUrl && avatarUrl) {
      // Update avatar if not already set
      const [updatedUser] = await db.update(usersTable)
        .set({ avatarUrl, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = updatedUser;
    }

    // Log the user in
    const token = await createUserToken(user.id, user.email);
    setUserCookie(res, token);

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

export default router;

