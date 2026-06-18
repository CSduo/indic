"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, Image, Lock, Check } from "lucide-react";
import { toast } from "sonner";

const SUBMISSION_TYPES = [
  { value: "ESSAY", label: "Essay / Paper", icon: FileText },
  { value: "REVIEW", label: "Review / Commentary", icon: FileText },
];

export default function SubmitPage() {
  const [type, setType] = useState("ESSAY");
  const [form, setForm] = useState({
    submitterName: "",
    submitterEmail: "",
    title: "",
    abstract: "",
    notes: "",
    consent: false,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) {
      toast.error("Please confirm this work is yours");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type }),
      });

      if (res.ok) {
        const data = await res.json();
        // Upload files if any
        if (files.length > 0 && data.submission?.id) {
          for (const file of files) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("category", "manuscript");
            fd.append("submissionId", data.submission.id);
            await fetch("/api/upload", { method: "POST", body: fd });
          }
        }
        if (images.length > 0 && data.submission?.id) {
          for (const img of images) {
            const fd = new FormData();
            fd.append("file", img);
            fd.append("category", "image");
            fd.append("submissionId", data.submission.id);
            await fetch("/api/upload", { method: "POST", body: fd });
          }
        }
        setSubmitted(true);
        toast.success("Submission received!");
      } else {
        toast.error("Failed to submit. Please try again.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[100dvh] pb-24 flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center max-w-md mx-auto px-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(138, 160, 113, 0.2)" }}
          >
            <Check size={32} style={{ color: "var(--sage)" }} />
          </div>
          <h1 className="font-display text-3xl" style={{ color: "var(--ink)" }}>
            Submission Received
          </h1>
          <p className="font-body mt-3" style={{ color: "var(--muted)" }}>
            Thank you for your contribution. Our editorial team will review your submission and respond within 2-4 weeks.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>
      <div className="container-anv pt-4">
        <Link href="/" className="inline-flex items-center gap-2 font-ui text-sm" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      {/* Hero Section */}
      <div className="container-anv pt-4 pb-6">
        <div className="card-anv overflow-hidden">
          <div
            className="relative min-h-[200px] md:min-h-[280px] flex flex-col justify-end p-6 md:p-10 bg-cover bg-center"
            style={{
              backgroundImage: "url('/submit_hero.jpg')",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, color-mix(in srgb, var(--bg) 85%, transparent) 0%, transparent 100%)",
              }}
            />
            <div className="relative z-10">
              <span className="font-ui text-xs font-semibold tracking-[0.2em] uppercase mb-3 block" style={{ color: "var(--gold)" }}>
                Submission Portal
              </span>
              <h1 className="font-display text-3xl md:text-5xl" style={{ color: "var(--ink)" }}>
                Submit Your Work
              </h1>
              <p className="font-body mt-2 italic" style={{ color: "var(--muted)" }}>
                Share your research. Contribute to knowledge.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-anv max-w-2xl">
        <form onSubmit={handleSubmit} className="mt-6 card-anv p-6 md:p-8 space-y-6">
          {/* Submission Type */}
          <div>
            <label className="font-ui text-xs font-semibold tracking-[0.1em] uppercase mb-3 block" style={{ color: "var(--gold)" }}>
              Submission Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SUBMISSION_TYPES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setType(st.value)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-ui text-sm font-medium transition-all"
                  style={{
                    background: type === st.value ? "var(--gold)" : "var(--surface-soft)",
                    color: type === st.value ? "#1a1108" : "var(--ink)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <st.icon size={16} />
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Email */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={form.submitterName}
                onChange={(e) => setForm({ ...form, submitterName: e.target.value })}
                className="input-anv"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                value={form.submitterEmail}
                onChange={(e) => setForm({ ...form, submitterEmail: e.target.value })}
                className="input-anv"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
              Title of Your Work *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-anv"
              placeholder="Enter title"
            />
          </div>

          {/* Abstract */}
          <div>
            <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
              Abstract *
            </label>
            <textarea
              required
              rows={5}
              value={form.abstract}
              onChange={(e) => setForm({ ...form, abstract: e.target.value })}
              className="input-anv resize-none"
              placeholder="Provide a brief summary of your work (150-250 words)."
            />
            <span className="font-ui text-xs mt-1 block text-right" style={{ color: "var(--muted)" }}>
              {form.abstract.length} / 2500
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
              Notes to Editors (Optional)
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-anv resize-none"
              placeholder="Any additional information for the editorial team."
            />
          </div>

          {/* File Upload - Manuscript */}
          <div>
            <label className="font-ui text-xs font-semibold tracking-[0.1em] uppercase mb-3 block" style={{ color: "var(--gold)" }}>
              Upload Your Paper {type === "ESSAY" ? "*" : ""}
            </label>
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
              style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
            >
              <Upload size={24} className="mx-auto mb-2" style={{ color: "var(--muted)" }} />
              <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>
                Drag & drop your file here or click to browse
              </p>
              <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>
                PDF, DOC, DOCX · Max 50 MB
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="hidden"
                id="manuscript-upload"
              />
              <label htmlFor="manuscript-upload" className="btn-secondary mt-3 inline-flex cursor-pointer">
                Select File
              </label>
              {files.length > 0 && (
                <div className="mt-3 space-y-1">
                  {files.map((f, i) => (
                    <p key={i} className="font-ui text-xs" style={{ color: "var(--sage)" }}>
                      {f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="font-ui text-xs font-semibold tracking-[0.1em] uppercase mb-3 block" style={{ color: "var(--gold)" }}>
              Upload Cover / Supporting Image (Optional)
            </label>
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
              style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
            >
              <Image size={24} className="mx-auto mb-2" style={{ color: "var(--muted)" }} />
              <p className="font-ui text-sm" style={{ color: "var(--muted)" }}>
                Drag & drop image here or click to browse
              </p>
              <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>
                JPG, PNG, WEBP · Max 20 MB
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImages(Array.from(e.target.files || []))}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="btn-secondary mt-3 inline-flex cursor-pointer">
                Select Images
              </label>
              {images.length > 0 && (
                <div className="mt-3 space-y-1">
                  {images.map((img, i) => (
                    <p key={i} className="font-ui text-xs" style={{ color: "var(--sage)" }}>
                      {img.name} ({(img.size / 1024 / 1024).toFixed(1)} MB)
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Consent */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-1 w-4 h-4 rounded"
            />
            <span className="font-ui text-sm" style={{ color: "var(--muted)" }}>
              I confirm this work is mine or I have permission to submit it.
            </span>
          </label>

          {/* Submit */}
          <div className="flex items-center gap-4 pt-4">
            <button type="submit" disabled={loading} className="btn-primary w-full md:w-auto">
              {loading ? "Submitting..." : "Submit for Review"}
            </button>
            <div className="flex items-center gap-1 font-ui text-xs" style={{ color: "var(--muted)" }}>
              <Lock size={12} /> Your submission is secure and confidential.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
