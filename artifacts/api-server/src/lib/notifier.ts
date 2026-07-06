import { logger } from "./logger";

interface SubmissionNotificationData {
  id: string;
  submitterName: string;
  submitterEmail: string;
  type: string;
  title: string;
  domain?: string | null;
  abstract?: string | null;
}

/**
 * Sends a notification to the administrator when a new submission is uploaded.
 * Supports:
 * - General Webhook (Zapier/Make/custom SMS gateway) via NOTIFICATION_WEBHOOK_URL
 * - Telegram Bot via TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID
 * - Twilio SMS/WhatsApp via TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, NOTIFICATION_TO_NUMBER
 */
export async function sendSubmissionNotification(sub: SubmissionNotificationData): Promise<void> {
  const messageText = `✨ *New Submission Received* ✨\n\n` +
    `👤 *Author:* ${sub.submitterName} (${sub.submitterEmail})\n` +
    `📖 *Title:* ${sub.title}\n` +
    `🏷️ *Type:* ${sub.type}\n` +
    `📂 *Domain:* ${sub.domain || "Unassigned"}\n` +
    `🔗 *Review Link:* https://anvikshikijournal.in/admin/submissions`;

  logger.info({ submissionId: sub.id }, "Triggering submission notifications...");

  // 1. General Webhook (Zapier, Make, custom SMS gateways)
  if (process.env.NOTIFICATION_WEBHOOK_URL) {
    try {
      await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "submission.created",
          text: messageText,
          data: sub,
        }),
      });
      logger.info("Webhook notification sent successfully");
    } catch (err: any) {
      logger.error({ error: err.message }, "Failed to send webhook notification");
    }
  }

  // 2. Telegram Bot (Free, reliable, and instant mobile alerts)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: messageText,
          parse_mode: "Markdown",
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Telegram API returned ${res.status}: ${body}`);
      }
      logger.info("Telegram notification sent successfully");
    } catch (err: any) {
      logger.error({ error: err.message }, "Failed to send Telegram notification");
    }
  }

  // 3. Twilio SMS / WhatsApp
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER &&
    process.env.NOTIFICATION_TO_NUMBER
  ) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM_NUMBER;
      const to = process.env.NOTIFICATION_TO_NUMBER;

      const isWhatsApp = from.startsWith("whatsapp:") || to.startsWith("whatsapp:");
      const finalFrom = isWhatsApp && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from;
      const finalTo = isWhatsApp && !to.startsWith("whatsapp:") ? `whatsapp:${to}` : to;

      const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
      
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const bodyParams = new URLSearchParams();
      bodyParams.append("From", finalFrom);
      bodyParams.append("To", finalTo);
      bodyParams.append("Body", messageText.replace(/\*/g, "")); // Strip markdown asterisks for clean text SMS

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Twilio API returned ${res.status}: ${body}`);
      }
      logger.info("Twilio SMS/WhatsApp notification sent successfully");
    } catch (err: any) {
      logger.error({ error: err.message }, "Failed to send Twilio notification");
    }
  }
}
