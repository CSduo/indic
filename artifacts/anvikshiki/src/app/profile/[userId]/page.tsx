"use client";

import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, BookOpen, Building2, Mail, MessageSquare, User } from "lucide-react";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

interface PublicUser {
  id: string;
  name: string;
  bio?: string;
  institution?: string;
  avatarUrl?: string;
}

interface ArticlePreview {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  heroImageUrl?: string;
  categorySlug?: string;
  publishedAt?: string;
}

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [articles, setArticles] = useState<ArticlePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`${base()}/api/users/${userId}/profile`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setProfile(data.user);
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [userId]);

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

  const initials = (profile.name || "A").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="bg-[var(--bg)] min-h-screen pb-20">
      <div className="container-anv py-10 max-w-3xl mx-auto">

        {/* Back */}
        <div className="mb-8">
          <Link href="/" className="btn-ink p-2 inline-flex items-center gap-2 text-sm">
            <ArrowLeft size={15} /> Back
          </Link>
        </div>

        {/* Profile card */}
        <ParchmentCard className="p-8 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="shrink-0 h-20 w-20 rounded-full overflow-hidden border-2 border-[var(--border-gold)] bg-[var(--terracotta-pale)] flex items-center justify-center">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl font-bold text-[var(--terracotta)]">{initials}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl text-[var(--ink)] leading-tight">{profile.name}</h1>

              {profile.institution && (
                <p className="mt-1 flex items-center gap-1.5 font-ui text-sm text-[var(--muted)]">
                  <Building2 size={13} /> {profile.institution}
                </p>
              )}

              {profile.bio && (
                <p className="mt-4 font-body text-sm leading-7 text-[var(--ink-soft)] max-w-xl">{profile.bio}</p>
              )}
            </div>
          </div>
        </ParchmentCard>

        <OrnamentDivider className="mb-8" />

        {/* Published articles */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen size={18} className="text-[var(--gold)]" />
            <h2 className="font-display text-2xl text-[var(--ink)]">
              Published Works
              <span className="ml-2 font-ui text-sm text-[var(--muted)] font-normal">({articles.length})</span>
            </h2>
          </div>

          {articles.length === 0 ? (
            <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <User size={32} className="mx-auto mb-3 text-[var(--muted)]" />
              <p className="font-ui text-sm text-[var(--muted)]">No published articles yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map(article => (
                <Link key={article.id} href={`/articles/${article.slug}`} className="block group">
                  <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-gold)] transition-colors">
                    <div className="flex gap-4">
                      {article.heroImageUrl && (
                        <div className="shrink-0 w-20 h-20 rounded-[6px] overflow-hidden">
                          <img src={article.heroImageUrl} alt={article.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-xl leading-tight text-[var(--ink)] group-hover:text-[var(--gold)] transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="mt-1.5 font-body text-sm text-[var(--ink-soft)] line-clamp-2 leading-6">{article.excerpt}</p>
                        )}
                        <div className="mt-2 flex items-center gap-3 font-ui text-xs text-[var(--muted)]">
                          {article.categorySlug && (
                            <span className="badge badge-received capitalize">{article.categorySlug.replace(/-/g, " ")}</span>
                          )}
                          {article.publishedAt && (
                            <span>{new Date(article.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</span>
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
    </div>
  );
}
