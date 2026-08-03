import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ArrowRight, MessageSquare, FileText, User } from "lucide-react";
import { AnimalGlyph } from "@/components/manuscript/AnimalGlyph";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";

type Activity = {
  id: string;
  type: "publication" | "comment";
  user: { name: string; avatar?: string };
  title: string;
  excerpt?: string;
  createdAt: string;
  link: string;
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
}

export default function CommunityFeedPage() {
  const [, navigate] = useLocation();
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<"all" | "publications" | "comments">("all");

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  // No dummy content as per rules - empty state will show
  const activities: Activity[] = [];

  const filteredActivities = activities.filter(a => {
    if (activeTab === "all") return true;
    if (activeTab === "publications") return a.type === "publication";
    if (activeTab === "comments") return a.type === "comment";
    return true;
  });

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <section className="container-anv py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="type-section-label mb-2">Community</p>
            <h1 className="font-display text-4xl text-[var(--ink)]">Welcome, {user.name?.split(" ")[0] || "Scholar"}</h1>
            <p className="mt-2 font-body text-sm leading-6 text-[var(--ink-soft)] max-w-lg">
              Recent activity from across the platform.
            </p>
          </div>
          <AnimalGlyph domain="community" size={54} className="text-[var(--gold)] hidden md:block" />
        </div>

        <OrnamentDivider className="my-8" />

        <div className="flex gap-4 mb-8 border-b border-[var(--border-gold)] pb-2">
          {(["all", "publications", "comments"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 font-ui text-sm capitalize transition-colors ${
                activeTab === tab
                  ? "text-[var(--gold)] border-b-2 border-[var(--gold)]"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {filteredActivities.length > 0 ? (
          <div className="space-y-6">
            {filteredActivities.map(activity => (
              <ParchmentCard key={activity.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full border border-[var(--border-gold)] bg-[var(--surface)] grid place-items-center text-[var(--gold)] overflow-hidden">
                    {activity.user.avatar ? (
                      <img src={activity.user.avatar} alt={activity.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-ui text-sm font-medium text-[var(--ink)]">{activity.user.name}</span>
                      <span className="text-[var(--ink-soft)] text-xs font-ui">
                        {activity.type === "publication" ? "published a new article" : "commented"}
                      </span>
                      <span className="text-[var(--muted)] text-xs font-ui ml-auto">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                    <Link href={activity.link} className="group inline-block mb-2">
                      <h2 className="font-display text-xl text-[var(--ink)] group-hover:text-[var(--gold)] transition-colors">
                        {activity.title}
                      </h2>
                    </Link>
                    {activity.excerpt && (
                      <p className="font-body text-sm leading-6 text-[var(--ink-soft)]">{activity.excerpt}</p>
                    )}
                    <div className="mt-3">
                      <span className="badge badge-received text-[0.65rem] flex items-center gap-1 w-fit">
                        {activity.type === "publication" ? <FileText size={12} /> : <MessageSquare size={12} />}
                        {activity.type === "publication" ? "Publication" : "Comment"}
                      </span>
                    </div>
                  </div>
                </div>
              </ParchmentCard>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No activity yet"
            description="There are currently no items in this feed. Subscribe to the community newsletter to be notified of new activity."
            action={<Link href="/community" className="btn-terracotta">Join the Newsletter <ArrowRight size={14} /></Link>}
          />
        )}
      </section>
    </div>
  );
}
