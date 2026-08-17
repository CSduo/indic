/**
 * Nothing here yet.
 *
 * The previous version put a lotus at a third of its opacity in the middle of
 * the space. At that size and that faintness the shape stopped being a lotus
 * and became a grey smudge — a thing the eye reads as a broken image before it
 * reads the sentence underneath.
 *
 * An empty list is not an error and does not need an illustration. A hairline,
 * a sentence in the display face, and the one action that would fill the space
 * is enough, and it matches how the rest of the journal is set.
 */
export function QuietEmpty({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? "px-4 py-10" : "px-6 py-16"}`}
      role="status"
    >
      <p
        className="font-display"
        style={{ fontSize: compact ? "1.0625rem" : "1.375rem", color: "var(--ink-soft)" }}
      >
        {title}
      </p>

      {description ? (
        <p className="mt-2 max-w-xs font-body text-sm leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
