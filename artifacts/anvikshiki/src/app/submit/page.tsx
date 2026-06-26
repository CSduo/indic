import { useLocation } from "wouter";
import { Feather, BookOpen, FileText, MessageSquare, ArrowRight } from "lucide-react";
import { Emblem } from "@/components/brand/Emblem";
import { LotusIcon, LotusDivider } from "@/components/sacred/LotusIcon";

const TYPES = [
  { id: "essay",       label: "Essay / Paper",       icon: <FileText size={22} />,      desc: "Original scholarly or reflective work" },
  { id: "review",      label: "Review / Commentary", icon: <MessageSquare size={22} />,  desc: "Critical review or commentary on existing work" },
  { id: "translation", label: "Translation",         icon: <Feather size={22} />,        desc: "Classical text in living language" },
  { id: "book-review", label: "Book Review",         icon: <BookOpen size={22} />,       desc: "Review of a published book or manuscript" },
];

export default function SubmitLandingPage() {
  const [, navigate] = useLocation();
  const choose = (type: string) => {
    sessionStorage.setItem("anvikshiki_submit_type", type);
    navigate("/submit/details");
  };

  return (
    <div style={{ background: "var(--bg)" }}>

      {/* ══ Hero (dark atmospheric) ══ */}
      <div className="relative overflow-hidden" style={{ minHeight: 400 }}>
        <div className="absolute inset-0" aria-hidden="true">
          {/* Base atmospheric */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #0a0420 0%, #120818 40%, #0e0610 100%)" }} />
          {/* Arch/portal glow */}
          <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(74,40,120,0.35) 0%, transparent 65%)" }} />
          <div style={{ position: "absolute", bottom: "5%", right: "10%", width: 300, height: 300, background: "radial-gradient(circle, rgba(139,26,74,0.22) 0%, transparent 65%)" }} />
          <div style={{ position: "absolute", bottom: "5%", left: "5%", width: 280, height: 280, background: "radial-gradient(circle, rgba(160,90,20,0.18) 0%, transparent 65%)" }} />
          {/* Rose petals scattered */}
          {[
            { left: "12%", top: "25%" }, { left: "82%", top: "30%" },
            { left: "22%", top: "68%" }, { left: "72%", top: "62%" },
            { left: "50%", top: "15%" },
          ].map((p, i) => (
            <div key={i} style={{ position: "absolute", left: p.left, top: p.top, width: 8, height: 8, borderRadius: "50% 0 50% 0", background: "var(--lotus)", opacity: 0.15, transform: `rotate(${i*37}deg)` }} />
          ))}
          {/* Stars */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", left: `${6+(i*43)%88}%`, top: `${6+(i*57)%80}%`, width: 1.5, height: 1.5, borderRadius: "50%", background: "var(--gold)", opacity: 0.05+(i%6)*0.035 }} />
          ))}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
        </div>

        <div className="container-anv relative z-10 flex flex-col items-center text-center py-16">
          {/* Emblem seal */}
          <div className="animate-float mb-5" style={{ filter: "drop-shadow(0 0 24px rgba(201,152,58,0.40))" }}>
            <Emblem size={76} />
          </div>
          <div className="section-label mb-2">Submission Portal</div>
          <h1 className="font-display mb-3" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", color: "var(--gold-bright)", letterSpacing: "0.06em", lineHeight: 1 }}>
            Submit Your Work
          </h1>
          <p className="font-body text-base italic" style={{ color: "var(--ink-soft)", maxWidth: 320 }}>
            Share your research.<br/>Contribute to knowledge.
          </p>
        </div>
      </div>

      {/* ══ Parchment form area ══ */}
      <div style={{ background: "var(--bg)", paddingBottom: "5rem" }}>
        <div className="container-anv" style={{ maxWidth: 620, paddingTop: "0.5rem" }}>

          {/* Parchment card */}
          <div className="parchment-card">
            <LotusDivider className="mb-5" style={{ opacity: 0.5 }} />

            {/* Submission type */}
            <div className="flex items-center gap-3 mb-4">
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(139,90,30,0.3))" }} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8b6020" }}>Submission Type</span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(139,90,30,0.3), transparent)" }} />
            </div>

            <div className="space-y-3 mb-6">
              {TYPES.map((t, i) => (
                <TypeRadioCard key={t.id} label={t.label} icon={t.icon} desc={t.desc} isSelected={i === 0} onClick={() => choose(t.id)} />
              ))}
            </div>

            <LotusDivider className="mb-5" style={{ opacity: 0.4 }} />

            {/* CTA */}
            <button
              type="button"
              onClick={() => choose("essay")}
              className="w-full btn-sacred btn-gold flex items-center justify-center gap-2 py-3.5"
              style={{ borderRadius: 8, fontSize: "0.8rem" }}
            >
              Continue to Details <ArrowRight size={15} />
            </button>
          </div>

          {/* Steps card below */}
          <div className="mt-6 card-sacred p-5">
            <LotusDivider className="mb-4" />
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { n: "01", l: "Choose Type", d: "Select submission type" },
                { n: "02", l: "Add Details", d: "Fill manuscript details" },
                { n: "03", l: "Upload & Review", d: "Attach file & submit" },
              ].map(s => (
                <div key={s.n} className="flex flex-col items-center gap-2">
                  <div className="font-display text-lg" style={{ color: "var(--gold)", opacity: 0.65 }}>{s.n}</div>
                  <div className="font-ui text-[10px] font-semibold tracking-[0.08em]" style={{ color: "var(--gold-bright)" }}>{s.l}</div>
                  <div className="font-body text-[10px]" style={{ color: "var(--ink-faint)" }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypeRadioCard({ label, icon, desc, isSelected, onClick }: {
  label: string; icon: React.ReactNode; desc: string; isSelected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all text-left"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${isSelected ? "rgba(139,90,20,0.6)" : "rgba(139,90,20,0.22)"}`,
        cursor: "pointer",
      }}
    >
      {/* Icon box */}
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: "rgba(139,90,20,0.12)",
        border: "1px solid rgba(139,90,20,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#8b6020",
      }}>
        {icon}
      </div>

      {/* Label */}
      <div className="flex-1">
        <div className="font-ui text-sm font-medium" style={{ color: "#5a3a08" }}>{label}</div>
        <div className="font-body text-[11px]" style={{ color: "#8b6a30", opacity: 0.8 }}>{desc}</div>
      </div>

      {/* Radio */}
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${isSelected ? "#8b6020" : "rgba(139,90,20,0.4)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b6020" }} />}
      </div>
    </button>
  );
}
