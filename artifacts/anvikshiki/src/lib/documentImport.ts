export type ImportedContentSummary = {
  sourceLabel: string;
  wordCount: number;
  imageCount: number;
};

/** Returns true only for a regular, shareable Google Docs document URL. */
export function isGoogleDocumentUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.hostname.toLowerCase() === "docs.google.com" && /^\/document\/d\/[A-Za-z0-9_-]+(?:\/|$)/.test(url.pathname);
  } catch {
    return false;
  }
}

/**
 * Gives the editor a concise, human-readable import outcome without parsing or
 * mutating the already-sanitized HTML returned by the API.
 */
export function summarizeImportedHtml(html: string, sourceLabel: string): ImportedContentSummary {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&(?:quot|#39|apos);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    sourceLabel,
    wordCount: text ? text.split(" ").length : 0,
    imageCount: (html.match(/<img\b[^>]*\bsrc\s*=/gi) || []).length,
  };
}

export function importedContentMessage(summary: ImportedContentSummary): string {
  const words = `${summary.wordCount.toLocaleString()} word${summary.wordCount === 1 ? "" : "s"}`;
  const images = summary.imageCount === 0
    ? "no images found"
    : `${summary.imageCount} image${summary.imageCount === 1 ? "" : "s"} included`;
  return `Imported ${summary.sourceLabel}: ${words} · ${images}. Review everything below before submitting.`;
}
