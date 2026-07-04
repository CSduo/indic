import bcryptjs from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";

function makeSecret(envVar: string | undefined, name: string): Uint8Array {
  if (envVar) return new TextEncoder().encode(envVar);
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  if (isProd) {
    throw new Error(`Production environment detected but required secret "${name}" is not defined. Please configure it in your environment variables.`);
  }
  console.warn(
    `[auth] WARNING: ${name} env var is not set. Using a random per-process secret — ` +
    "all sessions will be invalidated on server restart. Set this variable for production."
  );
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

// Lazy singletons — evaluated on first use so a missing ADMIN_SECRET does NOT
// crash the serverless function during module initialisation (which would cause
// a blank 500 before Express can return any JSON error).
let _authSecret: Uint8Array | undefined;
let _adminSecret: Uint8Array | undefined;

function getAuthSecret(): Uint8Array {
  if (!_authSecret) _authSecret = makeSecret(process.env.AUTH_SECRET, "AUTH_SECRET");
  return _authSecret;
}

function getAdminSecret(): Uint8Array {
  if (!_adminSecret) _adminSecret = makeSecret(process.env.ADMIN_SECRET, "ADMIN_SECRET");
  return _adminSecret;
}

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
    .sign(getAuthSecret());
}

export async function verifyUserToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), { clockTolerance: 60 });
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
    .sign(getAdminSecret());
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getAdminSecret(), { clockTolerance: 60 });
    return payload as { adminId: string; email: string; role: string; type: string };
  } catch {
    return null;
  }
}

export function getUserTokenFromRequest(req: Request): string | null {
  // cookie-parser puts cookies in req.cookies
  const fromCookies = (req as any).cookies?.user_session;
  if (fromCookies) return fromCookies;
  // fallback: manual header parse
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)user_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getAdminTokenFromRequest(req: Request): string | null {
  const fromCookies = (req as any).cookies?.admin_session;
  if (fromCookies) return fromCookies;
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
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const sameSite = (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax";
  res.cookie("user_session", token, {
    httpOnly: true,
    secure: isProd || sameSite === "none",
    sameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function setAdminCookie(res: Response, token: string) {
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const sameSite = (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax";
  res.cookie("admin_session", token, {
    httpOnly: true,
    secure: isProd || sameSite === "none",
    sameSite,
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
