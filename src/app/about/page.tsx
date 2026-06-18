export const dynamic = "force-dynamic";
import Link from "next/link";
import { Emblem } from "@/components/brand/Emblem";
import { DomainGrid } from "@/components/shared/DomainGrid";
import { prisma } from "@/lib/db";

export default async function AboutPage() {
  let categories: any[] = [];
  try {
    categories = await prisma.category.findMany({
      where: { visible: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch categories for about page:", error);
  }

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>

      {/* Hero — full-width background image */}
      <div className="container-anv pt-3 pb-5">
        <div className="card-anv overflow-hidden">
          <div
            className="relative flex flex-col justify-end p-6 md:p-10 bg-cover bg-center"
            style={{ minHeight: "260px", backgroundImage: "url('/about_hero.jpg')" }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(7,17,21,0.85) 0%, rgba(7,17,21,0.4) 50%, rgba(7,17,21,0.1) 100%)",
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-[1px] w-8" style={{ background: "#d5aa61" }} />
                <span style={{ color: "#d5aa61", fontSize: "12px" }}>✦</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl" style={{ color: "#f5f5f5" }}>
                About Ānvīkṣikī
              </h1>
              <p className="font-body text-sm italic mt-1.5" style={{ color: "rgba(245,245,245,0.7)" }}>
                A platform for thoughtful inquiry across timeless disciplines.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-anv space-y-6 pb-8">

        {/* Mission card */}
        <div
          className="rounded-2xl p-5 md:p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start gap-4">
            {/* Rose lotus circle badge */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(169,59,90,0.12)", border: "1px solid rgba(169,59,90,0.2)" }}
            >
              {/* Lotus SVG */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 28 C8 22 6 14 10 10 C12 8 14 10 16 14 C18 10 20 8 22 10 C26 14 24 22 16 28Z" fill="none" stroke="#a93b5a" strokeWidth="1.5" />
                <path d="M16 28 C10 22 6 16 8 12 C10 8 12 12 16 16 C20 12 22 8 24 12 C26 16 22 22 16 28Z" fill="none" stroke="#a93b5a" strokeWidth="1.5" opacity="0.6" />
                <circle cx="16" cy="16" r="3" fill="#a93b5a" opacity="0.4" />
              </svg>
            </div>
            <div className="flex-1">
              <span className="font-ui text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--rose)" }}>
                Our Mission
              </span>
              <h2 className="font-display text-2xl md:text-3xl mt-2 leading-tight" style={{ color: "var(--ink)" }}>
                Cultivate clarity.<br />Inspire understanding.
              </h2>
            </div>
          </div>
          <p className="font-body text-sm mt-4 leading-relaxed" style={{ color: "var(--muted)" }}>
            We publish rigorous, reflective, and timeless ideas that deepen understanding and elevate discourse.
          </p>
        </div>

        {/* What is Anvikshiki */}
        <div style={{ borderLeft: "3px solid var(--gold)", paddingLeft: "16px" }}>
          <span className="font-ui text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--gold)" }}>
            What is Ānvīkṣikī?
          </span>
        </div>
        <div className="flex gap-5 items-start">
          <div className="shrink-0">
            <Emblem size={72} />
          </div>
          <div className="space-y-3">
            <p className="font-body text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
              Ānvīkṣikī (आन्वीक्षिकी) is the science of inquiry — a tradition of critical reflection, reasoned exploration, and the pursuit of truth.
            </p>
            <p className="font-body text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Rooted in classical wisdom, it embraces all disciplines that illuminate how we think, understand, and live.
            </p>
          </div>
        </div>

        {/* Disciplines */}
        <div>
          <div style={{ borderLeft: "3px solid var(--gold)", paddingLeft: "16px", marginBottom: "16px" }}>
            <span className="font-ui text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--gold)" }}>
              Disciplines We Explore
            </span>
          </div>
          <DomainGrid categories={categories} />
        </div>

        {/* Quote banner */}
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}
        >
          {/* Pink lotus decoration */}
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="shrink-0">
            <path d="M22 38 C12 30 10 20 14 14 C16 10 19 14 22 20 C25 14 28 10 30 14 C34 20 32 30 22 38Z" fill="none" stroke="#d99aaa" strokeWidth="2" />
            <path d="M22 38 C14 30 8 22 12 16 C14 10 18 16 22 22 C26 16 30 10 32 16 C36 22 30 30 22 38Z" fill="none" stroke="#d99aaa" strokeWidth="1.5" opacity="0.5" />
            <circle cx="22" cy="22" r="4" fill="#a93b5a" opacity="0.25" />
          </svg>
          <div>
            <span className="font-display text-2xl" style={{ color: "var(--gold)" }}>&ldquo;</span>
            <p className="font-display text-base md:text-lg italic leading-snug" style={{ color: "var(--ink)" }}>
              Inquiry is the lamp that dispels the shadows of ignorance.
            </p>
            <p className="font-ui text-[10px] mt-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              — Traditional Proverb
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
