import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable, articlesTable, newsletterSubscribersTable, papersTable, submissionsTable, usersTable } from "@workspace/db";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import {
  hashPassword, comparePassword, createUserToken,
  getUserAuth, setUserCookie, clearUserCookie,
} from "../lib/auth";
import { z } from "zod";
import { sendNewMemberNotification } from "../lib/notifier";
import { ensureHandle, validateHandle, handleIsAvailable, generateHandle } from "../lib/handles";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const signupSchema = z.object({
  name: z.string().trim().min(1, "Account name is required").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  handle: z.string().trim().min(3, "Handle must be at least 3 characters").max(30, "Handle must be at most 30 characters"),
  age: z.coerce.number().int().min(10, "Please enter a valid age (10+)").max(120, "Please enter a valid age").optional().nullable(),
  location: z
    .string()
    .trim()
    .max(150)
    .refine((val) => !/\d/.test(val), {
      message: "Location (city, country, state) must not contain numbers",
    })
    .optional()
    .nullable(),
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
    if (errMsg.includes("handle")) {
      hint = "That scholar handle is already taken.";
      code = "HANDLE_TAKEN";
      error = "That handle is already taken by another scholar.";
    } else {
      hint = "A user with this email already exists.";
      code = "DB_UNIQUE_VIOLATION";
      error = "A user with this email already exists.";
    }
  }

  return { error, code, hint };
}

// GET /api/auth/handle-check?handle=... — live handle availability check
router.get("/auth/handle-check", async (req, res) => {
  try {
    const raw = String(req.query.handle || "").trim().replace(/^@/, "");
    if (!raw) return res.json({ available: false, reason: "Handle cannot be empty" });
    const check = validateHandle(raw);
    if (!check.ok) return res.json({ available: false, reason: check.reason });
    const available = await handleIsAvailable(check.handle);
    if (!available) return res.json({ available: false, reason: `Handle @${check.handle} is already taken.` });
    return res.json({ available: true, handle: check.handle });
  } catch {
    return res.json({ available: false, reason: "Failed to check handle" });
  }
});

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
    const handle = user.handle || (await ensureHandle(user.id, user.name, user.email));
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        handle,
        age: user.age,
        location: user.location,
      },
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Login failed" });
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
  location: usersTable.location,
  age: usersTable.age,
  handle: usersTable.handle,
};

async function handleSignup(req: any, res: any) {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: firstIssue, details: parsed.error.flatten() });
    }
    const { name, email, password, handle: requestedHandle, age, location } = parsed.data;

    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(ilike(usersTable.email, email)).limit(1);
    if (existing) {
      return res.status(409).json({ error: "Email already registered", code: "EMAIL_EXISTS" });
    }

    const cleanHandleStr = requestedHandle.replace(/^@/, "").toLowerCase();
    const check = validateHandle(cleanHandleStr);
    if (!check.ok) return res.status(400).json({ error: check.reason, code: "INVALID_HANDLE" });

    const available = await handleIsAvailable(check.handle);
    if (!available) {
      return res.status(409).json({
        error: `Handle @${check.handle} is already taken by another scholar. Please choose another handle.`,
        code: "HANDLE_TAKEN",
      });
    }

    const hashedPassword = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      name,
      email,
      password: hashedPassword,
      handle: check.handle,
      age: age ?? null,
      location: location ?? null,
    }).returning(PROFILE_FIELDS);

    // Automatically collect registered user email into newsletter subscriber database
    await db.insert(newsletterSubscribersTable)
      .values({ email, name })
      .onConflictDoUpdate({
        target: newsletterSubscribersTable.email,
        set: { isActive: true, ...(name ? { name } : {}) },
      })
      .catch(() => {});

    const token = await createUserToken(user.id, user.email);
    setUserCookie(res, token);
    sendNewMemberNotification(user.name || name, user.email)
      .catch(err => req.log.warn({ err }, "Failed to send member notification"));

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        handle: user.handle,
        age: user.age,
        location: user.location,
      },
    });
  } catch (err: any) {
    req.log.error(err);
    const parsedErr = parseAuthError(err);
    return res.status(500).json(parsedErr);
  }
}

// POST /api/auth/signup
router.post("/auth/signup", handleSignup);

// POST /api/auth/register — alias for /auth/signup
router.post("/auth/register", handleSignup);

// GET /api/auth/me
router.get("/auth/me", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Not authenticated" });

    let [user] = await db.select(PROFILE_FIELDS)
      .from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);

    if (!user && auth.email) {
      [user] = await db.select(PROFILE_FIELDS)
        .from(usersTable).where(ilike(usersTable.email, auth.email)).limit(1);
    }

    if (!user) {
      const [admin] = await db.select().from(adminsTable)
        .where(or(eq(adminsTable.id, auth.userId), ilike(adminsTable.email, auth.email)))
        .limit(1);
      if (admin) {
        user = {
          id: admin.id,
          email: admin.email,
          name: admin.name || "Admin",
          role: "ADMIN" as const,
          avatarUrl: null,
          bio: null,
          institution: "Ānvīkṣikī Editorial Desk",
          location: null,
          age: null,
          handle: null,
        };
      }
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    // Accounts made before handles existed get one the first time they sign
    // in, rather than needing anybody to run a migration.
    if (!(user as any).handle && user.id) {
      const handle = await ensureHandle(user.id, user.name, user.email);
      if (handle) (user as any).handle = handle;
    }

    return res.json({ user });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Could not load your account. Please try again.", code: "LOAD_FAILED" });
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
      name: z.string().trim().min(1).max(100).optional(),
      bio: z.string().trim().max(500).optional().nullable(),
      institution: z.string().trim().max(200).optional().nullable(),
      location: z
        .string()
        .trim()
        .max(150)
        .refine((val) => !/\d/.test(val), {
          message: "Location (city, country, state) must not contain numbers",
        })
        .optional()
        .nullable(),
      age: z.coerce.number().int().min(10).max(120).optional().nullable(),
      handle: z.string().trim().max(40).optional(),
      avatarUrl: z.string().max(2000).optional().or(z.literal("")).or(z.null()),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: firstIssue, details: parsed.error.flatten() });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
    if (parsed.data.institution !== undefined) updates.institution = parsed.data.institution;
    if (parsed.data.location !== undefined) updates.location = parsed.data.location;
    if (parsed.data.age !== undefined) updates.age = parsed.data.age;

    if (parsed.data.handle !== undefined) {
      const check = validateHandle(parsed.data.handle);
      if (!check.ok) return res.status(400).json({ error: check.reason, code: "INVALID_HANDLE" });
      if (!(await handleIsAvailable(check.handle, auth.userId))) {
        return res.status(409).json({ error: "That handle is already taken.", code: "HANDLE_TAKEN" });
      }
      updates.handle = check.handle;
    }
    if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl || null;

    const [user] = await db.update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, auth.userId))
      .returning(PROFILE_FIELDS);

    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, user });
  } catch (err: any) {
    req.log.error({ err }, "Failed to update profile");
    return res.status(500).json({
      error: err?.code === "23505"
        ? "That handle is already taken."
        : "Your profile could not be saved. Please try again in a moment.",
    });
  }
});

// GET /api/users/:userId/profile — public profile page data
router.get("/users/:userId/profile", async (req, res) => {
  try {
    const rawId = req.params.userId?.trim();
    const cleanHandle = rawId.replace(/^@/, "").toLowerCase();
    const [user] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      bio: usersTable.bio,
      institution: usersTable.institution,
      avatarUrl: usersTable.avatarUrl,
      handle: usersTable.handle,
    }).from(usersTable).where(
      or(
        eq(usersTable.id, rawId),
        eq(usersTable.handle, cleanHandle),
        eq(usersTable.handle, rawId)
      )
    ).limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });

    /*
      Work belongs to the account that submitted it.

      This used to match on the author's *name*, which is not an identity: it
      is a label anybody can type, two people can share, and one person can
      change. Two accounts with the same display name therefore showed each
      other's work. There was also a hardcoded exception that handed every
      article containing "Chaitanya" or "Xiyato" in its byline to any account
      whose name contained either — so signing up with such a name adopted
      somebody else's entire body of work.

      Ownership is the submission the publication came from, and that submission
      records the user who made it. Nothing else is a claim of authorship, only
      a description of one.
    */
    const articles = await db.select({
      id: articlesTable.id,
      slug: articlesTable.slug,
      title: articlesTable.title,
      subtitle: articlesTable.subtitle,
      excerpt: articlesTable.excerpt,
      heroImageUrl: articlesTable.heroImageUrl,
      categorySlug: articlesTable.categorySlug,
      publishedAt: articlesTable.publishedAt,
    }).from(articlesTable)
      .innerJoin(submissionsTable, eq(articlesTable.sourceSubmissionId, submissionsTable.id))
      .where(and(
        eq(articlesTable.status, "PUBLISHED"),
        isNull(articlesTable.deletedAt),
        eq(submissionsTable.userId, user.id),
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
      .innerJoin(submissionsTable, eq(papersTable.sourceSubmissionId, submissionsTable.id))
      .where(and(
        eq(papersTable.status, "PUBLISHED"),
        isNull(papersTable.deletedAt),
        eq(submissionsTable.userId, user.id),
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
      const generatedHandle = await generateHandle(name, email);
      // Auto-signup the user
      [user] = await db.insert(usersTable).values({
        name,
        email,
        avatarUrl,
        handle: generatedHandle,
      }).returning();
      sendNewMemberNotification(user.name || name, user.email)
        .catch(err => req.log.warn({ err }, "Failed to send member notification"));
    } else {
      const handle = user.handle || (await ensureHandle(user.id, user.name, user.email));
      if (!user.avatarUrl && avatarUrl) {
        const [updatedUser] = await db.update(usersTable)
          .set({ avatarUrl, handle, updatedAt: new Date() })
          .where(eq(usersTable.id, user.id))
          .returning();
        user = updatedUser;
      } else if (!user.handle && handle) {
        user.handle = handle;
      }
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
        avatarUrl: user.avatarUrl,
        handle: user.handle,
      }
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

export default router;
