import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { FileText, BookOpen } from "lucide-react";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.slug) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/categories/${params.slug}`)
      .then(r => { if (!r.ok) navigate("/"); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => navigate("/"));
  }, [params.slug]);

  if (loading) return <div className="container-anv pt-16 text-center"><p className="font-body italic" style={{ color: "var(--muted)" }}>Loading…</p></div>;
  if (!data) return null;

  const { category, articles = [], papers = [] } = data;

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>
      <div className="container-anv pt-8 pb-12">
        <span className="font-ui text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: "var(--gold)" }}>Domain</span>
        <h1 className="font-display text-4xl md:text-6xl mt-2" style={{ color: "var(--ink)" }}>{category.name}</h1>
        {category.description && <p className="font-body mt-3 max-w-lg" style={{ color: "var(--muted)" }}>{category.description}</p>}
        {articles.length > 0 && (
          <div className="mt-10">
            <h2 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--gold)" }}>Essays ({articles.length})</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {articles.map((a: any) => (
                <Link key={a.id} href={`/articles/${a.slug}`} className="card-anv p-5 hover:translate-y-[-2px] transition-all block">
                  <BookOpen size={18} style={{ color: "var(--gold)" }} className="mb-2" />
                  <h3 className="font-display text-lg" style={{ color: "var(--ink)" }}>{a.title}</h3>
                  {a.excerpt && <p className="font-body text-sm mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>{a.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
        {papers.length > 0 && (
          <div className="mt-10">
            <h2 className="font-ui text-xs font-semibold tracking-[0.15em] uppercase mb-4" style={{ color: "var(--gold)" }}>Papers ({papers.length})</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {papers.map((p: any) => (
                <Link key={p.id} href={`/papers/${p.slug}`} className="card-anv p-5 hover:translate-y-[-2px] transition-all block">
                  <FileText size={18} style={{ color: "var(--peacock)" }} className="mb-2" />
                  <h3 className="font-display text-lg" style={{ color: "var(--ink)" }}>{p.title}</h3>
                  {p.abstract && <p className="font-body text-sm mt-1 line-clamp-2" style={{ color: "var(--muted)" }}>{p.abstract}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
        {articles.length === 0 && papers.length === 0 && (
          <div className="text-center py-16">
            <p className="font-body italic" style={{ color: "var(--muted)" }}>No published content in {category.name} yet.</p>
            <Link href="/submit" className="btn-primary mt-4 inline-flex">Submit Your Work</Link>
          </div>
        )}
      </div>
    </div>
  );
}
