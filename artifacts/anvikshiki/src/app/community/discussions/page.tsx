import { Link } from "wouter";
import { ArrowRight, MessageCircle } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";

const DISCUSSION_TOPICS = [
  {
    title: "The Nature of Dharma",
    description: "An open thread on the multiple meanings of dharma across textual traditions.",
    replies: 0, domain: "philosophy", status: "open",
  },
  {
    title: "Reading the Arthaśāstra Today",
    description: "How does Kauṭilya's statecraft resonate with contemporary geopolitical thought?",
    replies: 0, domain: "geopolitics", status: "open",
  },
  {
    title: "On Sanskrit as a Living Language",
    description: "Is Sanskrit's revival a cultural necessity or an academic project? Discuss.",
    replies: 0, domain: "sanskrit-studies", status: "open",
  },
];

export default function DiscussionsPage() {
  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <HeroPanel
          eyebrow="Open Discussions"
          title="The Dialogue Continues"
          description="Structured threads on the ideas that matter. Every discussion is moderated for depth and civility."
          glyph="sociology"
          ctaPrimary={{ label: "Join the Community", href: "/community" }}
          ctaSecondary={{ label: "Browse Essays", href: "/browse" }}
        />
      </section>

      <section className="container-anv pb-14">
        <div className="flex items-center justify-between mb-6">
          <p className="type-section-label">Open Threads</p>
          <span className="badge badge-draft text-[0.65rem]">Moderated · Coming Soon</span>
        </div>

        <div className="space-y-3 mb-10">
          {DISCUSSION_TOPICS.map(t => (
            <ParchmentCard key={t.title} className="p-5 flex gap-4 items-start opacity-70">
              <div className="h-10 w-10 rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] grid place-items-center text-[var(--gold)] shrink-0">
                <MessageCircle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl text-[var(--ink)] leading-tight">{t.title}</h2>
                <p className="mt-1 font-body text-sm leading-5 text-[var(--ink-soft)]">{t.description}</p>
                <div className="mt-2 flex items-center gap-3">
                  <AnimalGlyph domain={t.domain} size={14} className="text-[var(--muted)]" />
                  <span className="font-ui text-[10px] text-[var(--muted)]">{t.replies} replies</span>
                  <span className="badge badge-received text-[0.6rem]">{t.status}</span>
                </div>
              </div>
            </ParchmentCard>
          ))}
        </div>

        <OrnamentDivider className="my-8" />

        <EmptyState
          title="Discussions opening soon"
          description="Community discussions will be moderated and open to registered members. Subscribe below to be notified."
          action={<Link href="/community" className="btn-terracotta">Subscribe <ArrowRight size={14} /></Link>}
        />
      </section>
    </div>
  );
}
