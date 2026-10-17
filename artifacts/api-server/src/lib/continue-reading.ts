/**
 * What closes a work's page, in the server-rendered HTML and in the API the
 * client navigates with: related works to read next and the work's domain hub
 * once that hub holds enough work to be indexed (the archive is always linked).
 */
import { relatedWorks } from "./hub-content";
import { listPublishedWorks, listVisibleCategories, type WorkSummary } from "./public-content";
import { MIN_WORKS_FOR_INDEXED_HUB } from "./sitemap-entries";

export interface ContinueReading {
  related: WorkSummary[];
  hub: { slug: string; name: string } | null;
}

/**
 * The related works and indexed domain hub for a work, from the same
 * published listing the hubs use, with the visible domains' names. Null when
 * the listing could not be read: the page then goes without, never fails.
 */
export async function loadContinueReading(
  work: { kind: "article" | "paper"; id: string; categorySlug?: string | null; topics: string[] },
  log?: { warn: (obj: unknown, msg?: string) => void },
): Promise<{ continueReading: ContinueReading; names: Map<string, string> } | null> {
  try {
    const [works, visible] = await Promise.all([listPublishedWorks(), listVisibleCategories()]);
    const all = [...works.articles, ...works.papers];
    const names = new Map(visible.map((c) => [c.slug, c.name]));
    const inHub = work.categorySlug ? all.filter((w) => w.categorySlug === work.categorySlug).length : 0;
    const hubName = work.categorySlug ? names.get(work.categorySlug) : undefined;
    return {
      continueReading: {
        related: relatedWorks(work, all),
        hub: work.categorySlug && hubName && inHub >= MIN_WORKS_FOR_INDEXED_HUB ? { slug: work.categorySlug, name: hubName } : null,
      },
      names,
    };
  } catch (err) {
    log?.warn({ err }, "Related works unavailable");
    return null;
  }
}
