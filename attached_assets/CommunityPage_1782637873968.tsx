import React from "react";
import { Users, MessageSquare, Calendar, BookOpen, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HeroPanel } from "@/components/hero/HeroPanel";
import { Button } from "@/components/ui/Button";
import { AnimalGlyph } from "@/components/glyphs/AnimalGlyph";
import { useAuth } from "@/lib/auth-context";

const COMMUNITY_FEATURES = [
  {
    icon: <MessageSquare size={20} />,
    title: "Discussions",
    desc: "Start and join conversations on essays, ideas, and themes. Ask questions, offer perspectives, build on inquiry.",
  },
  {
    icon: <Calendar size={20} />,
    title: "Salons & Events",
    desc: "Participate in online reading salons, lectures, and conversations hosted by editors and community members.",
  },
  {
    icon: <Users size={20} />,
    title: "Groups",
    desc: "Join focused groups around shared interests — Nyāya philosophy, Silk Road history, ecology, and more.",
  },
  {
    icon: <BookOpen size={20} />,
    title: "Reading paths",
    desc: "Follow curated reading journeys created by editors and community members across domains and time periods.",
  },
];

const COMMUNITY_BADGES = [
  { glyph: "elephant", label: "Seeker" },
  { glyph: "owl",      label: "Scholar" },
  { glyph: "cat",      label: "Scribe" },
  { glyph: "falcon",   label: "Guardian" },
  { glyph: "tiger",    label: "Curator" },
  { glyph: "tortoise", label: "Patron" },
];

export function CommunityPage() {
  const { user } = useAuth();

  return (
    <AppShell fullBleed>
      <HeroPanel
        variant="community"
        eyebrow="A community of curious minds"
        headline={"Share ideas.\nChallenge perspectives.\nPreserve wisdom."}
        subline="Join scholars, writers, and thinkers in building a living archive of inquiry."
        minHeight="min-h-[55vh]"
        actions={
          user
            ? [{ label: "Community feed", href: "/community/feed", variant: "primary" }]
            : [
                { label: "Start a discussion", href: "/signup", variant: "primary" },
                { label: "Discover groups", href: "/signup", variant: "ghost" },
              ]
        }
      />

      {/* What you get */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12 max-w-xl mx-auto">
            <p className="eyebrow mb-2">What's inside</p>
            <h2 className="font-[var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
              A living scholarly platform
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {COMMUNITY_FEATURES.map((feature, i) => (
              <div key={i} className="card p-6 flex flex-col gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)]">
                  {feature.icon}
                </div>
                <h3 className="font-[var(--font-display)] font-semibold text-[var(--color-ink)]">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Identity badge system */}
      <section className="py-14 bg-[var(--color-parchment-dark)] border-y border-[var(--color-border)]">
        <div className="container text-center">
          <p className="eyebrow mb-2">Community identity</p>
          <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)] mb-3">
            Earn your glyph
          </h2>
          <p className="text-[var(--color-muted)] text-sm mb-10 max-w-md mx-auto">
            Every member earns a role and glyph as they contribute — from Seeker to Patron. Your glyph travels with your name across the platform.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {COMMUNITY_BADGES.map((badge) => (
              <div key={badge.label} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white border border-[var(--color-border)] shadow-[var(--shadow-card)] text-[var(--color-teal)]">
                  <AnimalGlyph glyph={badge.glyph} size={28} />
                </div>
                <span className="text-xs font-medium text-[var(--color-ink)]">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join CTA */}
      <section className="py-20">
        <div className="container max-w-2xl text-center mx-auto">
          <p className="eyebrow mb-3">Ready to join?</p>
          <h2 className="font-[var(--font-display)] text-3xl font-bold text-[var(--color-ink)] mb-4">
            The unexamined past is the uncharted future.
          </h2>
          <p className="text-[var(--color-muted)] mb-8 leading-relaxed">
            Create a free account to join discussions, follow thinkers, save essays,
            submit work, and participate in salons and events.
          </p>

          {user ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button as="a" href="/community/feed" size="lg">
                Go to feed <ArrowRight size={16} className="ml-1" />
              </Button>
              <Button as="a" href="/community/discussions" variant="ghost" size="lg">
                Browse discussions
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button as="a" href="/signup" size="lg">
                Create account
              </Button>
              <Button as="a" href="/login" variant="ghost" size="lg">
                Sign in
              </Button>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
