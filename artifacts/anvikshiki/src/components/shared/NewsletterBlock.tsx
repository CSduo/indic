"use client";

import { useState } from "react";
import { Mail, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

export function NewsletterBlock() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSuccess(true);
        setEmail("");
        toast.success("Subscribed successfully!");
      } else if (res.status === 409) {
        toast.info("You're already subscribed!");
      } else {
        toast.error("Failed to subscribe. Please try again.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-[22px] p-6 md:p-8"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <span
            className="font-ui text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: "var(--rose)" }}
          >
            Join the Conversation
          </span>
          <p className="font-body mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Thoughtful essays. Timeless ideas.<br className="hidden md:block" />{" "}
            Once a month, no more.
          </p>
        </div>

        {success ? (
          <div className="flex items-center gap-2" style={{ color: "var(--sage)" }}>
            <Check size={18} />
            <span className="font-ui text-sm font-medium">You're subscribed!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted)" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-anv pl-9 w-full"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-4"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "..." : <ArrowRight size={16} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
