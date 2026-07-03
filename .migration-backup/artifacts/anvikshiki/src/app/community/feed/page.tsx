import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { ArrowRight, BookOpen, Users } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";

export default function CommunityFeedPage() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user]);

  if (!user) return null;

  const COMING_FEATURES = [
    {
      icon: BookOpen,
      domain: "community",
      title: "Reading Circles",
      desc: "Join scheduled close-reading sessions around a single text — essays, translations, or classical excerpts.",
      status: "In Development",
    },
    {
      icon: Users,
      domain: "sociology",
      title: "Scholar Introductions",
      desc: "A space for community members to introduce themselves, their work, and their fields of inquiry.",
      status: "Coming Soon",
    },
    {
      icon: ArrowRight,
      domain: "geopolitics",
      title: "Commentary Threads",
      desc: "Structured responses to published essays — carry the conversation beyond the text.",
      status: "Coming Soon",
    },
  ];

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="type-section-label mb-2">Community</p>
            <h1 className="font-display text-4xl text-[var(--ink)]">Welcome, {user.name?.split(" ")[0] || "Scholar"}</h1>
            <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)] max-w-lg">
              The community space is taking shape. Below is what's being built — you'll be notified as features open.
            </p>
          </div>
          <AnimalGlyph domain="community" size={54} className="text-[var(--gold)] hidden md:block" />
        </div>

        <OrnamentDivider className="my-8" />

        <div className="grid gap-5 md:grid-cols-3">
          {COMING_FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <ParchmentCard key={f.title} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] grid place-items-center text-[var(--gold)]">
                    <Icon size={18} />
                  </div>
                  <AnimalGlyph domain={f.domain} size={32} className="text-[var(--gold)] opacity-50" />
                </div>
                <h2 className="font-display text-2xl text-[var(--ink)] mb-2">{f.title}</h2>
                <p className="font-body text-sm leading-6 text-[var(--ink-soft)] mb-4">{f.desc}</p>
                <span className="badge badge-draft text-[0.65rem]">{f.status}</span>
              </ParchmentCard>
            );
          })}
        </div>

        <OrnamentDivider className="my-10" />

        <EmptyState
          title="Be first in the room"
          description="Subscribe to the community newsletter to receive an invitation when the feed opens."
          action={<Link href="/community" className="btn-terracotta">Join the Newsletter <ArrowRight size={14} /></Link>}
        />
      </section>
    </div>
  );
}
