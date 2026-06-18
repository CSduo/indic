import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { SearchIcon, Clock, BookCheck } from "lucide-react";
import { useSearch, useListCategories } from "@workspace/api-client-react";

export function Search() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "article" | "paper" | "category">("all");
  const [activeQuery, setActiveQuery] = useState("");

  const { data: categories = [] } = useListCategories();
  const { data: results, isLoading } = useSearch(
    { q: activeQuery, type },
    { query: { enabled: activeQuery.trim().length >= 2 } as any },
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveQuery(q.trim());
  }

  const TABS = [
    { key: "all", label: "All" },
    { key: "article", label: "Essays" },
    { key: "paper", label: "Papers" },
    { key: "category", label: "Domains" },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1
          className="text-3xl md:text-4xl font-bold mb-6"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          Search
        </h1>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted-text)" }}
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search essays, papers, domains..."
              className="w-full pl-9 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
              }}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-lg text-sm font-semibold transition-all"
            style={{ background: "var(--gold)", color: "var(--bg)", fontFamily: "var(--font-ui)" }}
          >
            Search
          </button>
        </form>

        {/* Type tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg" style={{ background: "var(--surface)" }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className="flex-1 py-2 rounded-md text-xs font-semibold transition-all"
              style={{
                background: type === key ? "var(--gold)" : "transparent",
                color: type === key ? "var(--bg)" : "var(--muted-text)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {!activeQuery && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p
              className="text-sm mb-6"
              style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}
            >
              Explore by domain:
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Link key={cat.slug} href={`/category/${cat.slug}`}>
                  <span
                    className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all"
                    style={{
                      background: cat.colorAccent ? `${cat.colorAccent}18` : "var(--surface)",
                      color: cat.colorAccent ?? "var(--gold)",
                      border: `1px solid ${cat.colorAccent ? `${cat.colorAccent}30` : "var(--line)"}`,
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    {cat.name} {cat.articleCount !== undefined ? `(${cat.articleCount})` : ""}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {activeQuery && isLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg animate-pulse" style={{ background: "var(--surface-2)", height: 80 }} />
              ))}
            </div>
          </motion.div>
        )}

        {activeQuery && !isLoading && results && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-xs mb-4" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
              {results.total} result{results.total !== 1 ? "s" : ""} for "{activeQuery}"
            </p>

            {results.total === 0 && (
              <div className="text-center py-16">
                <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
                  No results found. Try a different search term.
                </p>
              </div>
            )}

            {(type === "all" || type === "article") && results.articles.length > 0 && (
              <div className="mb-8">
                {type === "all" && (
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}>
                    Essays
                  </h2>
                )}
                <div className="space-y-2">
                  {results.articles.map((a: any) => (
                    <Link key={a.id} href={`/articles/${a.slug}`}>
                      <div
                        className="rounded-lg p-4 cursor-pointer transition-all group"
                        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                      >
                        <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}>
                          {a.categoryName}
                        </div>
                        <h3
                          className="text-base font-bold leading-snug group-hover:text-[var(--gold)] transition-colors"
                          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
                        >
                          {a.title}
                        </h3>
                        {a.subtitle && (
                          <p className="text-xs mt-1 line-clamp-1" style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}>
                            {a.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
                          {a.authorName && <span>{a.authorName}</span>}
                          <span className="flex items-center gap-0.5"><Clock size={10} />{a.readingTime} min</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(type === "all" || type === "paper") && results.papers.length > 0 && (
              <div className="mb-8">
                {type === "all" && (
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--rose)", fontFamily: "var(--font-ui)" }}>
                    Papers
                  </h2>
                )}
                <div className="space-y-2">
                  {results.papers.map((p: any) => (
                    <Link key={p.id} href={`/papers/${p.slug}`}>
                      <div
                        className="rounded-lg p-4 cursor-pointer transition-all group"
                        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--rose)", fontFamily: "var(--font-ui)" }}>
                            {p.categoryName}
                          </span>
                          {p.peerReviewed && (
                            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--gold)" }}>
                              <BookCheck size={9} /> Peer-reviewed
                            </span>
                          )}
                        </div>
                        <h3
                          className="text-base font-bold leading-snug group-hover:text-[var(--rose)] transition-colors"
                          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
                        >
                          {p.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(type === "all" || type === "category") && results.categories.length > 0 && (
              <div className="mb-8">
                {type === "all" && (
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
                    Domains
                  </h2>
                )}
                <div className="flex flex-wrap gap-2">
                  {results.categories.map((c: any) => (
                    <Link key={c.id} href={`/category/${c.slug}`}>
                      <span
                        className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                        style={{
                          background: c.colorAccent ? `${c.colorAccent}18` : "var(--surface)",
                          color: c.colorAccent ?? "var(--gold)",
                          border: `1px solid ${c.colorAccent ? `${c.colorAccent}30` : "var(--line)"}`,
                          fontFamily: "var(--font-ui)",
                        }}
                      >
                        {c.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
