import { useMemo } from "react";
import { DOMAIN_META } from "@/lib/domainMeta";

/**
 * Your work, at a glance.
 *
 * Two charts and four figures, all computed from submissions already loaded by
 * the page — nothing here costs a request.
 *
 * On colour: the journal's accent is a crimson that carries meaning elsewhere
 * (it marks actions and alerts), so reusing it for data would make a bar chart
 * look like a warning. Data marks wear one blue instead, a hue used for nothing
 * else on the site, so a filled bar reads as a quantity rather than a state.
 * There is a single series in each chart, so one hue is all that is needed —
 * and a single series needs no legend, because the heading names it.
 *
 * Both blues were checked against the actual light and dark surfaces rather
 * than picked by eye: #2563EB clears the lightness, chroma and 3:1 contrast
 * checks on the light surface, #3B82F6 on the dark one.
 */

const CHART_BLUE = "var(--data-blue)";

type Submission = {
  id: string;
  title?: string;
  status?: string;
  domain?: string;
  publishedAt?: string | null;
  createdAt?: string | null;
};

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

/** The last `count` months, oldest first, including months with nothing in them. */
function recentMonths(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
      <div className="font-display text-2xl text-[var(--gold)]">{value}</div>
      <div className="mt-1 font-ui text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
        {label}
      </div>
    </div>
  );
}

/**
 * Horizontal bars, because domain names are words and words read better
 * along the axis than rotated under it.
 */
function DomainBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map(r => r.value), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map(row => {
        const pct = (row.value / max) * 100;
        return (
          <li key={row.label} className="grid grid-cols-[7rem_1fr_1.75rem] items-center gap-2">
            <span className="truncate font-ui text-[11px] text-[var(--ink-body)]" title={row.label}>
              {row.label}
            </span>
            {/* The track is the full scale, so a short bar reads as "less of
                the same thing" rather than as a different-sized chart. */}
            <span className="block h-2.5 rounded-[2px]" style={{ background: "var(--surface-2)" }}>
              <span
                className="block h-full rounded-[2px] transition-[width] duration-500"
                style={{ width: `${Math.max(pct, 4)}%`, background: CHART_BLUE }}
                role="img"
                aria-label={`${row.label}: ${row.value}`}
              />
            </span>
            {/* Every bar is labelled, so identity never rests on colour. */}
            <span className="text-right font-ui text-[11px] tabular-nums text-[var(--ink)]">
              {row.value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Twelve months of publishing, as columns. */
function MonthlyBars({ counts }: { counts: Array<{ key: string; value: number }> }) {
  const max = Math.max(...counts.map(c => c.value), 1);

  return (
    <div>
      {/*
        `items-stretch`, not `items-end`. With `items-end` each column shrinks
        to its own content instead of filling the row, so the bars' percentage
        heights resolve against a few pixels and every month renders as a
        sliver. The columns fill the height; the bars sit at the bottom of them.
      */}
      <div className="flex h-24 items-stretch gap-[3px]">
        {counts.map(({ key, value }) => (
          <div key={key} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${monthLabel(key)}: ${value}`}>
            {value > 0 ? (
              <span className="font-ui text-[9px] tabular-nums text-[var(--ink-meta)]">{value}</span>
            ) : null}
            <span
              className="w-full shrink-0 rounded-t-[3px]"
              style={{
                // An empty month keeps a visible sliver so the row reads as a
                // timeline with gaps, not as a chart that stops early.
                height: value > 0 ? `${Math.max((value / max) * 100, 8)}%` : "2px",
                background: value > 0 ? CHART_BLUE : "var(--surface-2)",
                minHeight: 2,
              }}
              role="img"
              aria-label={`${monthLabel(key)}: ${value} published`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {counts.map(({ key }, i) => (
          <span key={key} className="flex-1 text-center font-ui text-[8px] uppercase text-[var(--ink-faint)]">
            {/* Every other month, so labels never collide on a phone. */}
            {i % 2 === 0 ? monthLabel(key) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProfileStats({
  submissions,
  followers,
  following,
}: {
  submissions: Submission[];
  followers: number | null;
  following: number | null;
}) {
  const stats = useMemo(() => {
    const published = submissions.filter(s => s.status === "PUBLISHED");

    const byDomain = new Map<string, number>();
    for (const s of published) {
      const slug = s.domain || "other";
      byDomain.set(slug, (byDomain.get(slug) || 0) + 1);
    }
    const domainRows = [...byDomain.entries()]
      .map(([slug, value]) => ({
        label: (DOMAIN_META as any)[slug]?.label || slug.replace(/-/g, " "),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const months = recentMonths(12);
    const monthCounts = new Map(months.map(m => [m, 0]));
    for (const s of published) {
      const when = s.publishedAt || s.createdAt;
      if (!when) continue;
      const key = monthKey(when);
      if (monthCounts.has(key)) monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
    }

    return {
      publishedCount: published.length,
      domainRows,
      monthly: months.map(key => ({ key, value: monthCounts.get(key) || 0 })),
      activeMonths: months.filter(m => (monthCounts.get(m) || 0) > 0).length,
    };
  }, [submissions]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Published" value={stats.publishedCount} />
        <StatTile label="Domains" value={stats.domainRows.length} />
        <StatTile label="Followers" value={followers ?? "—"} />
        <StatTile label="Following" value={following ?? "—"} />
      </div>

      {stats.publishedCount === 0 ? (
        <p className="mt-6 font-body text-sm text-[var(--ink-body)]">
          Once your first piece is published, its reach will be charted here.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section>
            <p className="type-section-label mb-3">Work by domain</p>
            <DomainBars rows={stats.domainRows} />
          </section>

          <section>
            <p className="type-section-label mb-3">Published over the last year</p>
            <MonthlyBars counts={stats.monthly} />
            <p className="mt-2 font-ui text-[10px] text-[var(--ink-faint)]">
              {stats.activeMonths === 0
                ? "Nothing published in the last twelve months."
                : `Active in ${stats.activeMonths} of the last 12 months.`}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
