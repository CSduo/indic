import { Router } from "express";
import { z } from "zod";
import {
  db,
  conversationsTable,
  conversationMembersTable,
  messagesTable,
  usersTable,
} from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { sendContactNotification } from "../lib/notifier";
import { getUserAuth } from "../lib/auth";
import { directKeyFor, previewOf, touchConversation } from "../lib/messaging";
import { notifyUser } from "../lib/notify";

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  email: z.string().trim().toLowerCase().email("Valid email is required"),
  type: z.string().max(80).optional(),
  inquiryType: z.string().max(80).optional(),
  subject: z.string().trim().max(300).optional().default("General Enquiry"),
  message: z.string().trim().min(1, "Message is required").max(10_000),
});

const INQUIRY_LABELS: Record<string, string> = {
  submission: "Submission Enquiry",
  editorial: "Editorial Matter",
  partnership: "Partnership / Collaboration",
  technical: "Technical Issue",
  other: "General Enquiry",
};

router.post("/contact", async (req, res) => {
  try {
    const rawData = req.body || {};
    const rawType = rawData.type || rawData.inquiryType || "other";
    const typeLabel = INQUIRY_LABELS[rawType] || rawType;

    const data = contactSchema.parse({
      ...rawData,
      type: rawType,
      inquiryType: rawType,
      subject: rawData.subject?.trim() || `${typeLabel} from ${rawData.name || "Scholar"}`,
    });

    const auth = await getUserAuth(req).catch(() => null);

    // 1. Send email / webhook notification
    sendContactNotification(data).catch((err) => {
      req.log?.warn({ err }, "Email/webhook contact dispatch skipped or failed");
    });

    // 2. Resolve the website owner / admin accounts
    let adminUsers = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        handle: usersTable.handle,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "ADMIN"));

    if (adminUsers.length === 0) {
      const [firstUser] = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          handle: usersTable.handle,
        })
        .from(usersTable)
        .orderBy(usersTable.createdAt)
        .limit(1);
      if (firstUser) adminUsers = [firstUser];
    }

    // 3. Resolve sender entity (logged-in user or registered account by email)
    let senderId = auth?.userId || null;
    if (!senderId) {
      const [existingUser] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(ilike(usersTable.email, data.email))
        .limit(1);
      if (existingUser) {
        senderId = existingUser.id;
      }
    }

    // Structured message body for the direct message thread
    const formattedMessage = [
      `📬 [Contact Form Enquiry]`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `From: ${data.name} (${data.email})`,
      `Nature of Enquiry: ${typeLabel}`,
      `Subject: ${data.subject}`,
      ``,
      data.message,
    ].join("\n");

    const messagePreview = previewOf({
      kind: "TEXT",
      body: formattedMessage,
      mediaName: null,
    });

    // 4. Route direct message and instant notification to the site owner / admins
    for (const admin of adminUsers) {
      try {
        let conversationId: string | null = null;

        if (senderId && senderId !== admin.id) {
          // Direct 1-on-1 thread between the sender and the site owner
          const key = directKeyFor(senderId, admin.id);
          const [existingConv] = await db
            .select({ id: conversationsTable.id })
            .from(conversationsTable)
            .where(eq(conversationsTable.directKey, key))
            .limit(1);

          if (existingConv) {
            conversationId = existingConv.id;
          } else {
            const [newConv] = await db
              .insert(conversationsTable)
              .values({
                kind: "DIRECT",
                directKey: key,
                requestedBy: senderId,
                acceptedAt: new Date(), // Auto-accept contact submissions
                lastMessagePreview: messagePreview,
              })
              .returning({ id: conversationsTable.id });
            conversationId = newConv.id;

            await db.insert(conversationMembersTable).values([
              { conversationId: newConv.id, userId: senderId, role: "MEMBER" },
              { conversationId: newConv.id, userId: admin.id, role: "MEMBER" },
            ]);
          }
        } else {
          // Guest inquiry or owner self-test: deliver into a dedicated Contact Inquiries thread for the owner
          const deskKey = `contact-desk-${admin.id}`;
          const [existingConv] = await db
            .select({ id: conversationsTable.id })
            .from(conversationsTable)
            .where(eq(conversationsTable.directKey, deskKey))
            .limit(1);

          if (existingConv) {
            conversationId = existingConv.id;
          } else {
            const [newConv] = await db
              .insert(conversationsTable)
              .values({
                kind: "GROUP",
                title: "Contact Desk & Enquiries",
                directKey: deskKey,
                acceptedAt: new Date(),
                lastMessagePreview: messagePreview,
              })
              .returning({ id: conversationsTable.id });
            conversationId = newConv.id;

            await db.insert(conversationMembersTable).values([
              { conversationId: newConv.id, userId: admin.id, role: "ADMIN" },
            ]);
          }
        }

        if (conversationId) {
          // Write message to the thread
          await db.insert(messagesTable).values({
            conversationId,
            senderId: senderId || null,
            kind: "TEXT",
            body: formattedMessage,
          });

          // Bump timestamp & preview on conversation
          await touchConversation(conversationId, messagePreview);

          // Trigger in-app notification & Web Push to owner
          await notifyUser({
            userId: admin.id,
            type: "MESSAGE",
            message: `Contact Enquiry from ${data.name}: ${data.subject}`,
            href: `/messages/${conversationId}`,
            pushTitle: `📬 Contact: ${data.name}`,
          }).catch(() => {});
        }
      } catch (dmErr) {
        req.log?.warn({ err: dmErr }, "Could not route contact form to owner DM");
      }
    }

    return res.json({
      success: true,
      message: "Your message has been received. We will respond within 3–5 business days.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    req.log?.error({ err }, "Failed to deliver contact form");
    return res.status(502).json({ error: "Failed to deliver contact form" });
  }
});

export default router;
