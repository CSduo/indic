import { Link, useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, BookCheck, Pencil } from "lucide-react";
import {
  useListPapers,
  useDeletePaper,
  useCreatePaper,
  useListCategories,
  useListAuthors,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPapersQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";

interface PaperFormValues {
  title: string;
  abstract: string;
  pdfUrl: string;
  categoryId: number;
  authorId: number;
  status: "draft" | "published";
  peerReviewed: boolean;
  citationText: string;
  publicationType: string;
  tags: string;
}

export function AdminPapers() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useListPapers({ limit: 50 });
  const { data: categories = [] } = useListCategories();
  const { data: authors = [] } = useListAuthors();
  const deleteMutation = useDeletePaper();
  const createMutation = useCreatePaper();

  const papers = data?.papers ?? [];

  const { register, handleSubmit, reset } = useForm<PaperFormValues>({
    defaultValues: { status: "draft", peerReviewed: false },
  });

  function handleDelete(slug: string) {
    if (!confirm("Delete this paper?")) return;
    deleteMutation.mutate({ slug }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPapersQueryKey() }),
    });
  }

  function onSubmit(data: PaperFormValues) {
    createMutation.mutate(
      {
        data: {
          title: data.title,
          abstract: data.abstract,
          pdfUrl: data.pdfUrl || undefined,
          categoryId: Number(data.categoryId),
          authorId: Number(data.authorId),
          status: data.status,
          peerReviewed: !!data.peerReviewed,
          citationText: data.citationText || undefined,
          publicationType: data.publicationType || undefined,
          tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPapersQueryKey() });
          setShowForm(false);
          reset();
        },
        onError: () => alert("Create failed."),
      },
    );
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>Papers</h1>
          <p className="text-sm" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>{data?.total ?? 0} total</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "var(--gold)", color: "var(--bg)", fontFamily: "var(--font-ui)" }}
        >
          <Plus size={15} /> New Paper
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <h2 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>New Paper</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <input style={fieldStyle} {...register("title", { required: true })} placeholder="Paper title *" />
            <textarea style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }} {...register("abstract")} placeholder="Abstract" />
            <input style={fieldStyle} {...register("pdfUrl")} placeholder="PDF URL (optional)" />
            <div className="grid grid-cols-2 gap-3">
              <select style={fieldStyle} {...register("categoryId", { required: true })}>
                <option value="">Category *</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select style={fieldStyle} {...register("authorId", { required: true })}>
                <option value="">Author *</option>
                {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select style={fieldStyle} {...register("status")}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
              <input style={fieldStyle} {...register("publicationType")} placeholder="Type (e.g. working-paper)" />
            </div>
            <input style={fieldStyle} {...register("citationText")} placeholder="Citation text" />
            <input style={fieldStyle} {...register("tags")} placeholder="Tags (comma-separated)" />
            <label className="flex items-center gap-2 text-xs" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
              <input type="checkbox" {...register("peerReviewed")} /> Peer-reviewed
            </label>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--gold)", color: "var(--bg)", fontFamily: "var(--font-ui)" }}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--surface-2)", color: "var(--ink)", fontFamily: "var(--font-ui)", border: "1px solid var(--line)" }}>
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="rounded-lg animate-pulse" style={{ background: "var(--surface-2)", height: 56 }} />)}</div>
      ) : papers.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)", fontStyle: "italic" }}>No papers yet.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
          {papers.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 group"
              style={{ background: "var(--surface)", borderBottom: i < papers.length - 1 ? "1px solid var(--line)" : "none" }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.status === "published" ? "var(--gold)" : "var(--muted-text)" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{p.title}</span>
                  {p.peerReviewed && <BookCheck size={11} style={{ color: "var(--gold)", flexShrink: 0 }} />}
                </div>
                <div className="text-xs" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>{p.categoryName} · {p.authorName}</div>
              </div>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: p.status === "published" ? "var(--gold)" : "var(--muted-text)", fontFamily: "var(--font-ui)", border: "1px solid var(--line)" }}>
                {p.status}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDelete(p.slug)} className="p-1.5 rounded-md" style={{ color: "var(--rose)" }} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
