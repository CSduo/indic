import { Link } from "wouter";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";

const UPCOMING: { title: string; type: string; date: string; time: string; mode: string; domain: string; desc: string }[] = [
  {
    title: "Close Reading: Yuktidīpikā",
    type: "Reading Circle",
    date: "Forthcoming",
    time: "TBA",
    mode: "Online (Zoom)",
    domain: "sanskrit-studies",
    desc: "A guided reading of the Yuktidīpikā — the oldest surviving commentary on the Sāṃkhyakārikā.",
  },
  {
    title: "Symposium on Rasa Theory",
    type: "Symposium",
    date: "Forthcoming",
    time: "TBA",
    mode: "Hybrid",
    domain: "aesthetics",
    desc: "Scholars gather to discuss the aesthetic theory of rasa across Sanskrit poetics, music, and dance traditions.",
  },
  {
    title: "Open Discussion: Civilizational Thought Today",
    type: "Open Session",
    date: "Forthcoming",
    time: "TBA",
    mode: "Online",
    domain: "civilizational-thought",
    desc: "An informal conversation on the relevance of civilizational categories in contemporary scholarship.",
  },
];

export default function EventsPage() {
  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <HeroPanel
          eyebrow="Gatherings & Salons"
          title="Events & Reading Circles"
          description="Seasonal gatherings, reading circles, and symposia — where the archive comes alive in conversation."
          glyph="community"
          ctaPrimary={{ label: "Subscribe for Updates", href: "/community" }}
          ctaSecondary={{ label: "Explore Essays", href: "/browse" }}
        />
      </section>

      <section className="container-anv pb-14">
        <div className="flex items-center justify-between mb-6">
          <p className="type-section-label">Upcoming Events</p>
          <span className="badge badge-draft text-[0.65rem]">Dates TBA</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {UPCOMING.map(ev => (
            <ParchmentCard key={ev.title} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <span className="badge badge-received text-[0.65rem]">{ev.type}</span>
                <AnimalGlyph domain={ev.domain} size={28} className="text-[var(--gold)]" />
              </div>
              <h2 className="font-display text-2xl text-[var(--ink)] leading-tight mb-2">{ev.title}</h2>
              <p className="font-body text-sm leading-6 text-[var(--ink-soft)] mb-4">{ev.desc}</p>
              <OrnamentDivider variant="minimal" className="my-4" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 font-ui text-xs text-[var(--muted)]">
                  <Calendar size={12} className="text-[var(--gold)]" /> {ev.date}
                </div>
                <div className="flex items-center gap-2 font-ui text-xs text-[var(--muted)]">
                  <Clock size={12} className="text-[var(--gold)]" /> {ev.time}
                </div>
                <div className="flex items-center gap-2 font-ui text-xs text-[var(--muted)]">
                  <MapPin size={12} className="text-[var(--gold)]" /> {ev.mode}
                </div>
              </div>
              <button type="button" onClick={() => {}} className="btn-ink mt-4 w-full justify-center text-xs">
                Notify Me When Announced
              </button>
            </ParchmentCard>
          ))}
        </div>

        <OrnamentDivider className="my-8" />

        <EmptyState
          title="Be the first to know"
          description="Subscribe to the community newsletter — events are announced there first."
          action={<Link href="/community" className="btn-terracotta">Subscribe <ArrowRight size={14} /></Link>}
        />
      </section>
    </div>
  );
}
