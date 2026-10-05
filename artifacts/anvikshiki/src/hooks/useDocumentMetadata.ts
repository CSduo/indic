import { useEffect } from "react";
import { isServerRenderedPath } from "@/lib/initialData";

interface DocumentMetadata {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
}

/*
  What this hook deliberately does not do any more:

  - Keywords. It used to write meta keywords / news_keywords / citation_keywords
    built from category slugs and title words; search engines ignore them and
    they did not describe the page.
  - Structured data. The server emits one JSON-LD graph per page (and the SPA
    shell carries the site-wide graph). A second, client-made ScholarlyArticle
    or Person block contradicted it.
  - Overwriting the server's canonical / og:url. Server-rendered pages already
    carry the correct canonical; the client used to replace it with a URL
    built from VITE_PUBLIC_SITE_URL, which pointed at the www host.
  - Touching a server-rendered page's head at all. While the visitor is on the
    path the server rendered (it embedded __INITIAL_DATA__ for that path), its
    title, description, Open Graph tags, canonical and JSON-LD are the
    authoritative values and the client leaves every one of them alone. Pages
    pass the same title and description the server uses (lib/pageMeta.ts), so
    after client-side navigation the values still agree.
*/

export const DEFAULT_SITE_URL = "https://anvikshikijournal.in";

/**
 * The public origin used for canonical and og:url values. Defaults to the apex
 * domain when VITE_PUBLIC_SITE_URL is unset, and folds the www host (which
 * now 308-redirects to the apex) back onto the apex.
 */
export function resolveSiteUrl(configured: string | undefined): string {
  const value = configured?.trim().replace(/\/+$/, "");
  if (!value) return DEFAULT_SITE_URL;
  try {
    const url = new URL(value);
    if (url.hostname === "www.anvikshikijournal.in") return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

const siteUrl = resolveSiteUrl(import.meta.env.VITE_PUBLIC_SITE_URL);

function absoluteUrl(value: string): string {
  try {
    return new URL(value, `${siteUrl}/`).href;
  } catch {
    return `${siteUrl}/`;
  }
}

/*
  The page the server rendered: its path and whether its HTML arrived with a
  canonical link. Captured once, before any effect runs. While the visitor is
  still on that path the server's canonical and og:url are authoritative and
  are left alone; after client-side navigation to another path they are stale,
  so the hook updates them (and restores them on the way back).
*/
const initialPath = typeof window !== "undefined" ? window.location.pathname : "";
const serverProvidedCanonical =
  typeof document !== "undefined" && !!document.head.querySelector('link[rel="canonical"][href]');

export function keepsServerCanonical(
  currentPath: string,
  firstPath: string,
  hadServerCanonical: boolean,
): boolean {
  return hadServerCanonical && currentPath === firstPath;
}

function setMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  const created = !element;
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  const previous = new Map<string, string | null>();
  for (const [name, value] of Object.entries(attributes)) {
    previous.set(name, element.getAttribute(name));
    element.setAttribute(name, value);
  }
  return () => {
    if (created) {
      element.remove();
      return;
    }
    for (const [name, value] of previous) {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    }
  };
}

function setCanonical(href: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const created = !canonical;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  const previous = canonical.getAttribute("href");
  canonical.href = href;
  return () => {
    if (created) canonical.remove();
    else if (previous === null) canonical.removeAttribute("href");
    else canonical.setAttribute("href", previous);
  };
}

export function useDocumentMetadata({
  title,
  description,
  canonicalPath,
  image,
  type = "website",
}: DocumentMetadata) {
  useEffect(() => {
    if (!title) return;
    if (isServerRenderedPath()) return;
    const previousTitle = document.title;
    const imageUrl = image ? absoluteUrl(image) : "";
    const cleanDescription = (description || "Ānvīkṣikī journal and research platform.").trim().slice(0, 300);
    document.title = title;

    const restores = [
      setMeta('meta[name="description"]', { name: "description", content: cleanDescription }),
      setMeta('meta[property="og:title"]', { property: "og:title", content: title }),
      setMeta('meta[property="og:description"]', { property: "og:description", content: cleanDescription }),
      setMeta('meta[property="og:type"]', { property: "og:type", content: type }),
      setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title }),
      setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: cleanDescription }),
    ];

    if (!keepsServerCanonical(window.location.pathname, initialPath, serverProvidedCanonical)) {
      const canonicalUrl = absoluteUrl(canonicalPath || window.location.pathname);
      restores.push(
        setCanonical(canonicalUrl),
        setMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl }),
      );
    }

    if (imageUrl) {
      restores.push(
        setMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl }),
        setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl }),
      );
    }

    return () => {
      document.title = previousTitle;
      for (const restore of restores.reverse()) restore();
    };
  }, [canonicalPath, description, image, title, type]);
}
