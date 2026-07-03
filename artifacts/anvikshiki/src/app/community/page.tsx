import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Heart, MessageCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export default function CommunityPage() {
  const { user } = useAuthContext();
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  const joinNewsletter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch(`${base()}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await response.json();
      if (response.status === 409) {
        toast.info("You are already part of the community");
        setStatus("ok");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Failed");
      setStatus("ok");
      toast.success("Welcome to the community");
    } catch {
      setStatus("err");
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <HeroPanel
          image={asset("/images/provided/community-musician-salon-hero.jpg")}
          imageAlt="Illustrated musician seated in an ornate scholarly salon"
          eyebrow="Join the Conversation"
          title="A Living Community of Seekers"
          description="Gather around essays, manuscripts, and questions that deserve patient attention."
          glyph="community"
          focal="center"
          ctaPrimary={user ? { label: "Go to Account", href: "/account" } : { label: "Sign In", href: "/login" }}
          ctaSecondary={{ label: "Submit Work", href: "/submit" }}
        />
      </section>

      <section className="container-anv pb-14">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Gatherings", label: "Events", desc: "Reading circles, symposia, and community sessions will appear here.", icon: Users, domain: "community" },
            { title: "Dialogue", label: "Discuss", desc: "A space for meaningful conversations across timeless topics.", icon: MessageCircle, domain: "sociology" },
            { title: "Support", label: "The Journey", desc: "Help sustain a careful place for learning, sharing, and collective wisdom.", icon: Heart, domain: "geopolitics" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <ParchmentCard key={item.title} className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] text-[var(--gold)]">
                    <Icon size={24} />
                  </span>
                  <AnimalGlyph domain={item.domain} size={38} className="text-[var(--gold)]" />
                </div>
                <p className="type-section-label mb-2">{item.label}</p>
                <h2 className="font-display text-3xl text-[var(--ink)]">{item.title}</h2>
                <p className="mt-3 font-body text-sm leading-6 text-[var(--ink-soft)]">{item.desc}</p>
                <button type="button" className="btn-ink mt-5 w-full">Coming Soon</button>
              </ParchmentCard>
            );
          })}
        </div>

        <OrnamentDivider className="my-10" />

        <div className="grid gap-6 md:grid-cols-[.9fr_1fr] md:items-center">
          <div>
            <p className="type-section-label mb-3">Stay Connected</p>
            <h2 className="font-display text-4xl text-[var(--ink)]">Receive the conversation.</h2>
            <p className="mt-3 max-w-lg font-body text-base leading-7 text-[var(--ink-soft)]">
              Reflections, resources, and community updates. No noise, only inquiry.
            </p>
            {user ? (
              <p className="mt-4 rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] px-3 py-2 font-ui text-xs text-[var(--gold)]">
                Signed in as {user.email}
              </p>
            ) : null}
          </div>

          <ParchmentCard className="p-6">
            {status === "ok" ? (
              <div className="py-6 text-center">
                <AnimalGlyph domain="community" size={54} className="mx-auto mb-4 text-[var(--gold)]" />
                <h3 className="font-display text-3xl text-[var(--ink)]">Welcome to the community</h3>
                <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)]">Your subscription has been saved to our community list.</p>
              </div>
            ) : (
              <form onSubmit={joinNewsletter} className="grid gap-3" noValidate>
                <div>
                  <label className="form-label" htmlFor="comm-name">Your name</label>
                  <input id="comm-name" className="input-sacred" type="text" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div>
                  <label className="form-label" htmlFor="comm-email">Email address *</label>
                  <input id="comm-email" className="input-sacred" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </div>
                <button type="submit" className="btn-terracotta w-full justify-center" disabled={status === "loading"}>
                  {status === "loading" ? "Joining..." : <>Join Community <ArrowRight size={14} /></>}
                </button>
              </form>
            )}
          </ParchmentCard>
        </div>

        <OrnamentDivider className="my-10" />
        <EmptyState
          title="Voices will appear here"
          description="Community testimonials and letters will be shared once the community grows."
          action={<Link href="/submit" className="btn-ink">Submit Your Work <ArrowRight size={14} /></Link>}
        />
      </section>
    </div>
  );
}
