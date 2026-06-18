import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useListCategories } from "@workspace/api-client-react";
import { Wordmark } from "../components/Wordmark";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } },
};

export function About() {
  const { data: categories = [] } = useListCategories();

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="visible"
        className="space-y-10"
      >
        {/* Wordmark */}
        <motion.div variants={stagger.item} className="text-center py-8">
          <Wordmark size="lg" />
        </motion.div>

        {/* Mission */}
        <motion.section variants={stagger.item}>
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
          >
            Mission
          </h2>
          <div className="space-y-4 text-base leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "var(--ink)" }}>
            <p>
              Ānvīkṣikī — आन्वीक्षिकी — takes its name from the ancient Sanskrit term for the science of reasoning and inquiry: the tradition of disciplined thought that stood as one of the fourteen vidyāsthānas in classical Indian learning.
            </p>
            <p>
              This journal exists because Indian intellectual life deserves a space equal to its depth: not a space for the merely topical, but for the enduringly important. We publish essays, papers, and long-form writing that take seriously the life of the mind — in philosophy, history, psychology, sociology, geopolitics, science, and the archive.
            </p>
            <p>
              We believe that the civilisational tradition of India — in all its plurality, contradiction, and unfinished conversation — is one of the great resources of human thought. We also believe that engaging it seriously means engaging it critically, comparatively, and without nostalgia.
            </p>
          </div>
        </motion.section>

        {/* Divider */}
        <motion.div variants={stagger.item} style={{ height: 1, background: "var(--line)" }} />

        {/* Editorial philosophy */}
        <motion.section variants={stagger.item}>
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
          >
            Editorial Philosophy
          </h2>
          <div className="space-y-4 text-base leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "var(--ink)" }}>
            <p>
              We ask of every piece we publish: does it advance knowledge, or does it merely repeat opinion? Does it take its sources seriously? Does it argue, or does it assert? Does it treat the reader as an adult?
            </p>
            <p>
              We welcome work from academics, independent scholars, journalists, and practitioners — from any perspective, provided it meets our standard of intellectual honesty. We do not have a party line. We do have standards.
            </p>
          </div>
        </motion.section>

        {/* Divider */}
        <motion.div variants={stagger.item} style={{ height: 1, background: "var(--line)" }} />

        {/* Domains */}
        <motion.section variants={stagger.item}>
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
          >
            Domains of Inquiry
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/category/${cat.slug}`}>
                <div
                  className="p-3 rounded-lg cursor-pointer transition-all duration-150 hover:scale-[1.02]"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderLeft: `3px solid ${cat.colorAccent ?? "var(--gold)"}`,
                  }}
                >
                  <div
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: cat.colorAccent ?? "var(--gold)", fontFamily: "var(--font-ui)" }}
                  >
                    {cat.name}
                  </div>
                  {cat.description && (
                    <p
                      className="text-xs line-clamp-2"
                      style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}
                    >
                      {cat.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Divider */}
        <motion.div variants={stagger.item} style={{ height: 1, background: "var(--line)" }} />

        {/* Contact + submit */}
        <motion.section variants={stagger.item}>
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
          >
            Contact
          </h2>
          <p
            className="text-base leading-relaxed mb-4"
            style={{ fontFamily: "var(--font-body)", color: "var(--ink)" }}
          >
            For editorial inquiries, corrections, or correspondence, write to us at{" "}
            <a
              href="mailto:editorial@anvikshiki.in"
              style={{ color: "var(--gold)", textDecoration: "underline" }}
            >
              editorial@anvikshiki.in
            </a>.
          </p>
          <Link href="/submit">
            <span
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
            >
              Submit your work <ArrowRight size={14} />
            </span>
          </Link>
        </motion.section>
      </motion.div>
    </div>
  );
}
