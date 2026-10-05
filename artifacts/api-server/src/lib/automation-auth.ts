import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getAdminAuth } from "./auth";

/**
 * Vercel Cron calls scheduled paths with `Authorization: Bearer <CRON_SECRET>`.
 * Compared in constant time; an unset CRON_SECRET authorises nothing.
 */
export function isCronAuthorized(authorization: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Guard for anything that makes the site contact search engines (reindex
 * sweeps, IndexNow notifications) or reveals their dispatch history.
 *
 * Allowed callers: the Vercel scheduler (Bearer CRON_SECRET) or a signed-in
 * administrator. There is deliberately no shared-secret header any more: the
 * old `x-seo-secret` accepted ADMIN_SECRET / AUTH_SECRET, which are the JWT
 * signing keys and must never travel in a request.
 */
export async function requireCronOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (isCronAuthorized(req.get("authorization"))) return next();

  const auth = await getAdminAuth(req).catch(() => null);
  if (auth) {
    (req as any).adminAuth = auth;
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}
