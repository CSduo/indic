import { useState } from "react";
import { useLocation } from "wouter";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminLoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch(`${base()}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Login failed");
      toast.success("Welcome back");
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "var(--bg-deep)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(74,40,120,0.15) 0%, transparent 60%)" }} />
      </div>
      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="flex flex-col items-center mb-8">
          <span className="font-display text-4xl tracking-[0.2em] animate-float mb-3" style={{ color: 'var(--gold)' }}>ĀNVĪKṢIKĪ</span>
          <div className="font-display text-2xl tracking-[0.15em]" style={{ color: "var(--gold-bright)" }}>ĀNVĪKṢIKĪ</div>
          <div className="font-ui text-xs tracking-[0.2em] uppercase mt-1" style={{ color: "var(--muted)" }}>Admin Portal</div>
          <LotusIcon size={14} className="mt-2" style={{ color: "var(--gold)", opacity: 0.5 }} />
        </div>

        <div className="card-sacred p-6" style={{ background: "var(--surface-2)" }}>
          <LotusDivider className="mb-5" />
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="form-label" htmlFor="adm-email">Email</label>
              <input id="adm-email" type="email" className="input-sacred" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} required aria-required="true" />
            </div>
            <div>
              <label className="form-label" htmlFor="adm-pass">Password</label>
              <input id="adm-pass" type="password" className="input-sacred" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required aria-required="true" />
            </div>
            {error && <p className="font-ui text-xs" style={{ color: "var(--lotus)" }} role="alert">{error}</p>}
            <button type="submit" className="btn-sacred btn-gold w-full justify-center" disabled={loading}>
              <Lock size={14} />
              {loading ? "Signing in…" : "Sign in to Admin"}
            </button>
          </form>
          <LotusDivider className="mt-5 mb-3" />
          <p className="font-ui text-[10px] text-center" style={{ color: "var(--ink-faint)" }}>
            Set <code style={{ color: "var(--gold)", background: "var(--surface-3)", padding: "1px 4px", borderRadius: 3 }}>ADMIN_EMAIL</code> and a bcrypt <code style={{ color: "var(--gold)", background: "var(--surface-3)", padding: "1px 4px", borderRadius: 3 }}>ADMIN_PASSWORD_HASH</code> secret to provision admin access.
          </p>
        </div>
      </div>
    </div>
  );
}
