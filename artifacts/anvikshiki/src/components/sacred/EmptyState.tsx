
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? "py-10 px-4" : "py-20 px-6"}`}
      role="status"
      aria-label={title}
    >
      {/*
        No default glyph.

        This used to draw a lotus at half opacity inside two rings. At that
        size and faintness the shape stopped reading as a lotus and became a
        grey smudge — something the eye takes for a broken image before it
        reaches the sentence below it. An empty list is not an error and does
        not need an illustration.

        A caller with a genuinely meaningful mark can still pass one; nothing
        is invented when they do not.
      */}
      {icon ? (
        <div className="mb-5 flex items-center justify-center" aria-hidden="true">
          {icon}
        </div>
      ) : null}

      {/* Ornamental line */}
      <div className="flex items-center gap-2 mb-4" aria-hidden="true" style={{ width: compact ? 120 : 180 }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, var(--border-gold))" }} />
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold)", opacity: 0.5 }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, var(--border-gold), transparent)" }} />
      </div>

      <h3
        className="font-display mb-2"
        style={{ fontSize: compact ? "1.125rem" : "1.5rem", color: "var(--ink-soft)" }}
      >
        {title}
      </h3>
      {description && (
        <p className="font-body text-sm max-w-xs leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
