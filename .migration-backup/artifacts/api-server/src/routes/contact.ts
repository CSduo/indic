import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  inquiryType: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

router.post('/contact', async (req, res) => {
  try {
    const data = contactSchema.parse(req.body);
    // In production, this would send an email or store in DB
    // For now, log and return success
    console.log('[Contact Form]', { name: data.name, email: data.email, subject: data.subject });
    return res.json({ success: true, message: 'Your message has been received. We will respond within 3-5 business days.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    return res.status(500).json({ error: 'Failed to process contact form' });
  }
});

export default router;
