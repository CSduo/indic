import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const submissionSchema = z.object({
  type: z.enum(["ESSAY", "PAPER", "REVIEW", "COMMENTARY"]),
  submitterName: z.string().min(1, "Name is required").max(160),
  submitterEmail: z.string().email("Invalid email address"),
  title: z.string().min(1, "Title is required").max(500),
  abstract: z.string().min(1, "Abstract is required").max(5000),
  notes: z.string().max(2000).optional(),
  consent: z.boolean().refine((v) => v === true, {
    message: "You must confirm this work is yours",
  }),
});

export const newsletterSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().max(160).optional(),
});

export const articleSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  subtitle: z.string().max(500).optional(),
  excerpt: z.string().max(2000).optional(),
  body: z.string().optional(),
  categorySlug: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).default([]),
  authorName: z.string().max(160).optional(),
  heroImageUrl: z.string().optional(),
  heroImageAlt: z.string().optional(),
  keyTakeaways: z.array(z.string()).default([]),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  audioUrl: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  featured: z.boolean().default(false),
  publishedAt: z.string().optional(),
});

export const paperSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  abstract: z.string().max(10000).optional(),
  body: z.string().optional(),
  categorySlug: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).default([]),
  authorName: z.string().max(160).optional(),
  pdfUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  citationText: z.string().optional(),
  peerReviewed: z.boolean().default(false),
  paperType: z
    .enum([
      "RESEARCH_PAPER",
      "WORKING_PAPER",
      "REVIEW_ESSAY",
      "MONOGRAPH",
      "TRANSLATION",
      "ARCHIVAL_NOTE",
    ])
    .default("RESEARCH_PAPER"),
  year: z.number().optional(),
  doi: z.string().optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  publishedAt: z.string().optional(),
});

export const submissionStatusSchema = z.object({
  status: z.enum([
    "RECEIVED",
    "UNDER_REVIEW",
    "REVISION_REQUESTED",
    "ACCEPTED",
    "REJECTED",
    "PUBLISHED",
    "ARCHIVED",
  ]),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type ArticleInput = z.infer<typeof articleSchema>;
export type PaperInput = z.infer<typeof paperSchema>;
export type SubmissionStatusInput = z.infer<typeof submissionStatusSchema>;
