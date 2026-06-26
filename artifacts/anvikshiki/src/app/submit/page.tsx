import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, BookOpen, FileText, Languages, MessageSquare, PenLine, Upload } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { SubmissionStepper } from "@/components/manuscript/SubmissionStepper";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const TYPES = [
  { id: "essay", label: "Essay / Paper", icon: FileText, domain: "papers", desc: "Original scholarly or reflective work." },
  { id: "review", label: "Review / Commentary", icon: MessageSquare, domain: "sociology", desc: "Critical reflection on a text, idea, or public debate." },
  { id: "translation", label: "Translation", icon: Languages, domain: "translations", desc: "Classical or modern texts brought into living language." },
  { id: "book-review", label: "Book Review", icon: BookOpen, domain: "history", desc: "Review of a published book, manuscript, or archive source." },
] as const;

export default function SubmitLandingPage() {
  const [, navigate] = useLocation();
  const [selectedType, setSelectedType] = useState("essay");

  const proceed = (method: "write" | "upload") => {
    sessionStorage.setItem("anvikshiki_submit_type", selectedType);
    navigate(method === "write" ? "/submit/write" : "/submit/details");
  };

  return (
    <div className="bg-[var(--bg)]">
      <section className="container-anv py-6 md:py-10">
        <HeroPanel
          image={asset("/images/heroes/submit-hero.jpg")}
          imageAlt="Illustrated traveler-scholar entering the archive"
          eyebrow="Submission Portal"
          title="Share your inquiry. Join the archive."
          description="Anvikshiki welcomes original essays, research papers, translations, reviews, and reflections that deepen civilizational inquiry."
          glyph="submit"
          focal="center"
          ctaSecondary={{ label: "Community", href: "/community" }}
        />
      </section>

      <section id="submission-start" className="container-anv pb-14">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <ParchmentCard className="p-5 md:p-7">
              <p className="type-section-label mb-4">Submit Your Work</p>
              <SubmissionStepper active={0} className="mb-6" />

              <div className="grid gap-3 sm:grid-cols-2">
                {TYPES.map((type) => {
                  const Icon = type.icon;
                  const selected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className="rounded-[8px] border p-4 text-left transition"
                      style={{
                        borderColor: selected ? "var(--terracotta)" : "var(--border-gold)",
                        background: selected ? "var(--terracotta-pale)" : "var(--surface)",
                      }}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] text-[var(--gold)]">
                          <Icon size={21} />
                        </span>
                        <AnimalGlyph domain={type.domain} size={32} />
                      </div>
                      <h2 className="font-display text-2xl text-[var(--ink)]">{type.label}</h2>
                      <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)]">{type.desc}</p>
                    </button>
                  );
                })}
              </div>

              <OrnamentDivider className="my-7" />

              <div className="grid gap-4 md:grid-cols-2">
                <button type="button" onClick={() => proceed("write")} className="card-parchment hoverable card-corners p-5 text-left">
                  <PenLine className="mb-4 text-[var(--terracotta)]" size={30} />
                  <h3 className="font-display text-2xl text-[var(--ink)]">Write Here</h3>
                  <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)]">Compose directly in the browser. Draft details are preserved through the flow.</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.12em] text-[var(--terracotta)]">Open Editor <ArrowRight size={14} /></span>
                </button>

                <button type="button" onClick={() => proceed("upload")} className="card-parchment hoverable card-corners p-5 text-left">
                  <Upload className="mb-4 text-[var(--gold)]" size={30} />
                  <h3 className="font-display text-2xl text-[var(--ink)]">Upload a File</h3>
                  <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)]">Attach an existing PDF, DOC, DOCX, or text manuscript after adding details.</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.12em] text-[var(--terracotta)]">Continue <ArrowRight size={14} /></span>
                </button>
              </div>
            </ParchmentCard>
          </div>

          <aside className="space-y-4">
            <ParchmentCard className="p-5">
              <p className="type-section-label mb-3">Checklist</p>
              <ul className="space-y-3 font-body text-sm leading-6 text-[var(--ink-soft)]">
                <li>Original and unpublished work</li>
                <li>Clear abstract and keywords</li>
                <li>Anonymized manuscript where required</li>
                <li>References and citations included</li>
              </ul>
            </ParchmentCard>
            <ParchmentCard className="p-5 text-center">
              <div className="mx-auto mb-3 flex justify-center gap-3 text-[var(--gold)]">
                {["geopolitics", "history", "philosophy", "translations"].map((domain) => <AnimalGlyph key={domain} domain={domain} size={34} />)}
              </div>
              <h2 className="font-display text-2xl text-[var(--ink)]">Into the archive</h2>
              <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)]">Every inquiry becomes a thread. Every thread, a tapestry.</p>
            </ParchmentCard>
          </aside>
        </div>
      </section>
    </div>
  );
}
