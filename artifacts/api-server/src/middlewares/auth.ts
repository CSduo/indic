import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { adminSessionsTable, adminsTable } from "@workspace/db";
import { eq, gt } from "drizzle-orm";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.["anvikshiki_session"] as string | undefined;
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [session] = await db
    .select()
    .from(adminSessionsTable)
    .where(eq(adminSessionsTable.id, sessionId))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.id, session.adminId))
    .limit(1);

  if (!admin) {
    res.status(401).json({ error: "Admin not found" });
    return;
  }

  (req as Request & { admin: typeof admin }).admin = admin;
  next();
}
