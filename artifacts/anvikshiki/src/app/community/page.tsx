import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Users, MessageCircle, Heart } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function CommunityPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"err">("idle");

  const joinNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const r = await fetch(`${base()}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      setStatus(r.ok ? "ok" : "err");
    } catch { setStatus("err"); }
  };

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 360 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0f0820 0%, #120518 50%, #08050f 100%)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: "50%", bottom: 0, background: "radial-gradient(ellipse at 15% 50%, rgba(139,26,74,0.32) 0%, transparent 55%)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: "55%", height: "100%", background: "radial-gradient(ellipse at 85% 30%, rgba(74,40,120,0.20) 0%, transparent 55%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
        </div>
        <div className="container-anv relative z-10 flex flex-col items-center text-center py-20">
          <div className="section-label mb-3">Join the Conversation</div>
          <h1 className="font-display mb-4" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "var(--gold-bright)", letterSpacing: "0.12em" }}>Community</h1>
          <LotusIcon size={20} className="mb-4 animate-float" style={{ color: "var(--lotus)", opacity: 0.8 }} />
          <p className="font-body text-base max-w-lg" style={{ color: "var(--ink-faint)" }}>
            A space for seekers, thinkers, and dreamers to connect, share, and grow together across timeless disciplines.
          </p>
        </div>
      </div>

      {/* Three pillars */}
      <div className="container-anv py-12">
        <LotusDivider className="mb-10" />
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Events */}
          <div className="card-sacred p-6">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(201,152,58,0.1)", border: "1px solid var(--border-gold)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)", marginBottom: "1rem" }}>
              <Users size={22} />
            </div>
            <div className="section-label mb-2">Events</div>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--parchment)" }}>Gatherings</h2>
            <EmptyState
              compact
              title="No events yet"
              description="Community gatherings, reading circles, and symposia will be announced here."
            />
            <button className="btn-sacred btn-ghost w-full mt-4 text-xs" type="button">Explore Events (Coming Soon)</button>
          </div>

          {/* Discuss */}
          <div className="card-sacred p-6">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(212,103,154,0.1)", border: "1px solid var(--border-rose)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lotus)", marginBottom: "1rem" }}>
              <MessageCircle size={22} />
            </div>
            <div className="section-label mb-2">Discuss</div>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--parchment)" }}>Dialogue</h2>
            <p className="font-body text-sm mb-4" style={{ color: "var(--ink-faint)" }}>
              Engage in meaningful conversations across timeless topics — philosophy, history, science, and civilizational thought.
            </p>
            <EmptyState
              compact
              title="Discussion forum coming soon"
              description="Join the newsletter to be notified when the discussion boards open."
            />
            <button className="btn-sacred btn-ghost w-full mt-4 text-xs" type="button">Join the Discussion (Coming Soon)</button>
          </div>

          {/* Support */}
          <div className="card-sacred p-6">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(139,26,74,0.12)", border: "1px solid var(--border-rose)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rose-bright)", marginBottom: "1rem" }}>
              <Heart size={22} />
            </div>
            <div className="section-label mb-2">Support</div>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--parchment)" }}>The Journey</h2>
            <p className="font-body text-sm mb-4" style={{ color: "var(--ink-faint)" }}>
              Help sustain this space for learning, sharing, and collective wisdom. Every contribution matters.
            </p>
            <button className="btn-sacred btn-rose w-full mt-auto text-xs" type="button">Support the Journey (Coming Soon)</button>
          </div>
        </div>

        {/* Join / Newsletter */}
        <LotusDivider className="mb-10" />
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="section-label mb-3">Join</div>
            <h2 className="font-display text-3xl mb-3" style={{ color: "var(--gold-bright)" }}>Stay Connected</h2>
            <p className="font-body text-sm mb-2" style={{ color: "var(--ink-faint)" }}>
              Receive reflections, resources, and community updates. No noise — only wisdom.
            </p>
          </div>
          <div className="card-sacred p-6">
            {status === "ok" ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <LotusIcon size={32} style={{ color: "var(--gold)" }} />
                <p className="font-display text-xl" style={{ color: "var(--gold-bright)" }}>Welcome to the community</p>
                <p className="font-body text-sm" style={{ color: "var(--ink-faint)" }}>Your subscription has been received.</p>
              </div>
            ) : (
              <form onSubmit={joinNewsletter} className="flex flex-col gap-3">
                <div>
                  <label className="form-label" htmlFor="comm-name">Your name</label>
                  <input id="comm-name" className="input-sacred" type="text" placeholder="Arjun Sharma" value={name} onChange={e => setName(e.target.value)} aria-label="Your name" />
                </div>
                <div>
                  <label className="form-label" htmlFor="comm-email">Email address</label>
                  <input id="comm-email" className="input-sacred" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required aria-label="Email address" />
                </div>
                <button type="submit" className="btn-sacred btn-gold w-full justify-center" disabled={status === "loading"}>
                  {status === "loading" ? "Joining…" : "Join the Community"}
                </button>
                {status === "err" && <p className="font-ui text-xs text-center" style={{ color: "var(--lotus)" }}>Something went wrong. Please try again.</p>}
              </form>
            )}
          </div>
        </div>

        {/* Testimonials placeholder */}
        <LotusDivider className="mt-12 mb-8" />
        <div className="text-center mb-8">
          <div className="section-label mb-2">Our Community</div>
          <h2 className="font-display text-2xl" style={{ color: "var(--parchment)" }}>Voices from Fellow Seekers</h2>
        </div>
        <EmptyState
          title="Voices will appear here"
          description="Community testimonials and letters will be shared once the community grows. Join to be among the first."
          action={<Link href="/submit" className="btn-sacred btn-ghost">Submit Your Work <ArrowRight size={14} /></Link>}
        />
      </div>
    </div>
  );
}
