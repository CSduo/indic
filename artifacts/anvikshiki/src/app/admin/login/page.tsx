import { useLocation } from 'wouter';
"use client";

import { useState } from "react";
;
import { Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Emblem } from "@/components/brand/Emblem";

export default function AdminLoginPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Welcome, admin");
        navigate("/admin");
      } else {
        toast.error(data.error || "Invalid credentials");
      }
    } catch {
      toast.error("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm mx-auto px-4">
        <div className="text-center mb-8">
          <Emblem size={56} className="mx-auto mb-4" />
          <h1 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
            Admin Access
          </h1>
          <p className="font-ui text-sm mt-1" style={{ color: "var(--muted)" }}>
            Anvikshiki Editorial
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-anv"
            placeholder="Admin email"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input-anv"
            placeholder="Password"
            required
          />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Sign In"}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
