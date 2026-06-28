import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Globe } from "lucide-react";
import { toast } from "sonner";
import { Emblem } from "@/components/brand/Emblem";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuthContext();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (tab === "signup" && !name.trim()) {
      setError("Please enter your full name");
      return false;
    }
    return true;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = tab === "login" ? { email, password } : { email, password, name };
      const response = await fetch(`${base()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed");
      login(data.user);
      toast.success(tab === "login" ? "Welcome back" : "Account created");
      navigate("/account");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv grid min-h-[80vh] gap-6 py-10 lg:grid-cols-[minmax(0,440px)_1fr] lg:items-center">
        <ParchmentCard className="p-6 md:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[8px] border border-[var(--border-ink)] bg-[var(--surface)] text-[var(--gold)]">
              <Emblem size={48} />
            </div>
            <h1 className="font-display text-3xl tracking-[0.12em] text-[var(--ink)]">ANVIKSIKI</h1>
            <p className="mt-2 font-body text-sm italic text-[var(--ink-soft)]">Sign in to continue your inquiry.</p>
          </div>

          <div className="mb-6 flex border-b border-[var(--border)]">
            {(["login", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setTab(item); setError(""); }}
                className="flex-1 border-b-2 py-2 font-ui text-sm font-bold uppercase tracking-[0.12em]"
                style={{ borderColor: tab === item ? "var(--terracotta)" : "transparent", color: tab === item ? "var(--terracotta)" : "var(--muted)" }}
              >
                {item === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <button type="button" className="btn-ink mb-5 w-full justify-center" onClick={() => toast.info("Google login will be available soon.")}>
            <Globe size={16} /> Continue with Google
          </button>

          <OrnamentDivider variant="minimal" className="mb-5" />

          <form onSubmit={submit} className="space-y-4" noValidate>
            {tab === "signup" ? (
              <div>
                <label className="form-label" htmlFor="name">Full Name *</label>
                <input id="name" type="text" className="input-sacred" placeholder="Your full name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
            ) : null}
            <div>
              <label className="form-label" htmlFor="email">Email *</label>
              <input id="email" type="email" className="input-sacred" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div>
              <label className="form-label" htmlFor="password">Password * <span className="font-normal normal-case tracking-normal text-[var(--ink-faint)]">(min. 8 characters)</span></label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} className="input-sacred pr-11" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error ? <p className="rounded-[8px] border border-[var(--border-terracotta)] bg-[var(--terracotta-pale)] p-3 font-ui text-xs text-[var(--terracotta)]" role="alert">{error}</p> : null}

            <button type="submit" className="btn-terracotta w-full justify-center" disabled={loading}>
              {loading ? "Working..." : tab === "login" ? "Continue" : "Create Account"}
            </button>
          </form>

          {tab === "login" ? (
            <p className="mt-4 text-center font-ui text-xs text-[var(--muted)]">
              No account yet? <button type="button" onClick={() => setTab("signup")} className="text-[var(--terracotta)]">Create one</button>
            </p>
          ) : null}

          <p className="mt-5 text-center font-ui text-xs leading-5 text-[var(--ink-faint)]">
            By continuing, you agree to our <Link href="/terms" className="text-[var(--terracotta)]">Terms</Link> and <Link href="/privacy" className="text-[var(--terracotta)]">Privacy Policy</Link>.
          </p>
        </ParchmentCard>

        <ParchmentCard className="hidden min-h-[620px] overflow-hidden lg:block" corners={false}>
          <img src={asset("/images/heroes/article-default.jpg")} alt="Illustrated scholar inside an archive gate" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" aria-hidden="true" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="mb-4 flex gap-3 text-[var(--gold)]">
              {["philosophy", "archive", "community"].map((domain) => <AnimalGlyph key={domain} domain={domain} size={34} />)}
            </div>
            <h2 className="font-display text-5xl leading-none text-[var(--ink)]">The gate opens with inquiry.</h2>
          </div>
        </ParchmentCard>
      </section>
    </div>
  );
}
