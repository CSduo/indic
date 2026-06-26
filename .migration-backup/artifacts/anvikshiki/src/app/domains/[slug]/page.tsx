import { useState, useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const DOMAIN_META: Record<string, { label: string; icon: string; color: string; accent: string; desc: string }> = {
  "philosophy":             { label: "Philosophy",             icon: "🕉️",  color: "#1a0f3a", accent: "#7c5cbf", desc: "Logic, metaphysics, consciousness, and the examined life." },
  "history":                { label: "History",                icon: "📜",  color: "#1a0d0e", accent: "#8b4513", desc: "Civilizations, events, patterns, and the arc of human story." },
  "psychology":             { label: "Psychology",             icon: "🌙",  color: "#0f1a2e", accent: "#4682b4", desc: "Mind, behavior, consciousness, and the inner life." },
  "sociology":              { label: "Sociology",              icon: "🪔",  color: "#0d1f15", accent: "#2d6b50", desc: "Society, culture, community, and collective identity." },
  "science":                { label: "Science",                icon: "✨",  color: "#1a1a0f", accent: "#8b7355", desc: "Cosmos, nature, discovery, and empirical inquiry." },
  "geopolitics":            { label: "Geopolitics",            icon: "🌏",  color: "#1f0d0d", accent: "#8b1a1a", desc: "Power, territory, nations, and civilizational orders." },
  "civilizational-thought": { label: "Civilizational Thought", icon: "🏛️",  color: "#1a0f1a", accent: "#8b1a74", desc: "Long-arc thinking about culture, tradition, and civilizational destiny." },
  "aesthetics":             { label: "Aesthetics",             icon: "🪷",  color: "#1a1018", accent: "#9a4080", desc: "Art, beauty, literature, music, and creative expression." },
  "sanskrit-studies":       { label: "Sanskrit Studies",       icon: "ॐ",  color: "#1a1208", accent: "#b8860b", desc: "Sacred texts, grammar, language, and classical learning." },
  "political-theory":       { label: "Political Theory",       icon: "⚖️",  color: "#0a1a1a", accent: "#2e8b57", desc: "Governance, justice, sovereignty, and statecraft." },
  "papers":                 { label: "Research Papers",        icon: "📖",  color: "#120a16", accent: "#6a0dad", desc: "Peer-reviewed academic research across all disciplines." },
  "translations":           { label: "Translations",           icon: "🖋️",  color: "#0f0f0f", accent: "#696969", desc: "Classical texts brought into living language." },
  "archive":                { label: "Archive",                icon: "🗄️",  color: "#0a0a0a", accent: "#555555", desc: "All published works in the complete archive." },
};

export default function DomainPage() {
  const [, params] = useRoute("/domains/:slug");
  const [, params2] = useRoute("/categories/:slug");
  const slug = (params?.slug || params2?.slug || "").toLowerCase();

  const meta = DOMAIN_META[slug];
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    const b = base();
    // Try fetching articles by category/domain slug
    fetch(`${b}/api/articles?category=${encodeURIComponent(slug)}&limit=20`)
      .then(r => r.json())
      .then(d => { setArticles(d.articles || []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [slug]);

  if (!meta && !loading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "60vh" }} className="flex flex-col items-center justify-center">
        <EmptyState
          title="Domain not found"
          description={`"${slug}" is not a known domain. Return to browse all available domains.`}
          action={<Link href="/browse" className="btn-sacred btn-gold">Back to Browse</Link>}
        />
      </div>
    );
  }

  const m = meta || { label: slug, icon: "📄", color: "#0a0a0a", accent: "#c9983a", desc: "" };

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 300 }}>
        <div className="absolute inset-0" aria-hidden="true">
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${m.color} 0%, #07040a 100%)` }} />
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 20% 50%, ${m.accent}30 0%, transparent 55%)` }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg, transparent, var(--bg))" }} />
        </div>
        <div className="container-anv relative z-10 py-14 flex flex-col items-center text-center">
          <Link href="/browse" className="flex items-center gap-1.5 mb-6 font-ui text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--ink-faint)" }}>
            <ArrowLeft size={12} /> Browse
          </Link>
          <div style={{ fontSize: "3rem", marginBottom: "1rem", filter: `drop-shadow(0 0 16px ${m.accent}80)` }}>{m.icon}</div>
          <div className="section-label mb-2">Domain</div>
          <h1 className="font-display mb-3" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--gold-bright)", letterSpacing: "0.1em" }}>{m.label}</h1>
          {m.desc && <p className="font-body text-sm max-w-md" style={{ color: "var(--ink-faint)" }}>{m.desc}</p>}
          <LotusIcon size={16} className="mt-4 animate-float" style={{ color: "var(--gold)", opacity: 0.5 }} />
        </div>
      </div>

      {/* Content */}
      <div className="container-anv py-10">
        <LotusDivider className="mb-8" />

        {loading ? (
          <div className="flex justify-center py-16">
            <div style={{ width: 40, height: 40, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
          </div>
        ) : error ? (
          <EmptyState
            title="Could not load content"
            description="There was an error loading articles for this domain. Please try again."
            action={<button className="btn-sacred btn-ghost" onClick={() => window.location.reload()} type="button">Retry</button>}
          />
        ) : articles.length === 0 ? (
          <EmptyState
            title={`No published work in ${m.label} yet`}
            description="This domain is being prepared. The first works will appear here once published by our editorial team."
            action={
              <div className="flex gap-3 flex-wrap justify-center">
                <Link href="/submit" className="btn-sacred btn-gold">Submit Your Work <ArrowRight size={14} /></Link>
                <Link href="/browse" className="btn-sacred btn-ghost">Browse Domains</Link>
              </div>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map(a => (
              <Link key={a.id} href={`/articles/${a.slug}`}>
                <article className="card-sacred p-5 h-full flex flex-col cursor-pointer">
                  <div className="flex-1">
                    <h3 className="font-display text-xl mb-2 leading-tight" style={{ color: "var(--parchment)" }}>{a.title}</h3>
                    {a.excerpt && <p className="font-body text-sm leading-relaxed line-clamp-3" style={{ color: "var(--ink-faint)" }}>{a.excerpt}</p>}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="font-ui text-xs" style={{ color: "var(--muted)" }}>{a.authorName || "Editorial"}</span>
                    <ArrowRight size={14} style={{ color: "var(--gold)" }} />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
