import { useEffect, useRef } from "react";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * The bar across the top of a piece showing how far through it you are — and,
 * when given something to measure, the source of an author's readership
 * figures.
 *
 * The reader sees their place. The author sees counts. Neither sees the other:
 * what leaves this browser is a random key, how far the page was scrolled, and
 * how many seconds were actually spent with it in view. Nothing that says who
 * anybody is.
 *
 * Three details decide whether the measurement means anything at all:
 *
 * - Time accrues only while the tab is visible. Counting a page left open
 *   overnight as nine hours of reading would make the statistic worthless.
 * - Progress only moves forward, so scrolling back to re-read a paragraph
 *   never reduces it.
 * - It reports on a slow timer and again when the page is hidden, by beacon,
 *   so the final state survives the tab closing. Reporting per scroll event
 *   would be thousands of requests per article.
 *
 * Called with no arguments it is what it always was: a scroll indicator that
 * measures nothing.
 */

const READER_KEY = "anv_reader_key";
const REPORT_EVERY_MS = 15000;

/** A random, meaningless value so one reader is counted once, not per refresh. */
function readerKey(): string {
  try {
    let key = localStorage.getItem(READER_KEY);
    if (!key) {
      key = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(READER_KEY, key);
    }
    return key;
  } catch {
    // Storage denied (private browsing). Still counted, just not recognised
    // again on a later visit.
    return `ephemeral-${Math.random().toString(36).slice(2)}`;
  }
}

export function ReadingProgress({
  targetId,
  kind = "ARTICLE",
}: {
  /** Slug of the piece being read. Omit to render a bar that measures nothing. */
  targetId?: string;
  kind?: "ARTICLE" | "PAPER";
} = {}) {
  const maxProgress = useRef(0);
  const seconds = useRef(0);

  // The visual bar, unchanged: a CSS variable the stylesheet already consumes.
  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const value = Math.min(100, Math.max(0, (scrollTop / max) * 100));
      document.documentElement.style.setProperty("--progress", `${value}%`);
      if (value > maxProgress.current) maxProgress.current = value;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.setProperty("--progress", "0%");
    };
  }, []);

  // The measurement, only when there is something to attribute it to.
  useEffect(() => {
    if (!targetId) return;
    const key = readerKey();
    maxProgress.current = 0;
    seconds.current = 0;

    const report = (viaBeacon = false) => {
      const payload = JSON.stringify({
        kind,
        targetId,
        sessionKey: key,
        progressPct: Math.round(maxProgress.current),
        readSeconds: Math.round(seconds.current),
        referrer: document.referrer || undefined,
      });
      const url = `${base()}/api/views`;

      if (viaBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
        return;
      }
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") seconds.current += 1;
    }, 1000);
    const reporter = window.setInterval(() => report(false), REPORT_EVERY_MS);
    const onHide = () => { if (document.visibilityState === "hidden") report(true); };
    const onPageHide = () => report(true);

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);

    // Recorded on arrival, so someone who leaves after five seconds still
    // counts as a person who turned up.
    report(false);

    return () => {
      report(true);
      window.clearInterval(tick);
      window.clearInterval(reporter);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [targetId, kind]);

  return <div className="reading-progress" aria-hidden="true" />;
}
