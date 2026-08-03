import { Link } from "wouter";
import { ArrowRight, MessageCircle } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { HeroPanel } from "@/components/manuscript/HeroPanel";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";

type Discussion = {
  id: string;
  title: string;
  excerpt: string;
  articleId: string;
  commentCount: number;
  domain: string;
  status: "open" | "closed";
};

export default function DiscussionsPage() {
  // Empty as per NO dummy content rule
  const mostDiscussed: Discussion[] = [];
  const recentConversations: Discussion[] = [];

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <section className="container-anv py-6 md:py-10">
        <HeroPanel
          eyebrow="Open Discussions"
          title="The Dialogue Continues"
          description="Structured threads on the ideas that matter. Every discussion is moderated for depth and civility."
          glyph="sociology"
          ctaPrimary={{ label: "Join the Community", href: "/community" }}
          ctaSecondary={{ label: "Browse Essays", href: "/browse" }}
        />
      </section>

      <section className="container-anv pb-14">
        
        <div className="flex items-center justify-between mb-6">
          <p className="type-section-label">Most Discussed</p>
          <span className="badge badge-draft text-[0.65rem]">Popular</span>
        </div>

        {mostDiscussed.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 mb-10">
            {mostDiscussed.map(t => (
              <Link key={t.id} href={`/article/${t.articleId}`}>
                <ParchmentCard className="p-6 flex flex-col h-full hover:border-[var(--gold)] transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <AnimalGlyph domain={t.domain} size={20} className="text-[var(--gold)]" />
                      <span className="font-ui text-[10px] text-[var(--muted)] uppercase tracking-wider">{t.domain}</span>
                    </div>
                    <div className="flex items-center gap-1.5 badge badge-received">
                      <MessageCircle size={12} />
                      <span className="text-[0.65rem]">{t.commentCount} comments</span>
                    </div>
                  </div>
                  <h2 className="font-display text-2xl text-[var(--ink)] mb-2 group-hover:text-[var(--gold)] transition-colors">{t.title}</h2>
                  <p className="font-body text-sm leading-6 text-[var(--ink-soft)] flex-1">{t.excerpt}</p>
                </ParchmentCard>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active discussions"
            description="There are currently no active discussions on the platform."
            action={<Link href="/browse" className="btn-terracotta">Read Essays <ArrowRight size={14} /></Link>}
          />
        )}

        <OrnamentDivider className="my-10" />

        <div className="flex items-center justify-between mb-6">
          <p className="type-section-label">Recent Conversations</p>
        </div>

        {recentConversations.length > 0 ? (
          <div className="space-y-4 mb-10">
            {recentConversations.map(t => (
              <Link key={t.id} href={`/article/${t.articleId}`}>
                <ParchmentCard className="p-5 flex gap-4 items-start hover:border-[var(--gold)] transition-colors cursor-pointer group">
                  <div className="h-10 w-10 rounded-[8px] border border-[var(--border-gold)] bg-[var(--surface)] grid place-items-center text-[var(--gold)] shrink-0">
                    <MessageCircle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-xl text-[var(--ink)] leading-tight group-hover:text-[var(--gold)] transition-colors">{t.title}</h2>
                    <p className="mt-1 font-body text-sm leading-5 text-[var(--ink-soft)] line-clamp-2">{t.excerpt}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <AnimalGlyph domain={t.domain} size={14} className="text-[var(--muted)]" />
                      <span className="font-ui text-[10px] text-[var(--muted)]">{t.commentCount} comments</span>
                      <span className="badge badge-received text-[0.6rem]">{t.status}</span>
                    </div>
                  </div>
                </ParchmentCard>
              </Link>
            ))}
          </div>
        ) : (
           <EmptyState
            title="No recent conversations"
            description="Be the first to start a discussion by commenting on an article."
            action={<Link href="/browse" className="btn-terracotta">Read Essays <ArrowRight size={14} /></Link>}
          />
        )}
      </section>
    </div>
  );
}
