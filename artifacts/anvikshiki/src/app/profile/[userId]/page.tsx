import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, BookOpen, Building2, Mail, MessageSquare, User, UserCheck, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";
import { messagesApi } from "@/lib/messagesApi";
import { PeopleListPanel } from "@/components/community/PeopleListPanel";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

interface PublicUser {
  id: string;
  name: string;
  bio?: string;
  institution?: string;
  avatarUrl?: string;
  website?: string;
  orcid?: string;
}

interface WorkPreview {
  id: string;
  kind: "article" | "paper";
  slug: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  categorySlug?: string;
  publishedAt?: string;
  isPaper?: boolean;
}

type Social = { followers: number; following: number; youFollow: boolean; followsYou: boolean };

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [, navigateTo] = useLocation();
  const { user: viewer } = useAuthContext();
  const [social, setSocial] = useState<Social | null>(null);
  const [socialBusy, setSocialBusy] = useState(false);
  const [peopleList, setPeopleList] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${base()}/api/users/${userId}/social`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setSocial(d))
      .catch(() => setSocial(null));
  }, [userId, viewer?.id]);

  const toggleFollow = async () => {
    if (!viewer) { navigateTo("/login"); return; }
    if (!social) return;
    const next = !social.youFollow;
    setSocialBusy(true);
    // Optimistic, so the button answers the tap immediately.
    setSocial({ ...social, youFollow: next, followers: social.followers + (next ? 1 : -1) });
    try {
      const res = await fetch(`${base()}/api/users/${userId}/follow`, {
        method: next ? "POST" : "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
    } catch (err: any) {
      setSocial({ ...social, youFollow: !next, followers: social.followers + (next ? -1 : 1) });
      toast.error(err.message || "Could not update that");
    } finally {
      setSocialBusy(false);
    }
  };

  const startConversation = async () => {
    if (!viewer) { navigateTo("/login"); return; }
    setSocialBusy(true);
    try {
      const { conversation, pendingRequest } = await messagesApi.start([userId], "DIRECT");
      if (pendingRequest) toast.success("Send one message — they'll see it as a request.");
      navigateTo(`/messages/${conversation.id}`);
    } catch (err: any) {
      toast.error(err.message || "Could not open that conversation");
    } finally {
      setSocialBusy(false);
    }
  };

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [works, setWorks] = useState<WorkPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const loadProfile = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`${base()}/api/users/${userId}/profile`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setProfile(data.user);
        setWorks([
          ...(data.articles || []).map((article: any) => ({
            id: article.id,
            kind: "article" as const,
            slug: article.slug,
            title: article.title,
            summary: article.excerpt,
            imageUrl: article.heroImageUrl,
            categorySlug: article.categorySlug,
            publishedAt: article.publishedAt,
          })),
          ...(data.papers || []).map((paper: any) => ({
            id: paper.id,
            kind: "paper" as const,
            slug: paper.slug,
            title: paper.title,
            summary: paper.abstract,
            imageUrl: paper.coverImageUrl,
            categorySlug: paper.categorySlug,
            publishedAt: paper.publishedAt,
          })),
        ].sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()));
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [userId]);

  useEffect(() => {
    loadProfile();
    window.addEventListener("anv:content-changed", loadProfile);
    return () => window.removeEventListener("anv:content-changed", loadProfile);
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[var(--bg)]">
        <div className="h-9 w-9 rounded-full border-2 border-[var(--border-gold)] border-t-[var(--gold)]" style={{ animation: "rotateSlow .8s linear infinite" }} role="status" aria-label="Loading" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <EmptyState
        title="Scholar not found"
        description="This profile does not exist or has been removed."
        action={<Link href="/" className="btn-terracotta">Return Home</Link>}
      />
    );
  }

  const initials = (profile.name || "A")
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-[var(--bg)] min-h-screen pb-20">
      <div className="container-anv py-10 max-w-3xl mx-auto">

        {/* Back */}
        <div className="mb-8">
          <Link href="/" className="btn-ink p-2 inline-flex items-center gap-2 text-sm">
            <ArrowLeft size={15} /> Back
          </Link>
        </div>

        {/* Profile card with clean banner */}
        <ParchmentCard className="mb-8 overflow-hidden p-0">
          {/* Cover Banner */}
          <div className="h-28 md:h-36 w-full bg-[var(--surface-2)] border-b border-[var(--border-gold)]/40" />

          <div className="px-6 md:px-8 pb-8 -mt-12 md:-mt-14 relative z-10">
            <div className="flex flex-col sm:flex-row items-start gap-5 md:gap-6">
              {/* Avatar */}
              <button
                type="button"
                onClick={() => profile.avatarUrl && setShowLightbox(true)}
                className={`shrink-0 h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden border-4 border-[var(--surface)] bg-[var(--terracotta-pale)] flex items-center justify-center focus:outline-none shadow-md ${profile.avatarUrl ? "cursor-zoom-in hover:opacity-90 transition-opacity" : "cursor-default"}`}
                title={profile.avatarUrl ? "Click for close-up" : ""}
                disabled={!profile.avatarUrl}
              >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl font-bold text-[var(--terracotta)]">{initials}</span>
              )}
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-2 sm:pt-14">
              <h1 className="font-display text-3xl md:text-4xl text-[var(--ink)] leading-tight font-bold">{profile.name}</h1>

              {profile.institution && (
                <p className="mt-2 flex items-center gap-1.5 font-ui text-sm text-[var(--muted)]">
                  <Building2 size={14} /> {profile.institution}
                </p>
              )}

              <div className="flex items-center gap-4 mt-3">
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-ui text-xs text-[var(--gold)] hover:underline">
                    <BookOpen size={12} /> Website
                  </a>
                )}
                {profile.orcid && (
                  <a href={`https://orcid.org/${profile.orcid}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-ui text-xs text-[#A6CE39] hover:underline">
                    <User size={12} /> ORCID
                  </a>
                )}
              </div>

              {profile.bio && (
                <p className="mt-4 font-body text-[15px] leading-relaxed text-[var(--ink-soft)] max-w-2xl">{profile.bio}</p>
              )}

              {/*
                A grid rather than a wrapping row. Four figures of different
                label lengths flowed into three-then-one on a phone, which left
                the last one stranded on its own line and made the group read
                as three stats plus an afterthought.

                Followers and following are buttons: a count nobody can open is
                a number without a purpose, and the lists behind them already
                existed with nothing linking to them.
              */}
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-4">
                <div>
                  <div className="font-display text-2xl text-[var(--gold)]">{works.length}</div>
                  <div className="mono-label mt-1">Published Works</div>
                </div>
                <div>
                  <div className="font-display text-2xl text-[var(--gold)]">{new Set(works.map(w => w.categorySlug).filter(Boolean)).size}</div>
                  <div className="mono-label mt-1">Domains</div>
                </div>
                <button
                  type="button"
                  onClick={() => social?.followers ? setPeopleList("followers") : undefined}
                  disabled={!social?.followers}
                  className="text-left transition-opacity disabled:cursor-default enabled:hover:opacity-70"
                >
                  <div className="font-display text-2xl text-[var(--gold)]">{social?.followers ?? "—"}</div>
                  <div className="mono-label mt-1">Followers</div>
                </button>
                <button
                  type="button"
                  onClick={() => social?.following ? setPeopleList("following") : undefined}
                  disabled={!social?.following}
                  className="text-left transition-opacity disabled:cursor-default enabled:hover:opacity-70"
                >
                  <div className="font-display text-2xl text-[var(--gold)]">{social?.following ?? "—"}</div>
                  <div className="mono-label mt-1">Following</div>
                </button>
              </div>

              {/* Follow and message live on the profile itself — finding
                  someone and being able to reach them should not be two
                  separate journeys. */}
              {viewer && viewer.id !== userId ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFollow}
                    disabled={socialBusy}
                    className={social?.youFollow ? "btn-ink" : "btn-terracotta"}
                  >
                    {social?.youFollow ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
                  </button>
                  <button type="button" onClick={startConversation} disabled={socialBusy} className="btn-ink">
                    <MessageSquare size={14} /> Message
                  </button>
                  {social?.followsYou ? <span className="status-chip">Follows you</span> : null}
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </ParchmentCard>

        <OrnamentDivider className="mb-8" />

        {/* Published work */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen size={18} className="text-[var(--gold)]" />
            <h2 className="font-display text-2xl text-[var(--ink)]">
              Published Works
              <span className="ml-2 font-ui text-sm text-[var(--muted)] font-normal">({works.length})</span>
            </h2>
          </div>

          {works.length === 0 ? (
            <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <User size={32} className="mx-auto mb-3 text-[var(--muted)]" />
              <p className="font-ui text-sm text-[var(--muted)]">No published work yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {works.map(work => (
                <Link key={`${work.kind}-${work.id}`} href={`/${work.kind === "paper" ? "papers" : "articles"}/${work.slug}`} className="block group">
                  <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-gold)] transition-colors">
                    <div className="flex gap-4">
                      {work.imageUrl && (
                        <div className="shrink-0 w-20 h-20 rounded-[6px] overflow-hidden">
                          <img src={work.imageUrl} alt={work.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-xl leading-tight text-[var(--ink)] group-hover:text-[var(--gold)] transition-colors line-clamp-2">
                          {work.title}
                        </h3>
                        {work.summary && (
                          <p className="mt-1.5 font-body text-sm text-[var(--ink-soft)] line-clamp-2 leading-6">{work.summary}</p>
                        )}
                        <div className="mt-2 flex items-center gap-3 font-ui text-xs text-[var(--muted)]">
                          <span className="badge badge-received capitalize">{work.kind}</span>
                          {work.categorySlug && (
                            <span className="badge badge-received capitalize">{work.categorySlug.replace(/-/g, " ")}</span>
                          )}
                          {work.publishedAt && (
                            <span>{new Date(work.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Lightbox Close-up Modal — rendered at page root to prevent flicker */}
      {showLightbox && profile.avatarUrl && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="relative max-w-md w-full border border-[var(--border-gold)] rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--bg-alt, var(--bg))" }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--ink)] transition-colors p-1 rounded-full"
              aria-label="Close preview"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center">
              <div className="h-64 w-64 rounded-full overflow-hidden border-4 border-[var(--border-gold)] shadow-xl mb-4">
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" loading="eager" />
              </div>
              <h3 className="font-display text-2xl text-[var(--ink)] font-semibold text-center">{profile.name}</h3>
              {profile.institution && (
                <p className="font-ui text-sm text-[var(--muted)] mt-1 text-center">{profile.institution}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {peopleList ? (
        <PeopleListPanel userId={userId} kind={peopleList} onClose={() => setPeopleList(null)} />
      ) : null}
    </div>
  );
}
