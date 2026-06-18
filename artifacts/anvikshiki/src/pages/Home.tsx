import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  useGetFeaturedArticle,
  useGetLatestArticles,
  useGetLatestPapers,
  useListCategories,
  useSubscribeNewsletter,
} from "@workspace/api-client-react";
import { ArticleCard } from "../components/ArticleCard";
import { PaperCard } from "../components/PaperCard";
import { useState } from "react";
import { useForm } from "react-hook-form";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } },
};

export function Home() {
  const { data: featured, isLoading: featuredLoading } = useGetFeaturedArticle();
  const { data: latest = [] } = useGetLatestArticles({ limit: 9 });
  const { data: papers = [] } = useGetLatestPapers({ limit: 3 });
  const { data: categories = [] } = useListCategories();
  const subscribeMutation = useSubscribeNewsletter();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ email: string }>();
  const [subMsg, setSubMsg] = useState<string | null>(null);

  function onSubscribe({ email }: { email: string }) {
    subscribeMutation.mutate(
      { data: { email } },
      {
        onSuccess: () => { setSubMsg("Subscribed. Welcome to the conversation."); reset(); },
        onError: () => setSubMsg("You are already subscribed."),
      },
    );
  }

  return (
    <div>
      {/* Hero Featured Article */}
      <section className="px-4 md:px-8 pt-6 pb-8 max-w-7xl mx-auto">
        {featuredLoading ? (
          <div className="rounded-xl animate-pulse" style={{ background: "var(--surface-2)", height: 420 }} />
        ) : featured ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            <ArticleCard article={featured} variant="featured" />
          </motion.div>
        ) : null}
      </section>

      {/* Category Grid */}
      <section className="px-4 md:px-8 pb-10 max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-4">
          <h2
            className="text-xl md:text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            Browse by Domain
          </h2>
        </div>
        <motion.div
          className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3"
          variants={stagger.container}
          initial="hidden"
          animate="visible"
        >
          {categories.slice(0, 9).map((cat) => (
            <motion.div key={cat.id} variants={stagger.item}>
              <Link href={`/category/${cat.slug}`}>
                <div
                  className="rounded-lg p-3 text-center cursor-pointer transition-all duration-200 hover:scale-[1.03] flex flex-col items-center gap-1.5"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderTop: `3px solid ${cat.colorAccent ?? "var(--gold)"}`,
                  }}
                >
                  <span
                    className="text-xs font-semibold tracking-wider uppercase leading-tight"
                    style={{ fontFamily: "var(--font-ui)", color: cat.colorAccent ?? "var(--gold)" }}
                  >
                    {cat.name}
                  </span>
                  {cat.articleCount !== undefined && (
                    <span className="text-[10px]" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
                      {cat.articleCount} essays
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Latest Essays */}
      <section className="px-4 md:px-8 pb-12 max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            Recent Essays
          </h2>
          <Link href="/search">
            <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}>
              View all <ArrowRight size={14} />
            </span>
          </Link>
        </div>

        {latest.length === 0 ? (
          <p className="text-center py-16" style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}>
            No essays published yet.
          </p>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={stagger.container}
            initial="hidden"
            animate="visible"
          >
            {latest.map((article) => (
              <motion.div key={article.id} variants={stagger.item} className="flex">
                <ArticleCard article={article} variant="default" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div style={{ height: 1, background: "var(--line)" }} />
      </div>

      {/* Recent Papers */}
      {papers.length > 0 && (
        <section className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
              From the Papers Archive
            </h2>
            <Link href="/papers">
              <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}>
                All papers <ArrowRight size={14} />
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {papers.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="px-4 md:px-8 py-12">
        <div
          className="max-w-2xl mx-auto rounded-2xl p-8 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--line-2)" }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            Join the Conversation
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}>
            Receive new essays, papers, and editorial notes — once a month, no more.
          </p>
          {subMsg ? (
            <p className="text-sm font-medium" style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}>{subMsg}</p>
          ) : (
            <form onSubmit={handleSubmit(onSubscribe)} className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                {...register("email", { required: true })}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: "var(--bg)",
                  border: `1px solid ${errors.email ? "var(--rose)" : "var(--line-2)"}`,
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                }}
              />
              <button
                type="submit"
                disabled={subscribeMutation.isPending}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                style={{
                  background: "var(--gold)",
                  color: "var(--bg)",
                  fontFamily: "var(--font-ui)",
                  opacity: subscribeMutation.isPending ? 0.7 : 1,
                }}
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer spacing for mobile */}
      <div className="h-4" />
    </div>
  );
}
