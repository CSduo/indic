import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { LotusDivider, LotusIcon, TrishulIcon } from "@/components/sacred/LotusIcon";
import { Emblem } from "@/components/brand/Emblem";

export default function AboutPage() {
  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 360 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0f0820 0%, #0a0518 50%, #0f0a20 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(139,26,74,0.25) 0%, transparent 55%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 75% 40%, rgba(74,40,120,0.20) 0%, transparent 50%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
        </div>
        <div className="container-anv relative z-10 flex flex-col items-center text-center py-20">
          <Emblem size={72} className="mb-6 animate-float" />
          <div className="section-label mb-3">Our Mission</div>
          <h1 className="font-display mb-4" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", color: "var(--gold-bright)", letterSpacing: "0.12em" }}>About Ānvīkṣikī</h1>
          <LotusIcon size={18} className="mb-4" style={{ color: "var(--gold)", opacity: 0.6 }} />
          <p className="font-body text-lg max-w-2xl leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            A journal of inquiry, civilizational wisdom, and dharmic thought — illuminating ideas at the intersection of philosophy, history, science, and living tradition.
          </p>
        </div>
      </div>

      {/* Mission section */}
      <div className="container-anv py-16 max-w-3xl mx-auto">
        <LotusDivider className="mb-10" />
        <div className="prose-sacred space-y-6">
          <p className="font-body text-lg leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            <strong style={{ color: "var(--gold-bright)" }}>Ānvīkṣikī</strong> — the ancient Sanskrit word for the philosophical examination of truth — is a journal dedicated to the rigorous and beautiful study of ideas.
          </p>
          <p className="font-body text-base leading-relaxed" style={{ color: "var(--ink-faint)" }}>
            We publish essays, research papers, translations, and commentary across philosophy, history, psychology, sociology, science, geopolitics, civilizational thought, and the Sanskrit tradition. Our mission is to bridge timeless wisdom with contemporary inquiry.
          </p>
          <p className="font-body text-base leading-relaxed" style={{ color: "var(--ink-faint)" }}>
            Every work on this platform has been carefully reviewed for intellectual rigor, clarity of thought, and depth of understanding. We believe that great ideas deserve both careful scholarship and beautiful presentation.
          </p>
        </div>

        <LotusDivider className="my-12" />

        {/* Values */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            { icon: "🕉️", title: "Inquiry", desc: "We honour the ancient practice of systematic questioning — ānvīkṣikī — as the foundation of all wisdom." },
            { icon: "📜", title: "Tradition", desc: "Rooted in the dharmic traditions while engaging critically with all civilizational thought." },
            { icon: "✨", title: "Illumination", desc: "Making complex ideas accessible, beautiful, and transformative for seekers of all backgrounds." },
          ].map(v => (
            <div key={v.title} className="card-sacred p-6 text-center">
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", filter: "drop-shadow(0 0 8px rgba(201,152,58,0.3))" }}>{v.icon}</div>
              <h3 className="font-display text-xl mb-2" style={{ color: "var(--gold-bright)" }}>{v.title}</h3>
              <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ink-faint)" }}>{v.desc}</p>
            </div>
          ))}
        </div>

        <LotusDivider className="mb-10" />

        {/* CTA */}
        <div className="text-center">
          <h2 className="font-display text-2xl mb-4" style={{ color: "var(--parchment)" }}>Join the Archive</h2>
          <p className="font-body text-sm mb-6" style={{ color: "var(--ink-faint)" }}>Share your research and reflections with our community of seekers and scholars.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/submit" className="btn-sacred btn-gold">Submit Your Work <ArrowRight size={14} /></Link>
            <Link href="/community" className="btn-sacred btn-ghost">Join Community</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
