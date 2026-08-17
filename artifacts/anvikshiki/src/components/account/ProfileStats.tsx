import { useEffect, useMemo, useState } from "react";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * An author's own statistics.
 *
 * Two halves. What you have written — counted from your articles, at the
 * resolution of the actual publication timestamps rather than a vague
 * "6 published". And who read it — counted from real visits, aggregated so
 * that no individual reader is ever identified.
 *
 * Figures are plain white. They are the loudest thing on the page and they
 * should read as facts, not as decoration. Colour is spent only on the charts,
 * where it carries a quantity, and it is a blue used nowhere else on the site
 * so a filled bar never reads as an alert.
 *
 * Only articles are counted.
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

type Readership = {
  readership: { views: number; readers: number; avgProgress: number; totalSeconds: number; finished: number };
  profile: { views: number; visitors: number };
  articles: Array<{ slug: string; title: string | null; views: number; avgProgress: number; avgSeconds: number }>;
  sources: Array<{ source: string; views: number }>;
};

/** Articles only — papers are a different thing and are not counted here. */
function isArticle(s: Submission): boolean {
  return s.status === "PUBLISHED" && !String(s.id || "").startsWith("paper-");
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function humanDuration(totalSeconds: number): string {
  if (!totalSeconds) return "0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSeconds}s`;
}

/** A figure. White, because it is the answer, not an ornament. */
function Figure({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
      <div className="font-display text-2xl" style={{ color: "#FFFFFF" }}>{value}</div>
      <div className="mt-1 font-ui text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">
        {label}
      </div>
      {hint ? <div className="mt-0.5 font-ui text-[9px] text-[var(--ink-faint)]">{hint}</div> : null}
    </div>
  );
}

/**
 * Every month since the first piece was published, up to now.
 *
 * Not "the last twelve months" — the record starts where the work starts, so a
 * year of writing is a year of chart and three months is three months of it.
 * Clicking a month opens the days inside it.
 */
function MonthlyTimeline({
  months, selected, onSelect,
}: {
  months: Array<{ key: string; label: string; value: number }>;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const max = Math.max(...months.map(m => m.value), 1);

  return (
    <div>
      <div className="flex h-28 items-stretch gap-[2px]">
        {months.map(({ key, label, value }) => {
          const active = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(active ? null : key)}
              className="flex flex-1 flex-col items-center justify-end gap-1 rounded-t-[3px] transition-colors"
              style={{ background: active ? "var(--data-blue-soft)" : "transparent" }}
              title={`${label}: ${value} published`}
              aria-pressed={active}
            >
              {value > 0 ? (
                <span className="font-ui text-[9px] tabular-nums text-[var(--ink-meta)]">{value}</span>
              ) : null}
              <span
                className="w-full shrink-0 rounded-t-[3px]"
                style={{
                  height: value > 0 ? `${Math.max((value / max) * 100, 8)}%` : "2px",
                  background: value > 0 ? CHART_BLUE : "var(--surface-2)",
                  minHeight: 2,
                  opacity: selected && !active ? 0.4 : 1,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {months.map(({ key, label }, i) => (
          <span key={key} className="flex-1 text-center font-ui text-[8px] uppercase text-[var(--ink-faint)]">
            {/* Thinned out so labels never collide on a phone. */}
            {months.length <= 6 || i % Math.ceil(months.length / 6) === 0 ? label.slice(0, 3) : ""}
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
  const [stats, setStats] = useState<Readership | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${base()}/api/stats/me`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setStats(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const work = useMemo(() => {
    const published = submissions
      .filter(isArticle)
      .map(s => ({ ...s, when: s.publishedAt || s.createdAt }))
      .filter(s => Boolean(s.when))
      .sort((a, b) => new Date(b.when!).getTime() - new Date(a.when!).getTime());

    if (published.length === 0) {
      return { published, months: [], daysInMonth: [], first: null, latest: null };
    }

    const first = published[published.length - 1];
    const latest = published[0];

    // Every month from the first publication to this one, gaps included, so
    // the shape of the year is honest about the quiet stretches.
    const start = new Date(first.when!);
    const months: Array<{ key: string; label: string; value: number }> = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date();
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: cursor.toLocaleDateString(undefined, { month: "short" }),
        value: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const byKey = new Map(months.map(m => [m.key, m]));
    for (const s of published) {
      const d = new Date(s.when!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = byKey.get(key);
      if (bucket) bucket.value += 1;
    }

    const daysInMonth = selectedMonth
      ? published
          .filter(s => {
            const d = new Date(s.when!);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === selectedMonth;
          })
          .sort((a, b) => new Date(a.when!).getTime() - new Date(b.when!).getTime())
      : [];

    return { published, months, daysInMonth, first, latest };
  }, [submissions, selectedMonth]);

  const r = stats?.readership;

  return (
    <div className="space-y-8">
      {/* ── What you have written ─────────────────────────────────────── */}
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Figure label="Articles" value={work.published.length} />
          <Figure label="Followers" value={followers ?? "—"} />
          <Figure label="Following" value={following ?? "—"} />
          <Figure
            label="Profile views"
            value={stats?.profile.views ?? "—"}
            hint={stats ? `${stats.profile.visitors} people` : undefined}
          />
        </div>

        {work.latest ? (
          <p className="mt-3 font-ui text-[11px] text-[var(--ink-faint)]">
            Most recent — {fullDate(work.latest.when!)} at {clockTime(work.latest.when!)}.
            {work.first && work.first !== work.latest
              ? ` First published ${fullDate(work.first.when!)}.`
              : null}
          </p>
        ) : null}
      </div>

      {/* ── When you published ────────────────────────────────────────── */}
      {work.months.length > 0 ? (
        <section>
          <p className="type-section-label mb-1">Publishing, month by month</p>
          <p className="mb-3 font-ui text-[10px] text-[var(--ink-faint)]">
            Every month since your first article. Tap a month for the exact days.
          </p>
          <MonthlyTimeline months={work.months} selected={selectedMonth} onSelect={setSelectedMonth} />

          {selectedMonth ? (
            <div className="mt-4 rounded-[2px] border border-[var(--border)] p-3">
              {work.daysInMonth.length === 0 ? (
                <p className="font-ui text-[11px] text-[var(--ink-faint)]">Nothing published that month.</p>
              ) : (
                <ul className="space-y-2">
                  {work.daysInMonth.map(s => (
                    <li key={s.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate font-body text-[13px] text-[var(--ink)]">
                        {s.title || "Untitled"}
                      </span>
                      <span className="shrink-0 font-ui text-[10px] tabular-nums text-[var(--ink-meta)]">
                        {fullDate(s.when!)} · {clockTime(s.when!)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Who read it ───────────────────────────────────────────────── */}
      <section>
        <p className="type-section-label mb-1">Readership</p>
        <p className="mb-3 font-ui text-[10px] text-[var(--ink-faint)]">
          Counts only. Who read your work is never recorded against a name.
        </p>

        {!stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-[74px] animate-pulse rounded-[8px] bg-[var(--surface-2)]" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Views" value={r!.views} />
              <Figure label="Readers" value={r!.readers} hint="distinct people" />
              <Figure label="Avg. read" value={`${r!.avgProgress}%`} hint="of the piece" />
              <Figure label="Time read" value={humanDuration(r!.totalSeconds)} />
            </div>

            {stats.articles.length > 0 ? (
              <div className="mt-5">
                <p className="mb-2 font-ui text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                  Most read
                </p>
                <ul className="space-y-2.5">
                  {stats.articles.map(a => {
                    const max = Math.max(...stats.articles.map(x => x.views), 1);
                    return (
                      <li key={a.slug} className="grid grid-cols-[1fr_4rem_2.5rem] items-center gap-2">
                        <span className="truncate font-body text-[12px] text-[var(--ink-body)]" title={a.title || a.slug}>
                          {a.title || a.slug}
                        </span>
                        <span className="block h-2 rounded-[2px]" style={{ background: "var(--surface-2)" }}>
                          <span
                            className="block h-full rounded-[2px]"
                            style={{ width: `${Math.max((a.views / max) * 100, 6)}%`, background: CHART_BLUE }}
                          />
                        </span>
                        <span className="text-right font-ui text-[11px] tabular-nums" style={{ color: "#FFFFFF" }}>
                          {a.views}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-4 font-body text-sm text-[var(--ink-body)]">
                No reading recorded yet. Views appear here as people open your work.
              </p>
            )}

            {stats.sources.length > 0 ? (
              <div className="mt-5">
                <p className="mb-2 font-ui text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                  Where readers came from
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {stats.sources.map(s => (
                    <li
                      key={s.source}
                      className="rounded-[2px] border px-2 py-1 font-ui text-[10px]"
                      style={{ borderColor: "var(--hairline)", color: "var(--ink-body)" }}
                    >
                      {s.source === "direct" ? "Opened directly" : s.source} · {s.views}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
