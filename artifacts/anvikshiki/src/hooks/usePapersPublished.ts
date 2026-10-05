import { useQuery } from "@tanstack/react-query";
import { readSiteFacts } from "@/lib/initialData";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Whether any research paper is published. The header, footer and menu link
 * to /papers only then, matching the server-rendered nav: while there are no
 * papers that page is an empty, noindexed placeholder.
 *
 * A server-rendered page states the answer in its initial data; a visit that
 * started on a client-only page asks the API once and caches the answer.
 */
export function usePapersPublished(): boolean {
  const fromServer = readSiteFacts()?.papers;
  const { data } = useQuery({
    queryKey: ["site-papers-published"],
    queryFn: async () => {
      const response = await fetch(`${base}/api/papers?limit=1`);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const body = await response.json();
      return Number(body?.total ?? body?.papers?.length ?? 0) > 0;
    },
    enabled: fromServer === undefined,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return fromServer ?? data ?? false;
}
