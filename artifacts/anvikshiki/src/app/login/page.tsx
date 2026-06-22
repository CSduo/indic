import { useLocation } from 'wouter';
"use client";

import { useState } from "react";
import { Link } from "wouter";
;
import { Mail, Lock, ArrowRight, Bookmark, FileText, Feather } from "lucide-react";
import { toast } from "sonner";
import { Emblem } from "@/components/brand/Emblem";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(mode === "login" ? "Welcome back!" : "Account created!");
        navigate("/account");
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8">
        <div className="max-w-md mx-auto">
          {/* Brand */}
          <div className="text-center mb-8">
            <Emblem size={56} className="mx-auto mb-4" />
            <h1 className="font-display text-3xl" style={{ color: "var(--ink)" }}>
              {mode === "login" ? "Sign in to continue" : "Create your account"}
            </h1>
            <p className="font-body text-sm mt-2" style={{ color: "var(--muted)" }}>
              {mode === "login" ? "your inquiry" : "Join Anvikshiki"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-anv pl-10"
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-anv pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-ui text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-anv pl-10"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Please wait..." : mode === "login" ? "Continue with email" : "Create account"}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Toggle */}
          <div className="text-center mt-6">
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-ui text-sm transition-colors hover:text-[var(--gold)]"
              style={{ color: "var(--muted)" }}
            >
              {mode === "login" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>

          {/* Benefits */}
          {mode === "signup" && (
            <div
              className="mt-8 p-5 rounded-2xl"
              style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}
            >
              <h3 className="font-ui text-xs font-semibold tracking-wider uppercase text-center mb-4" style={{ color: "var(--gold)" }}>
                Your space for knowledge and ideas
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Bookmark size={20} className="mx-auto mb-2" style={{ color: "var(--gold)" }} />
                  <p className="font-ui text-xs font-medium" style={{ color: "var(--ink)" }}>Saved essays</p>
                </div>
                <div>
                  <FileText size={20} className="mx-auto mb-2" style={{ color: "var(--gold)" }} />
                  <p className="font-ui text-xs font-medium" style={{ color: "var(--ink)" }}>Papers archive</p>
                </div>
                <div>
                  <Feather size={20} className="mx-auto mb-2" style={{ color: "var(--gold)" }} />
                  <p className="font-ui text-xs font-medium" style={{ color: "var(--ink)" }}>Submissions</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
