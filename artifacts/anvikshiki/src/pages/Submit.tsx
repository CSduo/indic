import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useCreateSubmission } from "@workspace/api-client-react";

interface FormValues {
  name: string;
  email: string;
  type: "article" | "paper";
  title: string;
  abstract: string;
  notes: string;
}

export function Submit() {
  const [submitted, setSubmitted] = useState(false);
  const mutation = useCreateSubmission();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { type: "article" } });

  function onSubmit(data: FormValues) {
    mutation.mutate(
      {
        data: {
          name: data.name,
          email: data.email,
          type: data.type,
          title: data.title,
          abstract: data.abstract || undefined,
          notes: data.notes || undefined,
        },
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: () => alert("Submission failed. Please try again."),
      },
    );
  }

  const fieldStyle = {
    background: "var(--surface)",
    border: "1px solid var(--line-2)",
    color: "var(--ink)",
    fontFamily: "var(--font-ui)",
    borderRadius: "0.5rem",
    padding: "0.625rem 0.875rem",
    width: "100%",
    fontSize: "0.875rem",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.375rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--muted-text)",
    fontFamily: "var(--font-ui)",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1
          className="text-3xl md:text-4xl font-bold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Submit Your Work
        </h1>
        <p
          className="text-base leading-relaxed mb-8"
          style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}
        >
          Ānvīkṣikī welcomes essays of intellectual depth, original research, and serious civilisational inquiry. We read every submission.
        </p>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl p-8 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--line-2)" }}
          >
            <div
              className="text-4xl mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}
            >
              Received.
            </div>
            <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}>
              Thank you for your submission. Our editorial team will review it and be in touch within four to six weeks.
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Type */}
            <div>
              <label style={labelStyle}>Type of Submission</label>
              <div className="flex gap-3">
                {(["article", "paper"] as const).map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-all text-sm"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line-2)",
                      fontFamily: "var(--font-ui)",
                      color: "var(--ink)",
                    }}
                  >
                    <input type="radio" value={t} {...register("type")} className="accent-[var(--gold)]" />
                    {t === "article" ? "Essay / Long-form" : "Academic Paper"}
                  </label>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={labelStyle}>Your Name *</label>
              <input
                style={fieldStyle}
                placeholder="Full name"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && <p className="text-xs mt-1" style={{ color: "var(--rose)" }}>{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                style={fieldStyle}
                placeholder="your@email.com"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && <p className="text-xs mt-1" style={{ color: "var(--rose)" }}>{errors.email.message}</p>}
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>Title of Work *</label>
              <input
                style={fieldStyle}
                placeholder="Working title"
                {...register("title", { required: "Title is required" })}
              />
              {errors.title && <p className="text-xs mt-1" style={{ color: "var(--rose)" }}>{errors.title.message}</p>}
            </div>

            {/* Abstract */}
            <div>
              <label style={labelStyle}>Abstract / Summary</label>
              <textarea
                style={{ ...fieldStyle, resize: "vertical", minHeight: 120 }}
                placeholder="A brief summary of your argument, method, and contribution (200–400 words recommended)"
                {...register("abstract")}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes to the Editors</label>
              <textarea
                style={{ ...fieldStyle, resize: "vertical", minHeight: 80 }}
                placeholder="Any context, prior publication, or editorial notes"
                {...register("notes")}
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: "var(--gold)",
                color: "var(--bg)",
                fontFamily: "var(--font-ui)",
                opacity: mutation.isPending ? 0.7 : 1,
              }}
            >
              {mutation.isPending ? "Submitting..." : "Submit for Review"}
            </button>
          </form>
        )}

        {/* Guidelines */}
        <div
          className="mt-10 p-5 rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}>
            Submission Guidelines
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}>
            <li>Essays: 3,000–10,000 words. Papers: 5,000–15,000 words.</li>
            <li>Original, previously unpublished work only.</li>
            <li>Works in English, Hindi, or Sanskrit with translation are welcome.</li>
            <li>All sources must be cited with full bibliographic detail.</li>
            <li>Authors retain copyright. Ānvīkṣikī receives first publication rights.</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
