import nodemailer from "nodemailer";
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

export type ContactNotification = {
  name: string;
  email: string;
  inquiryType?: string;
  subject: string;
  message: string;
};

function smtpTransport() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function smtpFrom(label: string): string {
  return process.env.SMTP_FROM || `"${label}" <${process.env.SMTP_USER}>`;
}

async function postWebhook(event: string, data: unknown, text: string): Promise<boolean> {
  if (!process.env.NOTIFICATION_WEBHOOK_URL) return false;
  const response = await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, text, data }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}

export async function sendSubmissionNotification(sub: SubmissionNotificationData): Promise<void> {
  const reviewUrl = process.env.PUBLIC_SITE_URL
    ? `${process.env.PUBLIC_SITE_URL.replace(/\/$/, "")}/admin/submissions`
    : "Admin submissions dashboard";
  const messageText = [
    "New submission received",
    `Author: ${sub.submitterName} (${sub.submitterEmail})`,
    `Title: ${sub.title}`,
    `Type: ${sub.type}`,
    `Domain: ${sub.domain || "Unassigned"}`,
    `Review: ${reviewUrl}`,
  ].join("\n");

  logger.info({ submissionId: sub.id }, "Dispatching submission notifications");
  const deliveries: Promise<unknown>[] = [];

  if (process.env.NOTIFICATION_WEBHOOK_URL) {
    deliveries.push(postWebhook("submission.created", sub, messageText));
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    deliveries.push(fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: messageText,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    ).then(response => {
      if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
    }));
  }

  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER &&
    process.env.NOTIFICATION_TO_NUMBER
  ) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const from = process.env.TWILIO_FROM_NUMBER;
    const to = process.env.NOTIFICATION_TO_NUMBER;
    const useWhatsApp = from.startsWith("whatsapp:") || to.startsWith("whatsapp:");
    const body = new URLSearchParams({
      From: useWhatsApp && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from,
      To: useWhatsApp && !to.startsWith("whatsapp:") ? `whatsapp:${to}` : to,
      Body: messageText,
    });
    deliveries.push(fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(10_000),
      },
    ).then(response => {
      if (!response.ok) throw new Error(`Twilio returned ${response.status}`);
    }));
  }

  if (process.env.CALLMEBOT_API_KEY && process.env.WHATSAPP_PHONE) {
    const query = new URLSearchParams({
      phone: process.env.WHATSAPP_PHONE,
      text: messageText,
      apikey: process.env.CALLMEBOT_API_KEY,
    });
    deliveries.push(fetch(`https://api.callmebot.com/whatsapp.php?${query}`, {
      signal: AbortSignal.timeout(10_000),
    }).then(response => {
      if (!response.ok) throw new Error(`CallMeBot returned ${response.status}`);
    }));
  }

  const results = await Promise.allSettled(deliveries);
  const failures = results.filter(result => result.status === "rejected");
  if (failures.length) {
    logger.warn(
      { submissionId: sub.id, failures: failures.length, channels: results.length },
      "One or more submission notifications failed",
    );
  }
}

export async function sendNewMemberNotification(
  memberName: string,
  memberEmail: string,
): Promise<void> {
  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL;
  const transporter = smtpTransport();
  if (!recipient || !transporter) {
    logger.debug("Member email notification is not configured");
    return;
  }

  await transporter.sendMail({
    from: smtpFrom("Anvikshiki Server"),
    to: recipient,
    subject: "Anvikshiki: new community member",
    text: [
      "A new member has joined the Anvikshiki community.",
      "",
      `Name: ${memberName}`,
      `Email: ${memberEmail}`,
    ].join("\n"),
  });
}

/** Deliver a contact request through at least one configured durable channel. */
export async function sendContactNotification(contact: ContactNotification): Promise<boolean> {
  let delivered = false;

  if (process.env.NOTIFICATION_WEBHOOK_URL) {
    delivered = await postWebhook(
      "contact.created",
      contact,
      `Contact request from ${contact.name}: ${contact.subject}`,
    );
  }

  const recipient = process.env.CONTACT_TO_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;
  const transporter = smtpTransport();
  if (recipient && transporter) {
    await transporter.sendMail({
      from: smtpFrom("Anvikshiki Contact"),
      to: recipient,
      replyTo: contact.email,
      subject: `[Contact] ${contact.subject}`,
      text: [
        `Name: ${contact.name}`,
        `Email: ${contact.email}`,
        `Type: ${contact.inquiryType || "General"}`,
        "",
        contact.message,
      ].join("\n"),
    });
    delivered = true;
  }

  return delivered;
}
