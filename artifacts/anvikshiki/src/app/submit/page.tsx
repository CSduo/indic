import { useState } from "react";
import { useLocation } from "wouter";
import { Feather, BookOpen, FileText, MessageSquare, PenLine, Upload, ArrowRight } from "lucide-react";
import { Emblem } from "@/components/brand/Emblem";
import { LotusIcon, LotusDivider } from "@/components/sacred/LotusIcon";

const TYPES = [
  { id: "essay",       label: "Essay / Paper",       icon: <FileText size={20} />,     desc: "Original scholarly or reflective work" },
  { id: "review",      label: "Review / Commentary", icon: <MessageSquare size={20} />, desc: "Critical review or commentary on existing work" },
  { id: "translation", label: "Translation",         icon: <Feather size={20} />,       desc: "Classical text rendered into a living language" },
  { id: "book-review", label: "Book Review",         icon: <BookOpen size={20} />,      desc: "Review of a published book or manuscript" },
];

export default function SubmitLandingPage() {
  const [, navigate] = useLocation();
  const [selectedType, setSelectedType] = useState("essay");

  const proceed = (method: "write" | "upload") => {
    sessionStorage.setItem("anvikshiki_submit_type", selectedType);
    if (method === "write") {
      navigate("/submit/write");
    } else {
      navigate("/submit/details");
    }
  };

  return (
    <div style={{ background: "var(--bg)" }}>

      {/* ══ Hero ══ */}
      <div className="relative overflow-hidden" style={{ minHeight: 380 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #0a0420 0%, #120818 40%, #0e0610 100%)" }} />
          <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(74,40,120,0.35) 0%, transparent 65%)" }} />
          <div style={{ position: "absolute", bottom: "5%", right: "10%", width: 300, height: 300, background: "radial-gradient(circle, rgba(139,26,74,0.22) 0%, transparent 65%)" }} />
          <div style={{ position: "absolute", bottom: "5%", left: "5%", width: 280, height: 280, background: "radial-gradient(circle, rgba(160,90,20,0.18) 0%, transparent 65%)" }} />
          {[{ left: "12%", top: "25%" }, { left: "82%", top: "30%" }, { left: "22%", top: "68%" }, { left: "72%", top: "62%" }, { left: "50%", top: "15%" }].map((p, i) => (
            <div key={i} style={{ position: "absolute", left: p.left, top: p.top, width: 8, height: 8, borderRadius: "50% 0 50% 0", background: "var(--lotus)", opacity: 0.15, transform: `rotate(${i * 37}deg)` }} />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", left: `${6 + (i * 43) % 88}%`, top: `${6 + (i * 57) % 80}%`, width: 1.5, height: 1.5, borderRadius: "50%", background: "var(--gold)", opacity: 0.05 + (i % 6) * 0.035 }} />
          ))}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
        </div>

        <div className="container-anv relative z-10 flex flex-col items-center text-center py-16">
          <div className="animate-float mb-5" style={{ filter: "drop-shadow(0 0 24px rgba(201,152,58,0.40))" }}>
            <Emblem size={76} />
          </div>
          <div className="section-label mb-2">Submission Portal</div>
          <h1 className="font-display mb-3" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", color: "var(--gold-bright)", letterSpacing: "0.06em", lineHeight: 1 }}>
            Submit Your Work
          </h1>
          <p className="font-body text-base italic" style={{ color: "var(--ink-soft)", maxWidth: 320 }}>
            Share your research.<br />Contribute to knowledge.
          </p>
        </div>
      </div>

      {/* ══ Form area ══ */}
      <div style={{ background: "var(--bg)", paddingBottom: "5rem" }}>
        <div className="container-anv" style={{ maxWidth: 680, paddingTop: "0.5rem" }}>

          {/* Step 1 — Pick type */}
          <div className="parchment-card mb-5">
            <LotusDivider className="mb-5" style={{ opacity: 0.5 }} />

            <div className="flex items-center gap-3 mb-4">
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(139,90,30,0.3))" }} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8b6020" }}>
                Step 1 — Type of Submission
              </span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(139,90,30,0.3), transparent)" }} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-2">
              {TYPES.map(t => (
                <TypeCard
                  key={t.id}
                  label={t.label}
                  icon={t.icon}
                  desc={t.desc}
                  selected={selectedType === t.id}
                  onClick={() => setSelectedType(t.id)}
                />
              ))}
            </div>
          </div>

          {/* Step 2 — Choose method */}
          <div className="parchment-card">
            <div className="flex items-center gap-3 mb-5">
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(139,90,30,0.3))" }} />
              <span style={{ fontFamily: "var(--font-ui)", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8b6020" }}>
                Step 2 — How Would You Like to Submit?
              </span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(139,90,30,0.3), transparent)" }} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Write option */}
              <MethodCard
                icon={<PenLine size={28} />}
                title="Write Here"
                desc="Compose your essay directly in the browser. Everything is auto-saved as you write — never lose a word."
                accent="var(--gold)"
                onClick={() => proceed("write")}
                cta="Open Editor"
              />

              {/* Upload option */}
              <MethodCard
                icon={<Upload size={28} />}
                title="Upload a File"
                desc="Already have a finished manuscript? Upload a PDF, Word, or text file and attach supporting images."
                accent="var(--lotus)"
                onClick={() => proceed("upload")}
                cta="Upload File"
              />
            </div>

            <LotusDivider className="mt-5 mb-1" style={{ opacity: 0.3 }} />
            <p className="font-body text-xs text-center" style={{ color: "var(--ink-faint)", opacity: 0.7, marginTop: "0.75rem" }}>
              Either path will guide you through adding your details, abstract, and keywords before submission.
            </p>
          </div>

          {/* Process steps */}
          <div className="mt-5 card-sacred p-5">
            <LotusDivider className="mb-4" />
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { n: "01", l: "Choose Type", d: "Select your submission category" },
                { n: "02", l: "Write or Upload", d: "Compose or attach your manuscript" },
                { n: "03", l: "Review & Submit", d: "Confirm details and send" },
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

function TypeCard({ label, icon, desc, selected, onClick }: {
  label: string; icon: React.ReactNode; desc: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left"
      style={{
        background: selected ? "rgba(139,90,20,0.10)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? "rgba(139,90,20,0.6)" : "rgba(139,90,20,0.2)"}`,
        cursor: "pointer",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: "rgba(139,90,20,0.12)",
        border: "1px solid rgba(139,90,20,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: selected ? "var(--gold)" : "#8b6020",
      }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-ui text-xs font-semibold" style={{ color: selected ? "var(--gold-bright)" : "#5a3a08" }}>{label}</div>
        <div className="font-body text-[10px]" style={{ color: "#8b6a30", opacity: 0.8 }}>{desc}</div>
      </div>
      <div style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${selected ? "var(--gold)" : "rgba(139,90,20,0.35)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)" }} />}
      </div>
    </button>
  );
}

function MethodCard({ icon, title, desc, accent, onClick, cta }: {
  icon: React.ReactNode; title: string; desc: string; accent: string; onClick: () => void; cta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-col items-start gap-3 p-5 rounded-xl transition-all text-left group"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid rgba(139,90,20,0.2)`,
        cursor: "pointer",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${accent} 50%, transparent)`; (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${accent} 5%, transparent)`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,90,20,0.2)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
    >
      <div style={{ color: accent, opacity: 0.8 }}>{icon}</div>
      <div>
        <div className="font-ui text-sm font-semibold mb-1" style={{ color: "var(--gold-bright)" }}>{title}</div>
        <div className="font-body text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>{desc}</div>
      </div>
      <div className="flex items-center gap-1.5 mt-auto font-ui text-xs font-semibold" style={{ color: accent }}>
        {cta} <ArrowRight size={13} />
      </div>
    </button>
  );
}
