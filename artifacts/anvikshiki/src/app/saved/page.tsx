"use client";

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Bookmark, BookOpen, FileText, X } from "lucide-react";

interface SavedItem {
  slug: string;
  title: string;
  type: "article" | "paper";
  savedAt: string;
}

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedItem[]>([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("anvikshiki_saved") || "[]");
      setSaved(data);
    } catch {
      setSaved([]);
    }
  }, []);

  const removeSaved = (slug: string) => {
    const updated = saved.filter((s) => s.slug !== slug);
    setSaved(updated);
    localStorage.setItem("anvikshiki_saved", JSON.stringify(updated));
  };

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8 max-w-2xl">
        <h1 className="font-display text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>
          Saved Reading
        </h1>
        <p className="font-body mt-2" style={{ color: "var(--muted)" }}>
          Your personal reading list.
        </p>

        {saved.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark size={48} className="mx-auto mb-4 opacity-30" style={{ color: "var(--muted)" }} />
            <p className="font-body italic" style={{ color: "var(--muted)" }}>
              No saved items yet. Browse essays and papers to save them here.
            </p>
            <Link href="/search" className="btn-primary mt-4 inline-flex">
              Explore
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {saved.map((item) => (
              <div
                key={item.slug}
                className="card-anv p-4 flex items-center gap-4"
              >
                {item.type === "article" ? (
                  <BookOpen size={20} style={{ color: "var(--gold)" }} className="shrink-0" />
                ) : (
                  <FileText size={20} style={{ color: "var(--peacock)" }} className="shrink-0" />
                )}
                <Link
                  href={`/${item.type}s/${item.slug}`}
                  className="flex-1 min-w-0"
                >
                  <h4 className="font-display text-base truncate" style={{ color: "var(--ink)" }}>
                    {item.title}
                  </h4>
                  <span className="font-ui text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    {item.type}
                  </span>
                </Link>
                <button
                  onClick={() => removeSaved(item.slug)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0"
                  style={{ background: "var(--surface-soft)" }}
                >
                  <X size={14} style={{ color: "var(--muted)" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
