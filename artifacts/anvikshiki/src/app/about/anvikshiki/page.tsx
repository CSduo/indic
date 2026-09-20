import { Link } from "wouter";
import { ArrowRight, BookOpen, Compass, Feather, Sparkles } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { AmbientPetals, FloralBorder, FloralCorner } from "@/components/sacred/FloralDecor";
import { useDocumentMetadata } from "@/hooks/useDocumentMetadata";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export default function AnvikshikiMeaningPage() {
  useDocumentMetadata({
    title: "Meaning of Ānvīkṣikī: Etymology, Philosophy & Classical Heritage — Ānvīkṣikī",
    description: "Explore the profound meaning of Ānvīkṣikī (आन्वीक्षिकी): the Sanskrit etymology, Kautilya's Arthaśāstra doctrine of the foundational science, and Nyāya rational inquiry.",
    canonicalPath: "/about/anvikshiki",
    type: "article",
  });

  return (
    <div className="relative bg-[var(--bg)] overflow-hidden">
      <AmbientPetals />
      <FloralCorner position="tl" size={90} className="absolute top-0 left-0 text-[var(--gold)] opacity-45" />
      <FloralCorner position="tr" size={90} className="absolute top-0 right-0 text-[var(--gold)] opacity-45" />

      {/* Breadcrumb Navigation */}
      <section className="container-anv relative z-10 pt-6">
        <nav className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[var(--terracotta)]">Home</Link>
          <span>/</span>
          <Link href="/about" className="hover:text-[var(--terracotta)]">About</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Meaning of Ānvīkṣikī</span>
        </nav>
      </section>

      {/* Hero Section */}
      <section className="container-anv relative z-10 py-4 md:py-8">
        <HeroPanel
          image={asset("/images/provided/about-temple-guardian-cat-hero.jpg")}
          imageAlt="Sacred library and carved stone pillars of ancient Indic knowledge traditions"
          eyebrow="Classical Sanskrit Epistemology"
          title="The Meaning of Ānvīkṣikī"
          subtitle="आन्वीक्षिकी — The Science of Critical Inquiry & Rational Examination"
          description="From Kautilya's Arthaśāstra to the Nyāya-darśana: the historical origins, linguistic roots, and living philosophical significance of India's foundational tradition of inquiry."
          glyph="philosophy"
          focal="center"
          ctaPrimary={{ label: "Explore Philosophical Papers", href: "/domains/philosophy" }}
          ctaSecondary={{ label: "Browse Publications", href: "/browse" }}
        />
      </section>

      <FloralBorder petals={5} className="my-2 px-8 opacity-50 relative z-10" />

      {/* Core Scholarly Treatise Content */}
      <section className="container-anv relative z-10 pb-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Main Editorial Column */}
          <article className="space-y-8">
            <ParchmentCard className="p-6 md:p-10">
              <span className="type-section-label mb-3 block">Etymological Breakdown</span>
              <h2 className="font-display text-3xl md:text-4xl text-[var(--ink)] mb-4">
                What does <em>Ānvīkṣikī</em> mean in Sanskrit and English?
              </h2>
              <div className="prose-anv font-serif text-lg leading-relaxed text-[var(--ink-soft)] space-y-4">
                <p>
                  In the classical Sanskrit intellectual lexicon, <strong>Ānvīkṣikī</strong> (Devanagari: <em>आन्वीक्षिकी</em>; IAST transliteration: <em>ānvīkṣikī</em>; often transcribed colloquially as <em>Anvikshiki</em>) denotes <strong>the science of critical inquiry</strong>, <strong>investigative examination</strong>, or <strong>reasoned philosophical investigation</strong>.
                </p>
                <div className="my-6 rounded-lg border border-[var(--border-gold)] bg-[var(--surface-alt)] p-6">
                  <h3 className="font-display text-xl text-[var(--ink)] mb-3 flex items-center gap-2">
                    <Feather size={18} className="text-[var(--gold)]" /> Morphological Analysis (Pāṇinian Vyutpatti)
                  </h3>
                  <ul className="space-y-2 font-ui text-sm text-[var(--ink-soft)]">
                    <li><strong>anu (अनु)</strong> — prefix meaning "following upon", "after", or "subsequent to" (direct observation or sensory perception).</li>
                    <li><strong>īkṣā (ईक्षा)</strong> — root meaning "to look at", "to behold", "to scrutinize", or "to perceive".</li>
                    <li><strong>ikī (इक / की)</strong> — feminine secondary affix (*ṭhañ* / *striyām*) designating a recognized branch of systematic knowledge or science (*vidyā*).</li>
                  </ul>
                  <p className="mt-3 font-serif text-base italic text-[var(--ink)]">
                    Compound Sense: "That science which undertakes investigation (*īkṣā*) subsequent to (*anu*) immediate perception or textual authority by means of rigorous reason (*yukti*)."
                  </p>
                </div>
                <p>
                  In English academic discourse, Ānvīkṣikī translates alternatively as <em>"rational inquiry"</em>, <em>"investigative science"</em>, <em>"critical philosophy"</em>, or <em>"dialectic epistemology"</em>. Unlike passive reception of scripture or dogma, Ānvīkṣikī embodies the disciplined mental faculty that subjects every assertion, empirical claim, and moral principle to structured validation.
                </p>
              </div>
            </ParchmentCard>

            <ParchmentCard className="p-6 md:p-10">
              <span className="type-section-label mb-3 block">Historical & Textual Foundations</span>
              <h2 className="font-display text-3xl md:text-4xl text-[var(--ink)] mb-4">
                Ānvīkṣikī in Kautilya's <em>Arthaśāstra</em>
              </h2>
              <div className="prose-anv font-serif text-lg leading-relaxed text-[var(--ink-soft)] space-y-4">
                <p>
                  The most influential classical exposition of Ānvīkṣikī appears in the opening book of Kautilya's monumental statecraft treatise, the <em>Arthaśāstra</em> (circa 4th–3rd century BCE). Kautilya defines four foundational fields of human and civilizational learning:
                </p>
                <ol className="list-decimal pl-6 space-y-2 font-ui text-base text-[var(--ink)]">
                  <li><strong>Ānvīkṣikī (आन्वीक्षिकी)</strong> — Philosophy, logic, and rational inquiry.</li>
                  <li><strong>Trayī (त्रयी)</strong> — The sacred knowledge of the three Vedas and traditional ethos.</li>
                  <li><strong>Vārtā (वार्ता)</strong> — Economics, agriculture, commerce, and trade.</li>
                  <li><strong>Daṇḍanīti (दण्डनीति)</strong> — Political science, law enforcement, and statecraft.</li>
                </ol>
                <blockquote className="my-6 border-l-4 border-[var(--gold)] pl-4 py-2 italic font-serif text-xl text-[var(--ink)] bg-[var(--surface-alt)]/60 rounded-r">
                  "प्रदीपः सर्वविद्यानाम् उपायः सर्वकर्मणाम् ।<br />
                  आश्रयः सर्वधर्माणां शश्वदान्वीक्षिकी मता ॥"<br />
                  <span className="block mt-2 font-ui text-sm not-italic text-[var(--ink-faint)]">
                    — Kautilya, Arthaśāstra 1.2.12
                  </span>
                </blockquote>
                <p>
                  <em>Translation:</em> "Ānvīkṣikī is ever held to be the illuminating lamp of all sciences, the pragmatic means of all actions, and the foundational support of all civic and ethical duties."
                </p>
                <p>
                  Crucially, Kautilya identifies Ānvīkṣikī with three schools of rigorous thought: <strong>Sāṅkhya</strong> (analytical metaphysics), <strong>Yoga</strong> (disciplined introspection and experiential psychology), and <strong>Lokāyata</strong> (empirical/material scrutiny). By applying reasons to determine what is beneficial and unbeneficial in economics (*vārtā*), right and wrong in governance (*daṇḍanīti*), and strength and weakness in the state, Ānvīkṣikī confers clarity of intellect and balance of mind in adversity and prosperity alike.
                </p>
              </div>
            </ParchmentCard>

            <ParchmentCard className="p-6 md:p-10">
              <span className="type-section-label mb-3 block">Evolution into Epistemology & Logic</span>
              <h2 className="font-display text-3xl md:text-4xl text-[var(--ink)] mb-4">
                The Nyāya Tradition & <em>Pramāṇair Artha-Parīkṣaṇam</em>
              </h2>
              <div className="prose-anv font-serif text-lg leading-relaxed text-[var(--ink-soft)] space-y-4">
                <p>
                  In the centuries following Kautilya, Ānvīkṣikī became synonymous with the formal classical school of logic and epistemology: the <strong>Nyāya-darśana</strong>. In his authoritative commentary on the *Nyāyasūtra* (*Nyāyabhāṣya* 1.1.1), the master philosopher <strong>Vātsyāyana</strong> defined Ānvīkṣikī with supreme precision:
                </p>
                <blockquote className="my-6 border-l-4 border-[var(--terracotta)] pl-4 py-2 italic font-serif text-xl text-[var(--ink)] bg-[var(--surface-alt)]/60 rounded-r">
                  "प्रत्यक्षागमाभ्यामीक्षितस्यान्वीक्षणमन्वीक्षा । तया प्रवर्तत इत्यान्वीक्षिकी न्यायविद्या न्यायशास्त्रम् ।"<br />
                  <span className="block mt-2 font-ui text-sm not-italic text-[var(--ink-faint)]">
                    — Vātsyāyana, Nyāyabhāṣya 1.1.1
                  </span>
                </blockquote>
                <p>
                  <em>"Anvīkṣā is the subsequent examination (*anv-īkṣaṇa*) of what has already been cognized through immediate perception (*pratyakṣa*) and authoritative tradition (*āgama*). That science which proceeds by this method is Ānvīkṣikī — the science of Nyāya, the discipline of rational critique."</em>
                </p>
                <p>
                  Vātsyāyana explicitly characterizes its method as <em>pramāṇair artha-parīkṣaṇam</em>: the rigorous testing and verification of reality through valid means of knowledge (*pramāṇas*): perception, logical inference (*anumāna*), comparison (*upamāna*), and trustworthy testimony (*śabda*).
                </p>
              </div>
            </ParchmentCard>

            <ParchmentCard className="p-6 md:p-10">
              <span className="type-section-label mb-3 block">Journal Purpose & Ethos</span>
              <h2 className="font-display text-3xl md:text-4xl text-[var(--ink)] mb-4">
                Why Our Journal Bears the Name Ānvīkṣikī
              </h2>
              <div className="prose-anv font-serif text-lg leading-relaxed text-[var(--ink-soft)] space-y-4">
                <p>
                  We founded <strong>Ānvīkṣikī</strong> to revive this civilizational commitment to fearless, transparent, and multi-disciplinary inquiry. In an age dominated by disposable social feeds, ideological polarization, and fragmented attention, our journal creates a permanent, dignified sanctuary for long-form scholarship.
                </p>
                <p>
                  Our editorial vision embodies three central principles drawn directly from classical Ānvīkṣikī:
                </p>
                <div className="grid gap-4 sm:grid-cols-3 my-6">
                  <div className="rounded-lg border border-[var(--border-ink)] bg-[var(--surface)] p-4 text-center">
                    <Compass size={24} className="mx-auto mb-2 text-[var(--gold)]" />
                    <h4 className="font-display text-lg text-[var(--ink)]">Inquiry Over Dogma</h4>
                    <p className="mt-1 font-ui text-xs text-[var(--ink-soft)]">Subjecting all hypotheses to systematic rational scrutiny.</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-ink)] bg-[var(--surface)] p-4 text-center">
                    <BookOpen size={24} className="mx-auto mb-2 text-[var(--terracotta)]" />
                    <h4 className="font-display text-lg text-[var(--ink)]">Civilizational Memory</h4>
                    <p className="mt-1 font-ui text-xs text-[var(--ink-soft)]">Engaging primary Indic sources, Sanskrit traditions, and global archives.</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-ink)] bg-[var(--surface)] p-4 text-center">
                    <Sparkles size={24} className="mx-auto mb-2 text-[var(--gold)]" />
                    <h4 className="font-display text-lg text-[var(--ink)]">Living Scholarship</h4>
                    <p className="mt-1 font-ui text-xs text-[var(--ink-soft)]">Open-access, permanent digital preservation for scholars and readers worldwide.</p>
                  </div>
                </div>
                <p>
                  Whether exploring ancient Indian astronomy, Sanskrit grammar, Vedic hermeneutics, Southeast Asian Hindu history, or contemporary geopolitics, Ānvīkṣikī remains faithful to Kautilya's promise: acting as a lamp that illuminates knowledge for every sincere seeker.
                </p>
              </div>
            </ParchmentCard>
          </article>

          {/* Scholarly Sidebar & Fast Navigation */}
          <aside className="space-y-6">
            <ParchmentCard className="p-6 text-center">
              <AnimalGlyph domain="philosophy" size={68} className="mx-auto mb-3 text-[var(--gold)]" />
              <h3 className="font-display text-2xl text-[var(--ink)]">Quick Facts</h3>
              <dl className="mt-4 space-y-3 font-ui text-xs text-left border-t border-[var(--border-ink)] pt-3">
                <div>
                  <dt className="font-bold text-[var(--ink-faint)] uppercase">Sanskrit Word</dt>
                  <dd className="font-serif text-base text-[var(--ink)]">आन्वीक्षिकी</dd>
                </div>
                <div>
                  <dt className="font-bold text-[var(--ink-faint)] uppercase">IAST Transliteration</dt>
                  <dd className="font-mono text-sm text-[var(--ink)]">ānvīkṣikī</dd>
                </div>
                <div>
                  <dt className="font-bold text-[var(--ink-faint)] uppercase">Common Spellings</dt>
                  <dd className="text-[var(--ink-soft)]">Anvikshiki, Aanvikshiki, Anvikshiki Vidya</dd>
                </div>
                <div>
                  <dt className="font-bold text-[var(--ink-faint)] uppercase">Earliest Canon</dt>
                  <dd className="text-[var(--ink-soft)]">Arthaśāstra (Kautilya), Nyāyasūtra (Akṣapāda Gautama)</dd>
                </div>
                <div>
                  <dt className="font-bold text-[var(--ink-faint)] uppercase">Primary Definition</dt>
                  <dd className="text-[var(--ink-soft)]">The science of inquiry, philosophical examination, and logic</dd>
                </div>
              </dl>
            </ParchmentCard>

            <ParchmentCard className="p-6">
              <h3 className="font-display text-xl text-[var(--ink)] mb-3">Explore Related Hubs</h3>
              <ul className="space-y-2 font-ui text-sm">
                <li>
                  <Link href="/domains/philosophy" className="text-[var(--terracotta)] hover:underline flex items-center justify-between">
                    <span>Indian Philosophy Hub</span>
                    <ArrowRight size={14} />
                  </Link>
                </li>
                <li>
                  <Link href="/domains/sanskrit-studies" className="text-[var(--terracotta)] hover:underline flex items-center justify-between">
                    <span>Sanskrit Studies & Shastra</span>
                    <ArrowRight size={14} />
                  </Link>
                </li>
                <li>
                  <Link href="/domains/history" className="text-[var(--terracotta)] hover:underline flex items-center justify-between">
                    <span>History & Civilizational Memory</span>
                    <ArrowRight size={14} />
                  </Link>
                </li>
                <li>
                  <Link href="/browse" className="text-[var(--terracotta)] hover:underline flex items-center justify-between">
                    <span>Complete Publication Index</span>
                    <ArrowRight size={14} />
                  </Link>
                </li>
              </ul>
            </ParchmentCard>

            <ParchmentCard className="p-6 text-center bg-[var(--surface-alt)]">
              <h3 className="font-display text-xl text-[var(--ink)]">Contribute to the Living Archive</h3>
              <p className="mt-2 font-ui text-xs leading-5 text-[var(--ink-soft)]">
                We welcome scholarly research essays, translations, and philosophical monographs.
              </p>
              <Link href="/submit" className="btn-terracotta mt-4 inline-flex items-center gap-2 text-xs">
                Submit Manuscript <ArrowRight size={13} />
              </Link>
            </ParchmentCard>
          </aside>
        </div>
      </section>
    </div>
  );
}
