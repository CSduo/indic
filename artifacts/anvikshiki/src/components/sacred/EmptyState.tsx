import { LotusIcon } from "./LotusIcon";

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
      {/* Ornamental rings */}
      <div className="relative mb-6" aria-hidden="true">
        <div style={{
          width: compact ? 72 : 96,
          height: compact ? 72 : 96,
          borderRadius: "50%",
          border: "1px solid var(--border-gold)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle, rgba(201,152,58,0.06) 0%, transparent 70%)",
        }}>
          <div style={{
            width: compact ? 54 : 72,
            height: compact ? 54 : 72,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {icon ?? <LotusIcon size={compact ? 24 : 32} className="text-gold" style={{ color: "var(--gold)", opacity: 0.5 }} />}
          </div>
        </div>
      </div>

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
