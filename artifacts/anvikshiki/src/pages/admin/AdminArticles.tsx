import { Link, useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Eye, EyeOff, Trash2, Star, Pencil } from "lucide-react";
import {
  useListArticles,
  usePublishArticle,
  useDeleteArticle,
  useFeatureArticle,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListArticlesQueryKey } from "@workspace/api-client-react";

export function AdminArticles() {
  const [statusFilter, setStatusFilter] = useState<"" | "published" | "draft" | "archived">("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useListArticles(
    { ...(statusFilter ? { status: statusFilter } : {}), limit: 50 },
  );
  const publishMutation = usePublishArticle();
  const deleteMutation = useDeleteArticle();
  const featureMutation = useFeatureArticle();

  const articles = data?.articles ?? [];

  function togglePublish(slug: string, currentStatus: string) {
    publishMutation.mutate(
      { slug, data: { publish: currentStatus !== "published" } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() }),
      },
    );
  }

  function handleDelete(slug: string) {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    deleteMutation.mutate(
      { slug },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() }),
      },
    );
  }

  function handleFeature(slug: string) {
    featureMutation.mutate(
      { slug },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() }),
      },
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    published: "var(--gold)",
    draft: "var(--muted-text)",
    archived: "var(--rose)",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
            Articles
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
            {data?.total ?? 0} total
          </p>
        </div>
        <Link href="/admin/articles/new">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--gold)", color: "var(--bg)", fontFamily: "var(--font-ui)" }}
          >
            <Plus size={15} /> New Article
          </button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        {(["", "published", "draft", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: statusFilter === s ? "var(--gold)" : "var(--surface)",
              color: statusFilter === s ? "var(--bg)" : "var(--muted-text)",
              border: "1px solid var(--line-2)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg animate-pulse" style={{ background: "var(--surface-2)", height: 56 }} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>No articles found.</p>
          <Link href="/admin/articles/new">
            <span className="text-sm mt-4 inline-block" style={{ color: "var(--gold)", fontFamily: "var(--font-ui)" }}>
              Create your first article
            </span>
          </Link>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--line)" }}
        >
          {articles.map((article, i) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 px-4 py-3 group"
              style={{
                background: "var(--surface)",
                borderBottom: i < articles.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              {/* Status dot */}
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: STATUS_COLORS[article.status] ?? "var(--muted-text)" }}
              />

              {/* Title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium truncate"
                    style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
                  >
                    {article.title}
                  </span>
                  {article.featured && (
                    <Star size={11} fill="var(--gold)" style={{ color: "var(--gold)", flexShrink: 0 }} />
                  )}
                </div>
                <div className="text-xs" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
                  {article.categoryName} · {article.authorName}
                </div>
              </div>

              {/* Status badge */}
              <span
                className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: "var(--surface-2)",
                  color: STATUS_COLORS[article.status] ?? "var(--muted-text)",
                  fontFamily: "var(--font-ui)",
                  border: "1px solid var(--line)",
                }}
              >
                {article.status}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/admin/articles/${article.slug}/edit`}>
                  <button
                    className="p-1.5 rounded-md transition-all"
                    style={{ color: "var(--muted-text)" }}
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                </Link>
                <button
                  onClick={() => handleFeature(article.slug)}
                  className="p-1.5 rounded-md transition-all"
                  style={{ color: article.featured ? "var(--gold)" : "var(--muted-text)" }}
                  title="Feature"
                >
                  <Star size={14} />
                </button>
                <button
                  onClick={() => togglePublish(article.slug, article.status)}
                  className="p-1.5 rounded-md transition-all"
                  style={{ color: "var(--muted-text)" }}
                  title={article.status === "published" ? "Unpublish" : "Publish"}
                >
                  {article.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(article.slug)}
                  className="p-1.5 rounded-md transition-all"
                  style={{ color: "var(--rose)" }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
