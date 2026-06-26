import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Globe } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { Emblem } from "@/components/brand/Emblem";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"login"|"signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = tab === "login" ? { email, password } : { email, password, name };
      const r = await fetch(`${base()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Authentication failed");
      navigate("/account");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh", display: "flex", alignItems: "center" }}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(139,26,74,0.15) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 75% 40%, rgba(74,40,120,0.12) 0%, transparent 50%)" }} />
      </div>

      <div className="container-anv relative z-10 py-16 flex justify-center">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Emblem size={56} className="mb-3 animate-float" />
            <div className="font-display text-2xl tracking-[0.15em]" style={{ color: "var(--gold-bright)" }}>ĀNVĪKṢIKĪ</div>
            <LotusIcon size={14} className="mt-2" style={{ color: "var(--gold)", opacity: 0.5 }} />
          </div>

          <div className="card-sacred p-6" style={{ background: "var(--surface-2)" }}>
            {/* Tabs */}
            <div className="flex mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
              {(["login","signup"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(""); }}
                  className="flex-1 py-2 font-ui text-sm font-semibold transition-colors"
                  style={{ color: tab === t ? "var(--gold-bright)" : "var(--muted)", background: "none", border: "none", cursor: "pointer", borderBottom: `2px solid ${tab === t ? "var(--gold)" : "transparent"}` }}
                >
                  {t === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            {/* Google placeholder */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-lg font-ui text-sm transition-all"
              style={{ border: "1px solid var(--border-gold)", background: "var(--surface-3)", color: "var(--ink-soft)" }}
              onClick={() => alert("Google login will be available soon.")}
            >
              <Globe size={16} style={{ color: "var(--gold)" }} />
              Continue with Google (Coming Soon)
            </button>

            <LotusDivider className="mb-4" />

            <form onSubmit={submit} className="space-y-4">
              {tab === "signup" && (
                <div>
                  <label className="form-label" htmlFor="name">Full Name</label>
                  <input id="name" type="text" className="input-sacred" placeholder="Arjun Sharma" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="input-sacred" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="form-label" htmlFor="password">Password</label>
                <input id="password" type="password" className="input-sacred" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              </div>

              {error && <p className="font-ui text-xs" style={{ color: "var(--lotus)" }} role="alert">{error}</p>}

              <button type="submit" className="btn-sacred btn-gold w-full justify-center mt-2" disabled={loading}>
                {loading ? "…" : tab === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {tab === "login" && (
              <p className="font-ui text-xs text-center mt-4" style={{ color: "var(--muted)" }}>
                Don't have an account? <button type="button" onClick={() => setTab("signup")} style={{ color: "var(--gold)", background: "none", border: "none", cursor: "pointer", fontSize: "inherit" }}>Sign up</button>
              </p>
            )}
          </div>

          <p className="text-center font-ui text-xs mt-4" style={{ color: "var(--ink-faint)" }}>
            By continuing, you agree to our <Link href="/terms" style={{ color: "var(--gold)" }}>Terms</Link> and <Link href="/privacy" style={{ color: "var(--gold)" }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
