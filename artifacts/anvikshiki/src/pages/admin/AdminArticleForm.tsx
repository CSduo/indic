import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import {
  useGetArticle,
  useCreateArticle,
  useUpdateArticle,
  useListCategories,
  useListAuthors,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListArticlesQueryKey } from "@workspace/api-client-react";

interface FormValues {
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  coverImage: string;
  categoryId: number;
  authorId: number;
  status: "draft" | "published" | "archived";
  readingTime: number;
  featured: boolean;
  keyTakeaways: string;
  tags: string;
}

export function AdminArticleForm() {
  const { slug } = useParams<{ slug?: string }>();
  const isEdit = !!slug;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: article } = useGetArticle(slug ?? "");
  const { data: categories = [] } = useListCategories();
  const { data: authors = [] } = useListAuthors();
  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { status: "draft", readingTime: 5, featured: false },
  });

  useEffect(() => {
    if (article) {
      reset({
        title: article.title,
        subtitle: article.subtitle ?? "",
        excerpt: article.excerpt ?? "",
        content: article.content ?? "",
        coverImage: article.coverImage ?? "",
        categoryId: article.categoryId,
        authorId: article.authorId,
        status: article.status as "draft" | "published" | "archived",
        readingTime: article.readingTime,
        featured: article.featured,
        keyTakeaways: (article.keyTakeaways ?? []).join("\n"),
        tags: (article.tags ?? []).join(", "),
      });
    }
  }, [article, reset]);

  function onSubmit(data: FormValues) {
    const payload = {
      title: data.title,
      subtitle: data.subtitle || undefined,
      excerpt: data.excerpt || undefined,
      content: data.content,
      coverImage: data.coverImage || undefined,
      categoryId: Number(data.categoryId),
      authorId: Number(data.authorId),
      status: data.status,
      readingTime: Number(data.readingTime),
      featured: data.featured,
      keyTakeaways: data.keyTakeaways ? data.keyTakeaways.split("\n").filter(Boolean) : [],
      tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    if (isEdit) {
      updateMutation.mutate(
        { slug: slug!, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
            navigate("/admin/articles");
          },
          onError: () => alert("Update failed."),
        },
      );
    } else {
      createMutation.mutate(
        { data: payload as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
            navigate("/admin/articles");
          },
          onError: () => alert("Create failed."),
        },
      );
    }
  }

  const fieldStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--line-2)",
    color: "var(--ink)",
    fontFamily: "var(--font-ui)",
    borderRadius: "0.5rem",
    padding: "0.625rem 0.875rem",
    width: "100%",
    fontSize: "0.875rem",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.35rem",
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--muted-text)",
    fontFamily: "var(--font-ui)",
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-3xl">
      <button
        onClick={() => navigate("/admin/articles")}
        className="inline-flex items-center gap-1 text-xs mb-6 cursor-pointer"
        style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
      >
        <ArrowLeft size={13} /> Back to articles
      </button>

      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {isEdit ? "Edit Article" : "New Article"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label style={labelStyle}>Title *</label>
          <input style={fieldStyle} {...register("title", { required: true })} placeholder="Article title" />
          {errors.title && <p className="text-xs mt-1" style={{ color: "var(--rose)" }}>Required</p>}
        </div>

        <div>
          <label style={labelStyle}>Subtitle</label>
          <input style={fieldStyle} {...register("subtitle")} placeholder="Optional subtitle" />
        </div>

        <div>
          <label style={labelStyle}>Excerpt</label>
          <textarea style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }} {...register("excerpt")} placeholder="Short summary shown in cards" />
        </div>

        <div>
          <label style={labelStyle}>Content (HTML)</label>
          <textarea style={{ ...fieldStyle, minHeight: 300, resize: "vertical", fontFamily: "monospace", fontSize: "0.8rem" }} {...register("content")} placeholder="<p>Article body...</p>" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Category *</label>
            <select style={fieldStyle} {...register("categoryId", { required: true })}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Author *</label>
            <select style={fieldStyle} {...register("authorId", { required: true })}>
              <option value="">Select author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label style={labelStyle}>Status</label>
            <select style={fieldStyle} {...register("status")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Reading Time (min)</label>
            <input type="number" style={fieldStyle} {...register("readingTime")} min={1} max={120} />
          </div>
          <div className="flex flex-col justify-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("featured")} className="accent-[var(--gold)]" />
              <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-ui)", color: "var(--muted-text)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Featured</span>
            </label>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Cover Image URL</label>
          <input style={fieldStyle} {...register("coverImage")} placeholder="https://..." />
        </div>

        <div>
          <label style={labelStyle}>Key Takeaways (one per line)</label>
          <textarea style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }} {...register("keyTakeaways")} placeholder="First key point&#10;Second key point" />
        </div>

        <div>
          <label style={labelStyle}>Tags (comma-separated)</label>
          <input style={fieldStyle} {...register("tags")} placeholder="philosophy, epistemology, nyaya" />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: "var(--gold)", color: "var(--bg)", fontFamily: "var(--font-ui)", opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? "Saving..." : isEdit ? "Update Article" : "Create Article"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/articles")}
            className="px-6 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: "var(--surface-2)", color: "var(--ink)", fontFamily: "var(--font-ui)", border: "1px solid var(--line)" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
