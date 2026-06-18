import { Link } from "wouter";
import { Clock, Eye } from "lucide-react";
import type { Article } from "@workspace/api-client-react";

interface ArticleCardProps {
  article: Article;
  variant?: "default" | "compact" | "featured";
}

export function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
  if (variant === "compact") {
    return (
      <Link href={`/articles/${article.slug}`}>
        <article
          className="flex gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer group"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          {article.coverImage && (
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-20 h-16 object-cover rounded flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-medium tracking-widest uppercase mb-1"
              style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
            >
              {article.categoryName}
            </div>
            <h3
              className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[var(--gold)] transition-colors"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              {article.title}
            </h3>
            <div
              className="flex items-center gap-2 mt-1 text-xs"
              style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
            >
              <Clock size={10} />
              <span>{article.readingTime} min</span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link href={`/articles/${article.slug}`}>
        <article className="relative overflow-hidden rounded-xl cursor-pointer group" style={{ minHeight: 420 }}>
          {article.coverImage ? (
            <img
              src={article.coverImage}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: "var(--bg-2)" }} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, rgba(7,11,15,0.95) 0%, rgba(7,11,15,0.5) 50%, transparent 100%)",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div
              className="text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
            >
              Featured · {article.categoryName}
            </div>
            <h2
              className="text-2xl md:text-4xl font-bold leading-tight text-white mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {article.title}
            </h2>
            {article.subtitle && (
              <p
                className="text-sm md:text-base leading-relaxed mb-3"
                style={{ color: "rgba(244,234,216,0.8)", fontFamily: "var(--font-body)" }}
              >
                {article.subtitle}
              </p>
            )}
            <div
              className="flex items-center gap-4 text-xs"
              style={{ color: "rgba(244,234,216,0.7)", fontFamily: "var(--font-ui)" }}
            >
              {article.authorName && <span>{article.authorName}</span>}
              <span className="flex items-center gap-1"><Clock size={11} />{article.readingTime} min read</span>
              {article.views > 0 && <span className="flex items-center gap-1"><Eye size={11} />{article.views.toLocaleString()}</span>}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/articles/${article.slug}`}>
      <article
        className="rounded-lg overflow-hidden cursor-pointer group transition-all duration-200 h-full flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        {article.coverImage && (
          <div className="overflow-hidden aspect-[16/9]">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-2"
            style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}
          >
            {article.categoryName}
          </div>
          <h3
            className="text-base md:text-lg font-bold leading-snug mb-1 group-hover:text-[var(--gold)] transition-colors flex-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            {article.title}
          </h3>
          {article.subtitle && (
            <p
              className="text-sm leading-relaxed mb-3 line-clamp-2"
              style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}
            >
              {article.subtitle}
            </p>
          )}
          <div
            className="flex items-center gap-3 text-xs mt-auto pt-2"
            style={{
              color: "var(--muted-text)",
              fontFamily: "var(--font-ui)",
              borderTop: "1px solid var(--line)",
            }}
          >
            {article.authorName && <span>{article.authorName}</span>}
            <span className="flex items-center gap-1 ml-auto"><Clock size={10} />{article.readingTime} min</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
