import { useParams, Link } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useListArticles, useListCategories } from "@workspace/api-client-react";
import { ArticleCard } from "../components/ArticleCard";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};

export function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const { data: categories = [] } = useListCategories();
  const cat = categories.find((c) => c.slug === slug);

  const { data, isLoading } = useListArticles({ category: slug, page, limit: LIMIT });

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <Link href="/">
        <span
          className="inline-flex items-center gap-1 text-xs font-medium mb-6 cursor-pointer"
          style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
        >
          <ArrowLeft size={13} /> Back
        </span>
      </Link>

      {/* Category header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div
          className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
          style={{
            background: cat?.colorAccent ? `${cat.colorAccent}18` : "var(--surface-2)",
            color: cat?.colorAccent ?? "var(--gold)",
            border: `1px solid ${cat?.colorAccent ? `${cat.colorAccent}40` : "var(--line)"}`,
            fontFamily: "var(--font-ui)",
          }}
        >
          Domain
        </div>
        <h1
          className="text-3xl md:text-5xl font-bold mb-3"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          {cat?.name ?? slug}
        </h1>
        {cat?.description && (
          <p
            className="text-base leading-relaxed mb-8 max-w-2xl"
            style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}
          >
            {cat.description}
          </p>
        )}
        <p className="text-xs mb-6" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
          {total} essay{total !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg animate-pulse" style={{ background: "var(--surface-2)", height: 280 }} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
            No essays published in this domain yet.
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={stagger.container}
          initial="hidden"
          animate="visible"
        >
          {articles.map((a) => (
            <motion.div key={a.id} variants={stagger.item} className="flex">
              <ArticleCard article={a} variant="default" />
            </motion.div>
          ))}
        </motion.div>
      )}

      {total > LIMIT && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm transition-all"
            style={{
              background: "var(--surface)",
              color: page === 1 ? "var(--muted-text)" : "var(--ink)",
              border: "1px solid var(--line)",
              opacity: page === 1 ? 0.5 : 1,
              fontFamily: "var(--font-ui)",
            }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-sm" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
            Page {page}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm transition-all"
            style={{
              background: "var(--surface)",
              color: !hasMore ? "var(--muted-text)" : "var(--ink)",
              border: "1px solid var(--line)",
              opacity: !hasMore ? 0.5 : 1,
              fontFamily: "var(--font-ui)",
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
