import { Link } from "wouter";

interface CategoryBadgeProps {
  slug: string;
  name: string;
  icon?: string;
  colorAccent?: string | null;
  showLink?: boolean;
}

const ICON_MAP: Record<string, string> = {
  flame: "🔥", scroll: "📜", brain: "🧠", users: "👥",
  globe: "🌏", atom: "⚛", "file-text": "📄", archive: "🗄",
  "play-circle": "▶",
};

export function CategoryBadge({ slug, name, icon, colorAccent, showLink = true }: CategoryBadgeProps) {
  const badge = (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-150"
      style={{
        background: colorAccent ? `${colorAccent}18` : "var(--surface-2)",
        color: colorAccent ?? "var(--gold)",
        border: `1px solid ${colorAccent ? `${colorAccent}40` : "var(--line)"}`,
        fontFamily: "var(--font-ui)",
      }}
    >
      {name}
    </span>
  );

  if (!showLink) return badge;
  return <Link href={`/category/${slug}`}>{badge}</Link>;
}
