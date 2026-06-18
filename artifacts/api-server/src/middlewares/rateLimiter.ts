import type { Request, Response, NextFunction } from "express";

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    next();
  };
}

export const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000);
export const submitRateLimiter = createRateLimiter(3, 60 * 60 * 1000);
export const newsletterRateLimiter = createRateLimiter(3, 60 * 60 * 1000);
export const searchRateLimiter = createRateLimiter(60, 60 * 1000);
