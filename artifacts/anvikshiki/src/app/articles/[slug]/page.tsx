import { useEffect, useState, useRef } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Clock, Eye, MessageSquare, Play, Pause, Volume2 } from "lucide-react";
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

const getReadingTime = (bodyHtml: string) => {
  if (!bodyHtml) return "1 min read";
  const text = bodyHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  if (wordCount < 100) {
    const seconds = Math.max(5, Math.round((wordCount / 200) * 60));
    return `${seconds} sec read`;
  }
  const minutes = Math.max(1, Math.round(wordCount / 200));
  return `${minutes} min read`;
};

export default function ArticlePage() {
  const [, articlesParams] = useRoute("/articles/:slug");
  const [, essaysParams] = useRoute("/essays/:slug");
  const slug = articlesParams?.slug || essaysParams?.slug || "";
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Voice note player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = Number(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Comments state
  const { user } = useAuthContext();
  const [comments, setComments] = useState<any[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

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

    setSubmittingComment(true);
    try {
      const response = await fetch(`${base()}/api/articles/${article.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: user ? (user.name || "Anonymous Scholar") : "Anonymous Scholar",
          authorEmail: user ? (user.email || undefined) : undefined,
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

  const handleReplySubmit = async (parentId: string) => {
    if (!replyContent.trim()) return;
    setSubmittingReply(true);
    try {
      const response = await fetch(`${base()}/api/articles/${article.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: user ? (user.name || "Anonymous Scholar") : "Anonymous Scholar",
          authorEmail: user ? (user.email || undefined) : undefined,
          content: replyContent.trim(),
          parentId,
        }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed");
      if (data.autoApproved) {
        setComments(prev => prev.map(c =>
          c.id === parentId ? { ...c, replies: [...(c.replies || []), data.comment] } : c
        ));
        toast.success("Reply posted!");
      } else {
        toast.success("Reply submitted — pending approval.");
      }
      setReplyContent("");
      setReplyingTo(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCommentEdit = async (commentId: string, parentId?: string) => {
    try {
      const res = await fetch(`${base()}/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingCommentContent }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to edit comment");

      setComments(prev => prev.map(c => {
        if (!parentId) {
          if (c.id === commentId) return { ...c, content: editingCommentContent };
          return c;
        } else {
          if (c.id === parentId) {
            return {
              ...c,
              replies: (c.replies || []).map((r: any) => r.id === commentId ? { ...r, content: editingCommentContent } : r)
            };
          }
          return c;
        }
      }));
      setEditingCommentId(null);
      toast.success("Comment updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update comment");
    }
  };

  const handleCommentDelete = async (commentId: string, parentId?: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`${base()}/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete comment");

      setComments(prev => {
        if (!parentId) {
          return prev.filter(c => c.id !== commentId);
        } else {
          return prev.map(c => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: (c.replies || []).filter((r: any) => r.id !== commentId)
              };
            }
            return c;
          });
        }
      });
      toast.success("Comment deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete comment");
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

  return (
    <div className="bg-[var(--bg)]">
      <ReadingProgress />

      <section className="container-anv py-8 md:py-16 text-center max-w-4xl mx-auto">
        <nav className="mb-6 flex items-center justify-center gap-2 font-ui text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]" aria-label="Breadcrumb">
          <Link href="/browse" className="inline-flex items-center gap-1 hover:text-[var(--terracotta)]"><ArrowLeft size={13} /> Journal</Link>
          <span>/</span>
          <span className="text-[var(--terracotta)]">Essay</span>
        </nav>

        <div className="space-y-6">
          <div className="flex justify-center">
            <GlyphTag domain={domain} />
          </div>
          <h1 className="font-display text-[clamp(2.4rem,6vw,4.8rem)] leading-[1.05] text-[var(--ink)] max-w-3xl mx-auto">{article.title}</h1>
          {article.excerpt ? <p className="max-w-2xl font-display text-xl leading-relaxed text-[var(--terracotta)] mx-auto">{article.excerpt}</p> : null}
          <OrnamentDivider variant="minimal" className="my-5 justify-center mx-auto" />
          <div className="flex flex-wrap items-center justify-center gap-4 font-ui text-xs uppercase tracking-[0.08em] text-[var(--ink-faint)]">
            {article.authorName ? <span>By {article.authorName}</span> : null}
            {article.publishedAt ? <span>{new Date(article.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</span> : null}
            <span className="inline-flex items-center gap-1"><Clock size={13} /> {getReadingTime(article.body)}</span>
            {article.viewCount ? <span className="inline-flex items-center gap-1"><Eye size={13} /> {article.viewCount} reads</span> : null}
          </div>
        </div>

        {/* Cover image in center (only if uploaded) */}
        {(article.featuredImage || article.coverImage) && (
          <div className="max-w-3xl mx-auto mt-10">
            <ParchmentCard className="overflow-hidden p-2" corners={false}>
              <img src={article.featuredImage || article.coverImage} alt={article.title} className="max-h-[500px] w-full rounded-[6px] object-cover" />
            </ParchmentCard>
          </div>
        )}

        {/* Action bar below cover image */}
        <div className="flex justify-center mt-6">
          <ArticleActionBar articleId={article.id} title={article.title} downloadUrl={article.pdfUrl || article.fileUrl} />
        </div>
      </section>

      <section className="px-4 pb-16 max-w-3xl mx-auto">
        <article className="w-full">
          <OrnamentDivider className="mb-8" />
          
          {/* Custom Voice Note player in the middle */}
          {article.audioUrl && (
            <div className="card-sacred p-5 mb-8 space-y-3" style={{ background: "linear-gradient(135deg, rgba(201,152,58,0.03) 0%, rgba(201,152,58,0.08) 100%)" }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 shrink-0 animate-pulse"
                  style={{ background: "var(--gold-bright)", color: "var(--bg)" }}
                >
                  {isPlaying ? <Pause size={16} fill="var(--bg)" /> : <Play size={16} fill="var(--bg)" className="ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-xs font-bold text-[var(--gold-soft)] uppercase tracking-wider">Listen to the Author</p>
                  <p className="font-body text-xs text-[var(--ink-faint)] truncate">Reading: {article.title}</p>
                </div>
                <Volume2 size={16} className="text-[var(--ink-faint)] shrink-0" />
              </div>

              <div className="flex items-center gap-3">
                <span className="font-ui text-[10px] text-[var(--ink-faint)]">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--gold)]"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
                <span className="font-ui text-[10px] text-[var(--ink-faint)]">{formatTime(duration)}</span>
              </div>
              
              <audio
                ref={audioRef}
                src={article.audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}

          {article.body ? (
            <div
              className="prose-anv prose-editor-content"
              dangerouslySetInnerHTML={{ __html: article.body }}
            />
          ) : (
            <ParchmentCard className="p-8 text-center">
              <h2 className="font-display text-3xl text-[var(--ink)]">Full text coming soon.</h2>
              <p className="mt-3 font-body text-[var(--ink-soft)]">The editorial team has not yet released the complete article body.</p>
            </ParchmentCard>
          )}

          {/* Author profile card at the end of the text */}
          <div className="card-sacred p-6 mt-12 flex flex-col md:flex-row items-center gap-5" style={{ borderLeft: "3px solid var(--gold)" }}>
            <div className="h-14 w-14 rounded-full overflow-hidden bg-[var(--terracotta-pale)] flex items-center justify-center border border-[var(--border-gold)] shrink-0">
              <span className="font-display text-lg font-bold text-[var(--terracotta)]">
                {(article.authorName || "A").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-center md:text-left space-y-1">
              <h4 className="font-ui text-sm font-bold text-[var(--gold-bright)]">{article.authorName}</h4>
              <p className="font-ui text-[10px] text-[var(--ink-faint)]">Contributor · Anvikshiki Journal</p>
              <p className="font-body text-xs text-[var(--ink-soft)] leading-relaxed mt-2">
                This contribution is part of Anvikshiki's ongoing dedication to independent civilizational dialogue, multidisciplinary analysis, and rigorous philosophical inquiry.
              </p>
            </div>
          </div>

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

              {/* Comments list — threaded */}
              <div className="space-y-5">
                {comments.length === 0 ? (
                  <p className="font-body text-sm text-[var(--ink-faint)] italic">
                    No contributions to this discussion yet. Be the first to share an inquiry.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id}>
                      {/* Top-level comment */}
                      <div className="p-4 rounded-lg border border-[var(--border)]" style={{ background: "var(--surface)" }}>
                        <div className="flex items-start gap-3">
                          {/* Avatar circle */}
                          <div className="shrink-0 h-9 w-9 rounded-full overflow-hidden bg-[var(--terracotta-pale)] flex items-center justify-center border border-[var(--border-gold)]">
                            {comment.userAvatarUrl ? (
                              <img src={comment.userAvatarUrl} alt={comment.authorName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="font-display text-sm font-bold text-[var(--terracotta)]">
                                {(comment.authorName || "A").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center flex-wrap gap-1 mb-1">
                              {/* Clickable author name if userId exists */}
                              {comment.userId ? (
                                <a href={`/profile/${comment.userId}`} className="font-ui text-sm font-semibold text-[var(--gold-bright)] hover:underline">
                                  {comment.authorName}
                                </a>
                              ) : (
                                <span className="font-ui text-sm font-semibold text-[var(--gold-bright)]">{comment.authorName}</span>
                              )}
                              <span className="font-ui text-[10px] text-[var(--muted)]">
                                {new Date(comment.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>

                            {editingCommentId === comment.id ? (
                              <div className="mt-2 space-y-2">
                                <textarea
                                  className="input-sacred w-full min-h-[85px] text-sm resize-y"
                                  value={editingCommentContent}
                                  onChange={e => setEditingCommentContent(e.target.value)}
                                  maxLength={3000}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCommentId(null)}
                                    className="btn-ink px-2.5 py-1 text-[10px]"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCommentEdit(comment.id)}
                                    disabled={!editingCommentContent.trim()}
                                    className="btn-terracotta px-2.5 py-1 text-[10px]"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="font-body text-sm text-[var(--ink-soft)] leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                            )}

                            <div className="mt-2 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                className="flex items-center gap-1 font-ui text-[10px] text-[var(--muted)] hover:text-[var(--terracotta)] transition-colors"
                              >
                                <MessageSquare size={11} /> {replyingTo === comment.id ? "Cancel" : `Reply${comment.replies?.length ? ` (${comment.replies.length})` : ""}`}
                              </button>

                              {/* Edit/Delete actions for Owner or Admin */}
                              {user && (user.id === comment.userId || user.role === "ADMIN") && (
                                <>
                                  <span className="text-[var(--border)] text-[10px]">•</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentContent(comment.content);
                                    }}
                                    className="font-ui text-[10px] text-[var(--muted)] hover:text-[var(--gold)] transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <span className="text-[var(--border)] text-[10px]">•</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCommentDelete(comment.id)}
                                    className="font-ui text-[10px] text-[var(--muted)] hover:text-red-400 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline reply form */}
                        {replyingTo === comment.id && (
                          <div className="mt-3 ml-12 border-l-2 border-[var(--border-gold)] pl-4">
                            <textarea
                              className="input-sacred w-full min-h-[80px] resize-y text-sm"
                              placeholder={`Reply to ${comment.authorName}…`}
                              value={replyContent}
                              onChange={e => setReplyContent(e.target.value)}
                              maxLength={2000}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button type="button" onClick={() => { setReplyingTo(null); setReplyContent(""); }} className="btn-ink px-3 py-1 text-xs">Cancel</button>
                              <button type="button" onClick={() => handleReplySubmit(comment.id)} disabled={submittingReply || !replyContent.trim()} className="btn-terracotta text-xs px-3 py-1">
                                {submittingReply ? "Posting…" : "Post Reply"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Nested replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 ml-12 space-y-3 border-l-2 border-[var(--border)] pl-4">
                            {comment.replies.map((reply: any) => (
                              <div key={reply.id} className="flex items-start gap-3">
                                <div className="shrink-0 h-7 w-7 rounded-full overflow-hidden bg-[var(--terracotta-pale)] flex items-center justify-center border border-[var(--border)]">
                                  {reply.userAvatarUrl ? (
                                    <img src={reply.userAvatarUrl} alt={reply.authorName} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="font-display text-xs font-bold text-[var(--terracotta)]">
                                      {(reply.authorName || "A").charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center flex-wrap gap-1 mb-0.5">
                                    {reply.userId ? (
                                      <a href={`/profile/${reply.userId}`} className="font-ui text-xs font-semibold text-[var(--gold-bright)] hover:underline">
                                        {reply.authorName}
                                      </a>
                                    ) : (
                                      <span className="font-ui text-xs font-semibold text-[var(--gold-bright)]">{reply.authorName}</span>
                                    )}
                                    <span className="font-ui text-[9px] text-[var(--muted)]">
                                      {new Date(reply.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                  </div>

                                  {editingCommentId === reply.id ? (
                                    <div className="mt-1 space-y-2">
                                      <textarea
                                        className="input-sacred w-full min-h-[70px] text-xs resize-y"
                                        value={editingCommentContent}
                                        onChange={e => setEditingCommentContent(e.target.value)}
                                        maxLength={2000}
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setEditingCommentId(null)}
                                          className="btn-ink px-2 py-0.5 text-[9px]"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleCommentEdit(reply.id, comment.id)}
                                          disabled={!editingCommentContent.trim()}
                                          className="btn-terracotta px-2 py-0.5 text-[9px]"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="font-body text-sm text-[var(--ink-soft)] leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                                  )}

                                  {user && (user.id === reply.userId || user.role === "ADMIN") && (
                                    <div className="mt-1 flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCommentId(reply.id);
                                          setEditingCommentContent(reply.content);
                                        }}
                                        className="font-ui text-[9px] text-[var(--muted)] hover:text-[var(--gold)] transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <span className="text-[var(--border)] text-[9px]">•</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCommentDelete(reply.id, comment.id)}
                                        className="font-ui text-[9px] text-[var(--muted)] hover:text-red-400 transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <OrnamentDivider className="my-10" />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-8">
              <Link href="/browse" className="btn-ink"><ArrowLeft size={14} /> More Essays</Link>
              <Link href={`/domains/${domain}`} className="btn-terracotta">More in this Domain</Link>
            </div>

            <div className="mt-10">
              <ParchmentCard className="p-4 text-center">
                <p className="type-section-label mb-2">Citation Note</p>
                <p className="font-body text-xs leading-normal text-[var(--ink-soft)] max-w-lg mx-auto">
                  Cite this essay with the copied citation action. Include the access date for web references.
                </p>
              </ParchmentCard>
            </div>
          </article>
      </section>

      <div className="fixed inset-x-4 bottom-4 z-40 rounded-full border border-[var(--border-gold)] bg-[var(--surface)]/95 px-4 py-3 shadow-[var(--shadow-lg)] backdrop-blur md:hidden">
        <ArticleActionBar title={article.title} downloadUrl={article.pdfUrl || article.fileUrl} />
      </div>
    </div>
  );
}
