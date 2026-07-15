import { Router } from 'express';
import { z } from 'zod';
import { sendContactNotification } from '../lib/notifier';

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  inquiryType: z.string().max(80).optional(),
  subject: z.string().trim().min(1, 'Subject is required').max(300),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(10_000),
});

router.post('/contact', async (req, res) => {
  try {
    const data = contactSchema.parse(req.body);
    const delivered = await sendContactNotification(data);
    if (!delivered) {
      return res.status(503).json({
        error: 'Contact delivery is temporarily unavailable. Please try again later.',
      });
    }
    return res.json({ success: true, message: 'Your message has been received. We will respond within 3-5 business days.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    req.log.error({ err }, 'Failed to deliver contact form');
    return res.status(502).json({ error: 'Failed to deliver contact form' });
  }
});

export default router;
