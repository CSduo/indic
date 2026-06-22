import bcryptjs from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret-change-in-production"
);

const ADMIN_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SECRET || "admin-secret-change-in-production"
);

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function createUserToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email, type: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(AUTH_SECRET);
}

export async function verifyUserToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET, { clockTolerance: 60 });
    return payload as { userId: string; email: string; type: string };
  } catch {
    return null;
  }
}

export async function createAdminToken(adminId: string, email: string, role: string): Promise<string> {
  return new SignJWT({ adminId, email, role, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(ADMIN_SECRET);
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, ADMIN_SECRET, { clockTolerance: 60 });
    return payload as { adminId: string; email: string; role: string; type: string };
  } catch {
    return null;
  }
}

export function getUserTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)user_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getAdminTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)admin_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getUserAuth(req: Request) {
  const token = getUserTokenFromRequest(req);
  if (!token) return null;
  return verifyUserToken(token);
}

export async function getAdminAuth(req: Request) {
  const token = getAdminTokenFromRequest(req);
  if (!token) return null;
  return verifyAdminToken(token);
}

export function setUserCookie(res: Response, token: string) {
  res.cookie("user_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function setAdminCookie(res: Response, token: string) {
  res.cookie("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearUserCookie(res: Response) {
  res.clearCookie("user_session", { path: "/" });
}

export function clearAdminCookie(res: Response) {
  res.clearCookie("admin_session", { path: "/" });
}
