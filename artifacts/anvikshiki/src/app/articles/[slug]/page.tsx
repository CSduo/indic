import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Clock, Eye, MessageSquare } from "lucide-react";
import { ArticleActionBar } from "@/components/manuscript/ArticleActionBar";
import { GlyphTag } from "@/components/manuscript/GlyphTag";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { ReadingProgress } from "@/components/manuscript/ReadingProgress";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export default function ArticlePage() {
  const [, articlesParams] = useRoute("/articles/:slug");
  const [, essaysParams] = useRoute("/essays/:slug");
  const slug = articlesParams?.slug || essaysParams?.slug || "";
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Comments state
  const { user } = useAuthContext();
  const [comments, setComments] = useState<any[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (user) {
      setAuthorName(user.name || "");
      setAuthorEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    if (!slug) return;
    fetch(`${base()}/api/articles/${slug}`)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        const art = data.article || data;
        setArticle(art);
        setLoading(false);
        // Load comments
        if (art.id) {
          fetch(`${base()}/api/articles/${art.id}/comments`)
            .then(r => r.json())
            .then(d => setComments(d.comments || []))
            .catch(() => {});
        }
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!user && !authorName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setSubmittingComment(true);
    try {
      const response = await fetch(`${base()}/api/articles/${article.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: user ? user.name : authorName.trim(),
          authorEmail: user ? user.email : (authorEmail.trim() || undefined),
          content: content.trim(),
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit comment");

      if (data.autoApproved) {
        setComments(prev => [data.comment, ...prev]);
        toast.success("Comment posted successfully");
      } else {
        toast.success("Comment submitted! It will appear after approval.");
      }
      setContent("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)]">
        <div className="h-10 w-10 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--gold)]" style={{ animation: "rotateSlow .8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)] px-4">
        <EmptyState title="Article not found" description="This essay may have been removed or is not yet published." action={<Link href="/browse" className="btn-terracotta">Browse Essays</Link>} />
      </div>
    );
  }

  const domain = article.categorySlug || article.categoryId || "philosophy";
  const image = article.featuredImage || article.coverImage || asset("/images/heroes/article-default.jpg");

  return (
    <div className="bg-[var(--bg)]">
      <ReadingProgress />

      <section className="container-anv py-6 md:py-10">
        <nav className="mb-4 flex items-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/browse" className="inline-flex items-center gap-1 hover:text-[var(--terracotta)]"><ArrowLeft size={13} /> Journal</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Essay</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)] lg:items-center">
          <div>
            <GlyphTag domain={domain} className="mb-5" />
            <h1 className="font-display text-[clamp(2.4rem,6vw,5.4rem)] leading-[.95] text-[var(--ink)]">{article.title}</h1>
            {article.excerpt ? <p className="mt-5 max-w-2xl font-display text-2xl leading-snug text-[var(--terracotta)]">{article.excerpt}</p> : null}
            <OrnamentDivider variant="minimal" className="my-7 justify-start" />
            <div className="flex flex-wrap items-center gap-4 font-ui text-xs uppercase tracking-[0.08em] text-[var(--ink-faint)]">
              {article.authorName ? <span>By {article.authorName}</span> : null}
              {article.publishedAt ? <span>{new Date(article.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</span> : null}
              <span className="inline-flex items-center gap-1"><Clock size={13} /> {article.readingTime || 8} min read</span>
              {article.viewCount ? <span className="inline-flex items-center gap-1"><Eye size={13} /> {article.viewCount} reads</span> : null}
            </div>
            <ArticleActionBar title={article.title} downloadUrl={article.pdfUrl || article.fileUrl} className="mt-7 hidden md:block" />
          </div>

          <ParchmentCard className="overflow-hidden p-2" corners={false}>
            <img src={image} alt={article.title} className="h-[320px] w-full rounded-[6px] object-cover md:h-[460px]" />
          </ParchmentCard>
        </div>
      </section>

      <section className="container-anv pb-16">
        <div className="grid gap-8 xl:grid-cols-[220px_minmax(0,760px)_220px] xl:items-start xl:justify-center">
          <aside className="hidden xl:block">
            <div className="sticky top-28 space-y-3">
              <ParchmentCard className="p-4">
                <p className="type-section-label mb-3">Actions</p>
                <ArticleActionBar title={article.title} downloadUrl={article.pdfUrl || article.fileUrl} vertical />
              </ParchmentCard>
              <ParchmentCard className="p-4">
                <p className="type-section-label mb-3">On this page</p>
                <ul className="space-y-2 font-ui text-xs text-[var(--ink-faint)]">
                  <li>The Inquiry</li>
                  <li>Text and Context</li>
                  <li>Discussion</li>
                </ul>
              </ParchmentCard>
            </div>
          </aside>

          <article className="mx-auto w-full max-w-[var(--max-reader)]">
            <OrnamentDivider className="mb-8" />
            {article.body ? (
              <div className="prose-anv whitespace-pre-wrap">
                {article.body}
              </div>
            ) : (
              <ParchmentCard className="p-8 text-center">
                <h2 className="font-display text-3xl text-[var(--ink)]">Full text coming soon.</h2>
                <p className="mt-3 font-body text-[var(--ink-soft)]">The editorial team has not yet released the complete article body.</p>
              </ParchmentCard>
            )}

            <OrnamentDivider className="my-10" />

            {/* ─── DISCUSSION SECTION ─── */}
            <div className="mt-12 space-y-8" id="discussion">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-[var(--gold)]" size={20} />
                <h2 className="font-display text-2xl text-[var(--ink)]">Scholarly Discussion</h2>
                <span className="font-ui text-xs px-2 py-0.5 rounded bg-[var(--surface-soft)] text-[var(--muted)]">
                  {comments.length}
                </span>
              </div>

              {/* Comment submission form */}
              <ParchmentCard className="p-5" style={{ background: "var(--surface-2)" }}>
                <form onSubmit={handleCommentSubmit} className="space-y-4">
                  <p className="font-ui text-xs text-[var(--gold)] font-semibold uppercase tracking-wider">
                    Add to the Discussion
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label mb-1" htmlFor="comment-author-name">Name</label>
                      <input
                        id="comment-author-name"
                        className="input-sacred"
                        type="text"
                        placeholder="Your public name"
                        value={user ? user.name || "" : authorName}
                        onChange={e => setAuthorName(e.target.value)}
                        disabled={!!user}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label mb-1" htmlFor="comment-author-email">Email (will not be public)</label>
                      <input
                        id="comment-author-email"
                        className="input-sacred"
                        type="email"
                        placeholder="Your email address"
                        value={user ? user.email || "" : authorEmail}
                        onChange={e => setAuthorEmail(e.target.value)}
                        disabled={!!user}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label mb-1" htmlFor="comment-content">Contribution</label>
                    <textarea
                      id="comment-content"
                      className="input-sacred min-h-[110px] resize-y text-sm"
                      placeholder="Share your thoughts or inquiry on this text..."
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      maxLength={3000}
                      required
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="font-ui text-[10px] text-[var(--muted)]">
                      {!user && "🔒 Contributions undergo review before public display."}
                    </p>
                    <button type="submit" disabled={submittingComment} className="btn-terracotta text-xs py-1.5 px-4">
                      {submittingComment ? "Posting..." : "Post Contribution"}
                    </button>
                  </div>
                </form>
              </ParchmentCard>

              {/* Comments list */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="font-body text-sm text-[var(--ink-faint)] italic">
                    No contributions to this discussion yet. Be the first to share an inquiry.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 rounded-lg border border-[var(--border)]"
                      style={{ background: "var(--surface)" }}
                    >
                      <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                        <span className="font-ui text-sm font-semibold text-[var(--gold-bright)]">
                          {comment.authorName}
                        </span>
                        <span className="font-ui text-[10px] text-[var(--muted)]">
                          {new Date(comment.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="font-body text-sm text-[var(--ink-soft)] leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <OrnamentDivider className="my-10" />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/browse" className="btn-ink"><ArrowLeft size={14} /> More Essays</Link>
              <Link href={`/domains/${domain}`} className="btn-terracotta">More in this Domain</Link>
            </div>
          </article>

          <aside className="hidden xl:block">
            <div className="sticky top-28">
              <ParchmentCard className="p-4">
                <p className="type-section-label mb-3">Citation Note</p>
                <p className="font-body text-sm leading-6 text-[var(--ink-soft)]">
                  Cite this essay with the copied citation action. Include the access date for web references.
                </p>
              </ParchmentCard>
            </div>
          </aside>
        </div>
      </section>

      <div className="fixed inset-x-4 bottom-4 z-40 rounded-full border border-[var(--border-gold)] bg-[var(--surface)]/95 px-4 py-3 shadow-[var(--shadow-lg)] backdrop-blur md:hidden">
        <ArticleActionBar title={article.title} downloadUrl={article.pdfUrl || article.fileUrl} />
      </div>
    </div>
  );
}
