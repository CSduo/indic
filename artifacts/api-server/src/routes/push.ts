import { Router } from "express";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getUserAuth } from "../lib/auth";
import { getPushPublicKey, pushIsConfigured, sendPushToUser } from "../lib/push";

const router = Router();

/**
 * The site's public VAPID key, which the browser needs before it can create a
 * subscription. Public by design — it is the half of the keypair that proves
 * to the push service which site a message came from.
 */
router.get("/push/public-key", (_req, res) => {
  if (!pushIsConfigured()) {
    return res.status(503).json({
      error: "Push notifications are not configured on this server.",
      code: "PUSH_NOT_CONFIGURED",
      configured: false,
    });
  }
  return res.json({ publicKey: getPushPublicKey(), configured: true });
});

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

/**
 * Register this browser for notifications, against the signed-in account.
 *
 * Requiring a session is what ties delivery to the account rather than to the
 * device: sign out and the row stays but is never selected, because every send
 * is looked up by user id. Signing back in resumes it without asking again.
 */
router.post("/push/subscribe", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Sign in to enable notifications" });

    if (!pushIsConfigured()) {
      return res.status(503).json({ error: "Push notifications are not configured", code: "PUSH_NOT_CONFIGURED" });
    }

    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid subscription", details: parsed.error.flatten() });
    }

    const { endpoint, keys } = parsed.data;
    const userAgent = (req.get("user-agent") || "").slice(0, 300);
    const now = new Date();

    // The browser reissues the same endpoint for the same device, so a repeat
    // approval must update the existing row — including moving it to a
    // different account if someone else signs in on a shared machine.
    await db
      .insert(pushSubscriptionsTable)
      .values({
        userId: auth.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        lastUsedAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          userId: auth.userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
          lastUsedAt: now,
        },
      });

    return res.status(201).json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to store push subscription");
    return res.status(500).json({ error: "Could not enable notifications" });
  }
});

/** Drop this browser's registration — on sign-out, or when switched off. */
router.post("/push/unsubscribe", async (req, res) => {
  try {
    const parsed = z.object({ endpoint: z.string().url().max(2000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid endpoint" });

    const auth = await getUserAuth(req);
    // An unauthenticated call may still remove the row for its own endpoint:
    // the endpoint is an unguessable, browser-issued URL, and someone whose
    // session has already expired still needs to be able to turn this off.
    await db.delete(pushSubscriptionsTable).where(
      auth
        ? and(
            eq(pushSubscriptionsTable.endpoint, parsed.data.endpoint),
            eq(pushSubscriptionsTable.userId, auth.userId),
          )
        : eq(pushSubscriptionsTable.endpoint, parsed.data.endpoint),
    );

    return res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Failed to remove push subscription");
    return res.status(500).json({ error: "Could not disable notifications" });
  }
});

/** Whether this browser is already registered, so the UI can show the truth. */
router.get("/push/status", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.json({ configured: pushIsConfigured(), signedIn: false, subscriptions: 0 });

    const rows = await db
      .select({ id: pushSubscriptionsTable.id })
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, auth.userId));

    return res.json({ configured: pushIsConfigured(), signedIn: true, subscriptions: rows.length });
  } catch (err) {
    req.log?.error({ err }, "Failed to read push status");
    return res.status(500).json({ error: "Could not read notification status" });
  }
});

/** Send a test notification to the caller's own devices. */
router.post("/push/test", async (req, res) => {
  try {
    const auth = await getUserAuth(req);
    if (!auth) return res.status(401).json({ error: "Sign in first" });
    const result = await sendPushToUser(auth.userId, {
      title: "Ānvīkṣikī",
      body: "Notifications are working. This is what one looks like.",
      url: "/account/notifications",
      tag: "test",
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    req.log?.error({ err }, "Failed to send test push");
    return res.status(500).json({ error: "Could not send a test notification" });
  }
});

export default router;
