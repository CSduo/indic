import { useState } from "react";
import { motion } from "framer-motion";
import { useListPapers, useListCategories } from "@workspace/api-client-react";
import { PaperCard } from "../components/PaperCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};

export function Papers() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | undefined>();
  const [peerReviewed, setPeerReviewed] = useState(false);
  const LIMIT = 12;

  const { data, isLoading } = useListPapers({
    page,
    limit: LIMIT,
    ...(category ? { category } : {}),
    ...(peerReviewed ? { peerReviewed: true } : {}),
  });

  const { data: categories = [] } = useListCategories();

  const papers = data?.papers ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1
          className="text-3xl md:text-5xl font-bold mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Papers
        </h1>
        <p
          className="text-base leading-relaxed mb-8 max-w-2xl"
          style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}
        >
          Peer-reviewed research, working papers, and academic monographs in the civilisational tradition.
        </p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => { setCategory(undefined); setPage(1); }}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            background: !category ? "var(--gold)" : "var(--surface)",
            color: !category ? "var(--bg)" : "var(--muted-text)",
            border: "1px solid var(--line-2)",
            fontFamily: "var(--font-ui)",
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => { setCategory(cat.slug); setPage(1); }}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: category === cat.slug ? "var(--gold)" : "var(--surface)",
              color: category === cat.slug ? "var(--bg)" : "var(--muted-text)",
              border: "1px solid var(--line-2)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {cat.name}
          </button>
        ))}
        <button
          onClick={() => { setPeerReviewed(!peerReviewed); setPage(1); }}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all ml-auto"
          style={{
            background: peerReviewed ? "var(--rose)" : "var(--surface)",
            color: peerReviewed ? "var(--bg)" : "var(--muted-text)",
            border: "1px solid var(--line-2)",
            fontFamily: "var(--font-ui)",
          }}
        >
          Peer-reviewed only
        </button>
      </div>

      {/* Results count */}
      <p className="text-xs mb-6" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
        {total} paper{total !== 1 ? "s" : ""}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg animate-pulse" style={{ background: "var(--surface-2)", height: 200 }} />
          ))}
        </div>
      ) : papers.length === 0 ? (
        <div className="text-center py-20">
          <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
            No papers found matching your filters.
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={stagger.container}
          initial="hidden"
          animate="visible"
        >
          {papers.map((p) => (
            <motion.div key={p.id} variants={stagger.item} className="flex">
              <PaperCard paper={p} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
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
            Page {page} of {Math.ceil(total / LIMIT)}
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
