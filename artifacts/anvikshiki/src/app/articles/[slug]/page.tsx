import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Clock } from "lucide-react";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ArticlePage() {
  const [, params] = useRoute("/articles/:slug");
  const slug = params?.slug || "";
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${base()}/api/articles/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setArticle(d.article || d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div style={{ background: "var(--bg)", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} role="status" aria-label="Loading" />
    </div>
  );
  if (error || !article) return (
    <div style={{ background: "var(--bg)", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <EmptyState title="Article not found" description="This essay may have been removed or is not yet published." action={<Link href="/browse" className="btn-sacred btn-gold">Browse Essays</Link>} />
    </div>
  );

  return (
    <div style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg, var(--bg-deep) 0%, var(--bg) 100%)", borderBottom: "1px solid var(--border)" }}>
        <div className="container-anv py-12 max-w-3xl mx-auto">
          <Link href="/browse" className="flex items-center gap-1.5 mb-8 font-ui text-xs hover:opacity-70" style={{ color: "var(--ink-faint)" }}>
            <ArrowLeft size={12} /> Back to Browse
          </Link>
          {article.categorySlug && (
            <div className="section-label mb-3">{article.categorySlug}</div>
          )}
          <h1 className="font-display mb-4 leading-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", color: "var(--gold-bright)" }}>
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="font-body text-lg mb-6 leading-relaxed" style={{ color: "var(--ink-faint)" }}>{article.excerpt}</p>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            {article.authorName && <span className="font-ui text-sm" style={{ color: "var(--muted)" }}>By {article.authorName}</span>}
            {article.readingTime && (
              <span className="font-ui text-xs flex items-center gap-1" style={{ color: "var(--ink-faint)" }}>
                <Clock size={11} /> {article.readingTime} min read
              </span>
            )}
            {article.publishedAt && (
              <span className="font-ui text-xs" style={{ color: "var(--ink-faint)" }}>
                {new Date(article.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container-anv py-10 max-w-3xl mx-auto">
        {article.featuredImage && (
          <div className="mb-8 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-gold)" }}>
            <img src={article.featuredImage} alt={article.title} className="w-full object-cover" style={{ maxHeight: 360 }} />
          </div>
        )}
        <LotusDivider className="mb-8" />
        {article.body ? (
          <div className="font-body text-base leading-loose whitespace-pre-wrap prose-sacred" style={{ color: "var(--ink-soft)" }}>
            {article.body}
          </div>
        ) : (
          <div className="text-center py-12">
            <LotusIcon size={36} style={{ color: "var(--gold)", opacity: 0.3, margin: "0 auto 1rem" }} />
            <p className="font-body text-base" style={{ color: "var(--muted)" }}>Full text coming soon.</p>
          </div>
        )}
        <LotusDivider className="mt-12 mb-8" />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/browse" className="btn-sacred btn-ghost text-xs inline-flex items-center gap-1.5">
            <ArrowLeft size={13} /> More Essays
          </Link>
          {article.categorySlug && (
            <Link href={`/domains/${article.categorySlug}`} className="btn-sacred btn-ghost text-xs">
              More in {article.categorySlug} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
