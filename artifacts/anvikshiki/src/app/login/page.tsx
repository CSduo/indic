import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, Eye, EyeOff, Lock, MapPin, Sparkles, User, XCircle } from "lucide-react";
import { toast } from "sonner";

import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

interface GoogleCredentialResponse {
  credential?: string;
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuthContext();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle availability state
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [handleMessage, setHandleMessage] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Real-time handle validation & uniqueness check
  useEffect(() => {
    if (tab !== "signup") return;
    const clean = handle.trim().replace(/^@/, "").toLowerCase();
    if (!clean) {
      setHandleStatus("idle");
      setHandleMessage("");
      return;
    }

    if (clean.length < 3) {
      setHandleStatus("invalid");
      setHandleMessage("Must be at least 3 characters");
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(clean)) {
      setHandleStatus("invalid");
      setHandleMessage("Letters, numbers, dots, and hyphens only");
      return;
    }

    setHandleStatus("checking");
    setHandleMessage("Checking availability…");

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${base()}/api/auth/handle-check?handle=${encodeURIComponent(clean)}`);
        const data = await res.json().catch(() => ({}));
        if (data.available) {
          setHandleStatus("available");
          setHandleMessage(`@${data.handle} is available!`);
        } else {
          setHandleStatus("taken");
          setHandleMessage(data.reason || `Handle @${clean} is already taken`);
        }
      } catch {
        setHandleStatus("idle");
        setHandleMessage("");
      }
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [handle, tab]);

  useEffect(() => {
    if (!googleClientId) return;
    let stopped = false;
    let attempts = 0;
    let script = document.getElementById("google-identity-script") as HTMLScriptElement | null;
    let scriptCreated = false;
    if (!(window as any).google?.accounts?.id && !script) {
      script = document.createElement("script");
      script.id = "google-identity-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      document.head.appendChild(script);
      scriptCreated = true;
    }

    const initializeGoogle = () => {
      const google = (window as any).google;
      const container = document.getElementById("google-login-button");
      if (stopped || !container || !google?.accounts?.id) return false;
      container.replaceChildren();
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: GoogleCredentialResponse) => {
          if (!response.credential) return;
          setLoading(true);
          setError("");
          try {
            const res = await fetch(`${base()}/api/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
              credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Google authentication failed");
            }
            login(data.user);
            toast.success("Signed in successfully via Google");
            navigate("/account");
          } catch (err: any) {
            setError(err.message || "Google authentication failed");
            toast.error(err.message || "Google authentication failed");
          } finally {
            setLoading(false);
          }
        },
      });

      google.accounts.id.renderButton(
        container,
        {
          theme: "outline",
          size: "large",
          width: 350,
          text: "continue_with",
          shape: "rectangular",
        }
      );
      return true;
    };

    if (initializeGoogle()) return;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (initializeGoogle() || attempts >= 40) window.clearInterval(timer);
    }, 250);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      if (scriptCreated) script?.remove();
    };
  }, [login, navigate]);

  const validate = () => {
    if (tab === "signup") {
      const cleanHandle = handle.trim().replace(/^@/, "").toLowerCase();
      if (!cleanHandle || cleanHandle.length < 3) {
        setError("Please enter a valid unique scholar handle (at least 3 characters)");
        return false;
      }
      if (handleStatus === "taken") {
        setError(`Handle @${cleanHandle} is already taken. Please choose another.`);
        return false;
      }
      if (!name.trim()) {
        setError("Please enter your account name");
        return false;
      }
      if (age && (isNaN(Number(age)) || Number(age) < 10 || Number(age) > 120)) {
        setError("Please enter a valid age between 10 and 120");
        return false;
      }
    }

    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!password || (tab === "signup" && password.length < 8)) {
      setError(tab === "signup" ? "Password must be at least 8 characters" : "Please enter your password");
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
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/signup";
      const cleanHandle = handle.trim().replace(/^@/, "").toLowerCase();
      const body = tab === "login"
        ? { email, password }
        : {
            email,
            password,
            name: name.trim(),
            handle: cleanHandle,
            age: age ? parseInt(age, 10) : undefined,
            location: location.trim() || undefined,
          };

      const response = await fetch(`${base()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      let data: any = {};
      try {
        const text = await response.text();
        if (text) data = JSON.parse(text);
      } catch (e) {
        // Fallback
      }
      if (!response.ok) {
        throw new Error(data.error || `Server responded with ${response.status} ${response.statusText}`);
      }
      login(data.user);
      toast.success(tab === "login" ? "Welcome back" : `Welcome, @${data.user?.handle || cleanHandle}! Account created.`);
      navigate("/account");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="relative bg-[var(--bg)] min-h-[90vh]">
      <section className="container-anv relative z-10 grid min-h-[90vh] gap-8 py-10 lg:grid-cols-[minmax(0,480px)_1fr] lg:items-center">
        <ParchmentCard className="p-6 md:p-8 relative overflow-hidden shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="font-display text-4xl tracking-[0.14em] text-[var(--ink)]">ĀNVĪKṢIKĪ</h1>
            <p className="mt-2 font-body text-sm text-[var(--ink-soft)]">
              {tab === "signup" ? "Create your unique scholar account." : "Sign in to continue your inquiry."}
            </p>
          </div>

          <div className="mb-6 flex border-b border-[var(--border)]">
            {(["login", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setTab(item); setError(""); }}
                className="flex-1 border-b-2 py-2.5 font-ui text-sm font-bold uppercase tracking-[0.12em] transition-colors"
                style={{
                  borderColor: tab === item ? "var(--terracotta)" : "transparent",
                  color: tab === item ? "var(--terracotta)" : "var(--muted)",
                }}
              >
                {item === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {googleClientId && tab === "login" ? (
            <>
              <div id="google-login-button" className="mb-5 flex min-h-10 w-full justify-center" />
              <OrnamentDivider variant="minimal" className="mb-5" />
            </>
          ) : null}

          <form onSubmit={submit} className="space-y-4" noValidate>
            {tab === "signup" ? (
              <>
                {/* 1. Scholar Handle / User ID (Primary Identifier) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label mb-0" htmlFor="handle">
                      Scholar Handle / User ID *
                    </label>
                    <span className="font-ui text-[11px] text-[var(--muted)]">Unique @handle</span>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-[var(--gold)]">
                      @
                    </span>
                    <input
                      id="handle"
                      type="text"
                      className={`input-sacred input-with-handle-at font-mono text-sm ${
                        handleStatus === "available"
                          ? "border-[var(--sage)] ring-1 ring-[var(--sage)]/20"
                          : handleStatus === "taken" || handleStatus === "invalid"
                          ? "border-[var(--terracotta)] ring-1 ring-[var(--terracotta)]/20"
                          : ""
                      }`}
                      placeholder="username"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                      maxLength={30}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      {handleStatus === "available" && <CheckCircle2 size={16} className="text-[var(--sage)]" />}
                      {(handleStatus === "taken" || handleStatus === "invalid") && <XCircle size={16} className="text-[var(--terracotta)]" />}
                      {handleStatus === "checking" && <span className="text-[10px] font-ui text-[var(--muted)] animate-pulse">…</span>}
                    </div>
                  </div>
                  {handleMessage ? (
                    <p className={`mt-1 font-ui text-[11px] ${handleStatus === "available" ? "text-[var(--sage)] font-medium" : "text-[var(--terracotta)]"}`}>
                      {handleMessage}
                    </p>
                  ) : (
                    <p className="mt-1 font-ui text-[11px] text-[var(--muted)]">
                      Letters, numbers, full stops, and hyphens. Cannot be taken by two accounts.
                    </p>
                  )}
                </div>

                {/* 2. Account / Display Name */}
                <div>
                  <label className="form-label" htmlFor="name">
                    Account Name / Full Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="input-sacred"
                    placeholder="Scholar's full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* 3. Age & Location (Secure & Private) */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="form-label mb-0" htmlFor="age">
                        Age
                      </label>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-ui text-[var(--muted)]" title="Strictly private to you and editorial administration">
                        <Lock size={10} /> Private
                      </span>
                    </div>
                    <input
                      id="age"
                      type="number"
                      min="10"
                      max="120"
                      className="input-sacred"
                      placeholder="e.g. 24"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="form-label mb-0" htmlFor="location">
                        Where are you from?
                      </label>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-ui text-[var(--muted)]" title="Strictly private to you and editorial administration">
                        <Lock size={10} /> Private
                      </span>
                    </div>
                    <input
                      id="location"
                      type="text"
                      className="input-sacred"
                      placeholder="City, Country"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      maxLength={150}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {/* Email */}
            <div>
              <label className="form-label" htmlFor="email">
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                className="input-sacred"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0" htmlFor="password">
                  Password *
                </label>
                {tab === "signup" ? (
                  <span className="text-[11px] font-ui text-[var(--muted)]">Min. 8 characters</span>
                ) : null}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input-sacred pr-11"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={tab === "signup" ? 8 : 1}
                  maxLength={128}
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-[8px] border border-[var(--border-terracotta)] bg-[var(--terracotta-pale)] p-3 font-ui text-xs text-[var(--terracotta)]" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-terracotta w-full justify-center py-2.5 font-bold" disabled={loading}>
              {loading ? "Working…" : tab === "login" ? "Sign In to Journal" : "Create Scholar Account"}
            </button>
          </form>

          {tab === "signup" ? (
            <p className="mt-3 text-center font-ui text-xs text-[var(--muted)]">
              🔒 Personal data like age and origin are stored securely and never visible to other scholars.
            </p>
          ) : null}

          {tab === "login" ? (
            <p className="mt-4 text-center font-ui text-xs text-[var(--muted)]">
              No account yet?{" "}
              <button type="button" onClick={() => setTab("signup")} className="font-semibold text-[var(--terracotta)] hover:underline">
                Create one
              </button>
            </p>
          ) : (
            <p className="mt-4 text-center font-ui text-xs text-[var(--muted)]">
              Already have an account?{" "}
              <button type="button" onClick={() => setTab("login")} className="font-semibold text-[var(--terracotta)] hover:underline">
                Sign in
              </button>
            </p>
          )}

          <p className="mt-5 text-center font-ui text-xs leading-5 text-[var(--ink-faint)]">
            By continuing, you agree to our <Link href="/terms" className="text-[var(--terracotta)] hover:underline">Terms</Link> and <Link href="/privacy" className="text-[var(--terracotta)] hover:underline">Privacy Policy</Link>.
          </p>
        </ParchmentCard>

        {/* Informative Side Panel */}
        <ParchmentCard className="hidden min-h-[620px] overflow-hidden lg:flex flex-col justify-between p-10 relative bg-gradient-to-br from-[var(--surface)] to-[var(--surface-parchment)]" corners={false}>
          <div>
            <span className="badge badge-received mb-4 inline-flex items-center gap-1.5">
              <Sparkles size={12} className="text-[var(--gold)]" /> Ānvīkṣikī Journal of Philosophy
            </span>
            <h2 className="font-display text-4xl leading-tight text-[var(--ink)] max-w-md">
              A sovereign realm for peer review, dialogue, and enduring philosophy.
            </h2>
            <p className="mt-4 font-body text-base leading-7 text-[var(--ink-soft)] max-w-md">
              Every registered scholar receives a permanent unique handle, direct access to the editorial submission desk, collaborative annotations, and manuscript tracking.
            </p>
          </div>

          <div className="space-y-4 pt-8 border-t border-[var(--border)]">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)] shrink-0 mt-0.5">
                <User size={16} />
              </div>
              <div>
                <h3 className="font-display text-base text-[var(--ink)]">Unique Scholar Identity</h3>
                <p className="font-body text-xs leading-5 text-[var(--muted)]">
                  Your chosen @handle is guaranteed unique and connects all your peer reviews, essays, and citations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)] shrink-0 mt-0.5">
                <Lock size={16} />
              </div>
              <div>
                <h3 className="font-display text-base text-[var(--ink)]">Strict Privacy & Security</h3>
                <p className="font-body text-xs leading-5 text-[var(--muted)]">
                  Personal demographics are private to you and journal administration, never shared with third parties or other members.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)] shrink-0 mt-0.5">
                <AnimalGlyph domain="philosophy" size={16} />
              </div>
              <div>
                <h3 className="font-display text-base text-[var(--ink)]">Interactive Editorial Desk</h3>
                <p className="font-body text-xs leading-5 text-[var(--muted)]">
                  Direct communication with editors and fellow scholars in interactive discussion threads.
                </p>
              </div>
            </div>
          </div>
        </ParchmentCard>
      </section>
    </div>
  );
}
