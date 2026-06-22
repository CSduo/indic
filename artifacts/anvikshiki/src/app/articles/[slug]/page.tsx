import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, Clock, Calendar, Share2, Bookmark, Headphones } from "lucide-react";

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.slug) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/articles/${params.slug}`)
      .then(r => { if (!r.ok) navigate("/"); return r.json(); })
      .then(data => { setArticle(data.article); setLoading(false); })
      .catch(() => { navigate("/"); });
  }, [params.slug]);

  if (loading) return <div className="container-anv pt-16 text-center"><p className="font-body italic" style={{ color: "var(--muted)" }}>Loading…</p></div>;
  if (!article) return null;

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>
      <div className="container-anv pt-4">
        <Link href="/" className="inline-flex items-center gap-2 font-ui text-sm transition-colors hover:text-[var(--gold)]" style={{ color: "var(--muted)" }}>
          <ArrowLeft size={16} /> Back
        </Link>
      </div>
      <article className="container-anv pt-6 pb-12">
        <div className="max-w-[var(--max-reader)] mx-auto">
          {article.category && <span className="font-ui text-xs font-semibold tracking-[0.15em] uppercase" style={{ color: "var(--gold)" }}>{article.category.name}</span>}
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl leading-[0.95] mt-3" style={{ color: "var(--ink)" }}>{article.title}</h1>
          {article.subtitle && <p className="font-body text-lg md:text-xl mt-4" style={{ color: "var(--muted)" }}>{article.subtitle}</p>}
          <div className="flex flex-wrap items-center gap-4 mt-6 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
            {article.authorName && <span className="font-ui text-sm" style={{ color: "var(--ink)" }}>{article.authorName}</span>}
            {article.publishedAt && <span className="font-ui text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}><Calendar size={14} />{new Date(article.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>}
            {article.readingMinutes && <span className="font-ui text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}><Clock size={14} /> {article.readingMinutes} min read</span>}
          </div>
          <div className="flex items-center gap-3 py-4">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full font-ui text-xs font-medium" style={{ background: "var(--surface-soft)", color: "var(--ink)", border: "1px solid var(--border)" }}><Bookmark size={14} /> Save</button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full font-ui text-xs font-medium" style={{ background: "var(--surface-soft)", color: "var(--ink)", border: "1px solid var(--border)" }}><Share2 size={14} /> Share</button>
            {article.audioUrl && <button className="flex items-center gap-2 px-4 py-2 rounded-full font-ui text-xs font-medium" style={{ background: "var(--surface-soft)", color: "var(--ink)", border: "1px solid var(--border)" }}><Headphones size={14} /> Listen</button>}
          </div>
          {article.heroImageUrl && <div className="mt-4 rounded-2xl overflow-hidden"><img src={article.heroImageUrl} alt={article.heroImageAlt || article.title} className="w-full h-auto object-cover" /></div>}
          {article.keyTakeaways?.length > 0 && (
            <div className="mt-8 p-6 rounded-2xl" style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}>
              <h3 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--gold)" }}>Key Takeaways</h3>
              <ul className="space-y-2">{article.keyTakeaways.map((tk: string, i: number) => <li key={i} className="font-body text-sm flex items-start gap-2" style={{ color: "var(--ink)" }}><span style={{ color: "var(--gold)" }}>{i + 1}.</span> {tk}</li>)}</ul>
            </div>
          )}
          <div className="article-body mt-8" style={{ color: "var(--ink)" }}>
            {article.body ? <div dangerouslySetInnerHTML={{ __html: article.body.replace(/\n/g, "<br/>") }} /> : <p className="italic" style={{ color: "var(--muted)" }}>Full article content coming soon.</p>}
          </div>
          {article.tags?.length > 0 && (
            <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex flex-wrap gap-2">{article.tags.map((tag: string) => <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="px-3 py-1 rounded-full font-ui text-xs" style={{ background: "var(--surface-soft)", color: "var(--muted)", border: "1px solid var(--border)" }}>{tag}</Link>)}</div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
