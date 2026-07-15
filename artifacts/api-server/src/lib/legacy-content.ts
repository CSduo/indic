const LEGACY_INLINE_IMAGE_SOURCES: Record<string, readonly string[]> = {
  "the-transatlantic-slave-trade-4e607526": Array.from(
    { length: 16 },
    (_, index) => `/images/legacy/the-transatlantic-slave-trade-4e607526/${String(index + 1).padStart(2, "0")}.jpg`,
  ),
};

const SRC_ATTRIBUTE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/**
 * Restores media references for legacy records whose original image bytes were
 * preserved outside the database. The repair is read-time and non-destructive,
 * so the original publication record remains available for rollback.
 */
export function recoverLegacyInlineImages(slug: string, body: unknown): string {
  if (typeof body !== "string") return "";
  const sources = LEGACY_INLINE_IMAGE_SOURCES[slug];
  if (!sources) return body;

  let position = 0;
  return body.replace(/<img\b([^>]*)>/gi, (tag, attributes: string) => {
    const source = sources[position++];
    if (!source) return tag;

    const currentSource = attributes.match(SRC_ATTRIBUTE);
    const currentValue = currentSource?.[1] ?? currentSource?.[2] ?? currentSource?.[3] ?? "";
    if (currentValue.trim()) return tag;

    if (currentSource) {
      return tag.replace(SRC_ATTRIBUTE, `src="${source}"`);
    }
    return `<img src="${source}"${attributes}>`;
  });
}
