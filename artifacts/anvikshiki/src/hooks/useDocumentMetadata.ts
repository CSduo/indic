import { useEffect } from "react";

interface DocumentMetadata {
  title?: string;
  description?: string;
  canonicalPath?: string;
  image?: string | null;
  type?: "website" | "article";
  structuredData?: Record<string, unknown> | null;
}

const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

function absoluteUrl(value: string): string {
  const baseUrl = configuredSiteUrl || window.location.origin;
  try {
    return new URL(value, `${baseUrl}/`).href;
  } catch {
    return `${baseUrl}/`;
  }
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

export function useDocumentMetadata({
  title,
  description,
  canonicalPath,
  image,
  type = "website",
  structuredData,
}: DocumentMetadata) {
  const structuredDataJson = structuredData ? JSON.stringify(structuredData) : "";

  useEffect(() => {
    if (!title) return;
    const previousTitle = document.title;
    const canonicalUrl = absoluteUrl(canonicalPath || window.location.pathname);
    const imageUrl = image ? absoluteUrl(image) : "";
    const cleanDescription = (description || "Ānvīkṣikī journal and research platform.").trim().slice(0, 300);
    document.title = title;

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonicalCreated = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    const previousCanonical = canonical.getAttribute("href");
    canonical.href = canonicalUrl;

    const restores = [
      setMeta('meta[name="description"]', { name: "description", content: cleanDescription }),
      setMeta('meta[property="og:title"]', { property: "og:title", content: title }),
      setMeta('meta[property="og:description"]', { property: "og:description", content: cleanDescription }),
      setMeta('meta[property="og:type"]', { property: "og:type", content: type }),
      setMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl }),
      setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title }),
      setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: cleanDescription }),
    ];
    if (imageUrl) {
      restores.push(
        setMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl }),
        setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl }),
      );
    }

    let schema: HTMLScriptElement | null = null;
    if (structuredDataJson) {
      schema = document.createElement("script");
      schema.type = "application/ld+json";
      schema.dataset.anvPageSchema = "true";
      schema.textContent = structuredDataJson;
      document.head.appendChild(schema);
    }

    return () => {
      document.title = previousTitle;
      for (const restore of restores.reverse()) restore();
      if (canonicalCreated) canonical.remove();
      else if (previousCanonical === null) canonical.removeAttribute("href");
      else canonical.setAttribute("href", previousCanonical);
      schema?.remove();
    };
  }, [canonicalPath, description, image, structuredDataJson, title, type]);
}
