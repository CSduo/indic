import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

/*
  Lifts the static #anv-boot cover from index.html once the first screen is
  genuinely finished: the lazy route chunk has mounted (no PageSkeleton left),
  the first wave of queries has settled, the fonts it needs are in, and the
  images inside the viewport have decoded. A hard cap measured from navigation
  start keeps a slow network from holding the reader behind the cover.
*/
const HARD_CAP_MS = 6000;
const IMAGE_WAIT_MS = 2500;

// Background tabs pause requestAnimationFrame; the timer keeps a tab opened
// behind the current one from waiting on frames that never come.
const nextFrame = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => resolve());
  setTimeout(resolve, 100);
});
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const withCap = (work: Promise<unknown>, ms: number) => Promise.race([work, delay(ms)]);

async function routeSettled() {
  // Two clean frames in a row, so a skeleton swapped for another skeleton
  // between chunks does not count as finished.
  let clean = 0;
  while (clean < 2) {
    await nextFrame();
    clean = document.querySelector("[data-page-skeleton]") ? 0 : clean + 1;
  }
}

// Only queries the mounted page observes: App.tsx prefetches the home
// listings on every entry URL, and those should not hold an article page.
const activeFetches = (client: QueryClient) => client.isFetching({ type: "active" });

function queriesSettled(client: QueryClient) {
  if (activeFetches(client) === 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const unsubscribe = client.getQueryCache().subscribe(() => {
      if (activeFetches(client) === 0) {
        unsubscribe();
        resolve();
      }
    });
  });
}

function visibleImagesLoaded() {
  const pending = Array.from(document.images).filter((img) => {
    if (img.complete) return false;
    const box = img.getBoundingClientRect();
    return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
  });
  return Promise.all(
    pending.map((img) => new Promise<void>((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    })),
  );
}

function liftCover() {
  document.documentElement.setAttribute("data-boot", "done");
  const cover = document.getElementById("anv-boot");
  if (!cover) return;
  cover.classList.add("is-done");
  window.setTimeout(() => cover.remove(), 600);
}

export function BootCover() {
  const client = useQueryClient();

  useEffect(() => {
    if (document.documentElement.getAttribute("data-boot") !== "on") {
      liftCover();
      return;
    }

    let cancelled = false;
    const ready = (async () => {
      await routeSettled();
      await Promise.all([queriesSettled(client), document.fonts?.ready]);
      // Settled data can reveal sections that pull in another lazy chunk.
      await routeSettled();
      await withCap(visibleImagesLoaded(), IMAGE_WAIT_MS);
    })();

    void withCap(ready, Math.max(0, HARD_CAP_MS - performance.now()))
      .then(nextFrame)
      .then(nextFrame)
      .then(() => {
        if (!cancelled) liftCover();
      });

    return () => {
      cancelled = true;
    };
  }, [client]);

  return null;
}
