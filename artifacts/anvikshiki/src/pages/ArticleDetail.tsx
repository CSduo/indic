import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Clock, Eye, ArrowLeft, BookOpen, List, Quote } from "lucide-react";
import { useGetArticle, useGetLatestArticles } from "@workspace/api-client-react";
import { ArticleCard } from "../components/ArticleCard";
import { CategoryBadge } from "../components/CategoryBadge";

export function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, error } = useGetArticle(slug!);
  const { data: related = [] } = useGetLatestArticles(
    { limit: 3, category: article?.categorySlug ?? "" },
    { query: { enabled: !!article?.categorySlug } as any },
  );

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-8 rounded mb-4" style={{ background: "var(--surface-2)", width: "60%" }} />
        <div className="h-4 rounded mb-3" style={{ background: "var(--surface-2)" }} />
        <div className="h-4 rounded mb-3" style={{ background: "var(--surface-2)", width: "80%" }} />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}>Article not found.</p>
        <Link href="/" className="text-sm mt-4 inline-block" style={{ color: "var(--gold)" }}>
          Return home
        </Link>
      </div>
    );
  }

  const filteredRelated = related.filter((a) => a.slug !== slug).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Cover image */}
      {article.coverImage && (
        <div className="w-full overflow-hidden" style={{ maxHeight: 480 }}>
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover"
            style={{ maxHeight: 480 }}
          />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        {/* Back */}
        <Link href="/">
          <span
            className="inline-flex items-center gap-1 text-xs font-medium mb-6 cursor-pointer"
            style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
          >
            <ArrowLeft size={13} /> Back to essays
          </span>
        </Link>

        {/* Category + metadata */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <CategoryBadge slug={article.categorySlug} name={article.categoryName} />
          <span className="text-xs" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
            <Clock size={11} className="inline mr-0.5" />
            {article.readingTime} min read
          </span>
          {article.views > 0 && (
            <span className="text-xs" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
              <Eye size={11} className="inline mr-0.5" />
              {article.views.toLocaleString()} views
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          className="text-3xl md:text-5xl font-bold leading-tight mb-3"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)", lineHeight: 1.15 }}
        >
          {article.title}
        </h1>

        {article.subtitle && (
          <p
            className="text-lg md:text-xl leading-relaxed mb-5"
            style={{ fontFamily: "var(--font-body)", color: "var(--muted-text)", fontStyle: "italic" }}
          >
            {article.subtitle}
          </p>
        )}

        {/* Author + date */}
        <div
          className="flex items-center gap-3 pb-6 mb-6"
          style={{ borderBottom: "1px solid var(--line)", fontFamily: "var(--font-ui)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "var(--surface-2)", color: "var(--gold)", border: "1px solid var(--line-2)" }}
          >
            {article.authorName?.[0] ?? "A"}
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{article.authorName || "Staff"}</div>
            {article.publishedAt && (
              <div className="text-xs" style={{ color: "var(--muted-text)" }}>
                {new Date(article.publishedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            )}
          </div>
        </div>

        {/* Key Takeaways */}
        {article.keyTakeaways && article.keyTakeaways.length > 0 && (
          <div
            className="rounded-lg p-5 mb-8"
            style={{ background: "var(--surface)", border: "1px solid var(--line-2)", borderLeft: "4px solid var(--gold)" }}
          >
            <h3
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-3"
              style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
            >
              <List size={14} /> Key Points
            </h3>
            <ul className="space-y-2">
              {article.keyTakeaways.map((point, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed pl-3"
                  style={{
                    color: "var(--ink-2)",
                    fontFamily: "var(--font-body)",
                    borderLeft: "1px solid var(--line)",
                  }}
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Article body */}
        {article.content ? (
          <div
            className="prose prose-quoteless max-w-none"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--ink)",
              fontSize: "1.05rem",
              lineHeight: 1.85,
            }}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : (
          <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>
            Full text coming soon.
          </p>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--muted-text)",
                  border: "1px solid var(--line)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* References */}
        {article.references && article.references.length > 0 && (
          <div
            className="mt-10 p-5 rounded-lg"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <h3
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-4"
              style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
            >
              <BookOpen size={13} /> References
            </h3>
            <ol className="space-y-2">
              {article.references.map((ref, i) => (
                <li
                  key={i}
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}
                >
                  {ref}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Related articles */}
      {filteredRelated.length > 0 && (
        <div
          className="mt-6 py-10"
          style={{ background: "var(--surface)", borderTop: "1px solid var(--line)" }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <h2
              className="text-xl font-bold mb-6"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              Continue Reading
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredRelated.map((a) => (
                <ArticleCard key={a.id} article={a} variant="default" />
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
