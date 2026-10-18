const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

/** One embedded image that could not be stored. */
export interface InlineImageFailure {
  /** Its position among the document's embedded images, from 1. */
  index: number;
  /** "PNG", "JPEG", ... */
  format: string;
  reason: string;
}

/**
 * Some embedded images could not be uploaded. The message names each one and
 * why, so the author can replace or remove it; `html` holds the document with
 * every image that did upload already pointing at its stored copy.
 */
export class InlineImageUploadError extends Error {
  readonly failures: InlineImageFailure[];
  readonly total: number;
  readonly html: string;

  constructor(failures: InlineImageFailure[], total: number, html: string) {
    const list = failures.map((f) => `image ${f.index} (${f.format}): ${f.reason}`).join("; ");
    super(
      `${failures.length} of ${total} image${total === 1 ? "" : "s"} in your document could not be uploaded: ${list}. ` +
        "Replace or remove them, then try again.",
    );
    this.name = "InlineImageUploadError";
    this.failures = failures;
    this.total = total;
    this.html = html;
  }
}

/** Why an upload failed, in the server's words when it gave any. */
async function failureReason(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data && typeof data.error === "string" && data.error.trim()) return data.error.trim().replace(/\.$/, "");
  if (res.status === 413) return "the image is too large";
  if (res.status === 401) return "you are signed out; sign in and try again";
  return `upload failed (${res.status})`;
}

/**
 * Scans an HTML string for embedded base64 images, uploads each image individually
 * to the media storage API, and replaces the data URI with the permanent CDN URL.
 *
 * This prevents massive (>4.5MB) payloads when submitting extracted documents to Vercel.
 * An image that appears several times is uploaded once. When any image cannot
 * be uploaded, every image is still attempted and an InlineImageUploadError
 * then names each failure: an image is never left behind silently as a data URI.
 */
export async function uploadInlineBase64Images(
  html: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  if (!html || !html.includes("data:image/")) return html;

  // Match all data:image base64 sources
  const dataUriRegex = /src=["'](data:(image\/[a-zA-Z0-9+.-]+);base64,([^"']+))["']/gi;
  const images = new Map<string, { mimeType: string; base64Data: string }>();
  for (const match of html.matchAll(dataUriRegex)) {
    if (!images.has(match[1])) images.set(match[1], { mimeType: match[2], base64Data: match[3] });
  }
  if (images.size === 0) return html;

  let processedHtml = html;
  const total = images.size;
  const failures: InlineImageFailure[] = [];
  let current = 0;

  for (const [fullDataUri, { mimeType, base64Data }] of images) {
    current++;
    const format = (mimeType.split("/")[1] || "image").replace(/^svg\+xml$/, "svg").toUpperCase();
    try {
      // Decode base64 to binary byte array
      let byteCharacters: string;
      try {
        byteCharacters = atob(base64Data);
      } catch {
        throw new Error("the image data is damaged");
      }
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: mimeType });
      const ext = mimeType.split("/")[1] || "jpg";
      const file = new File(
        [blob],
        `doc-inline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`,
        { type: mimeType }
      );

      const fd = new FormData();
      fd.append("file", file);
      fd.append("context", "article_inline");

      const res = await fetch(`${base()}/api/media/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      }).catch(() => {
        throw new Error("the network connection failed");
      });

      if (!res.ok) throw new Error(await failureReason(res));
      const data = await res.json().catch(() => ({}));
      if (!data.url || typeof data.url !== "string") throw new Error("the server did not return a stored copy");
      processedHtml = processedHtml.split(fullDataUri).join(data.url);
    } catch (err) {
      failures.push({ index: current, format, reason: err instanceof Error && err.message ? err.message : "upload failed" });
    }
    onProgress?.(current, total);
  }

  if (failures.length > 0) throw new InlineImageUploadError(failures, total, processedHtml);
  return processedHtml;
}

/**
 * Safely parses a fetch Response as JSON with a clear fallback if the server
 * returns a non-JSON status page (such as 413 Request Entity Too Large or 504 Gateway Timeout).
 */
export async function safeJsonResponse<T = any>(res: Response, defaultErrorMessage = "Request failed"): Promise<T> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok) {
      throw new Error(data.error || data.message || defaultErrorMessage);
    }
    return data as T;
  } catch (err: any) {
    if (!res.ok) {
      if (res.status === 413 || text.includes("Request Entity Too Large")) {
        throw new Error("Your document contains large files or images that exceed upload limits. Please retry with optimized images.");
      }
      if (res.status === 415) {
        throw new Error("Unsupported media type. Please try again with standard image/document formats.");
      }
      if (res.status === 504 || res.status === 502) {
        throw new Error("The server took too long to process this request. Please try again.");
      }
      throw new Error(text.slice(0, 150) || `${defaultErrorMessage} (${res.status})`);
    }
    throw err;
  }
}
