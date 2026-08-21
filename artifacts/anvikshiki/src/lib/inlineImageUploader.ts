const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Scans an HTML string for embedded base64 images, uploads each image individually
 * to the media storage API, and replaces the data URI with the permanent CDN URL.
 *
 * This prevents massive (>4.5MB) payloads when submitting extracted documents to Vercel.
 */
export async function uploadInlineBase64Images(
  html: string,
  onProgress?: (current: number, total: number) => void,
): Promise<string> {
  if (!html || !html.includes("data:image/")) return html;

  // Match all data:image base64 sources
  const dataUriRegex = /src=["'](data:(image\/[a-zA-Z0-9+.-]+);base64,([^"']+))["']/gi;
  const matches = [...html.matchAll(dataUriRegex)];
  if (matches.length === 0) return html;

  let processedHtml = html;
  const total = matches.length;
  let current = 0;

  for (const match of matches) {
    const fullDataUri = match[1];
    const mimeType = match[2];
    const base64Data = match[3];

    try {
      // Decode base64 to binary byte array
      const byteCharacters = atob(base64Data);
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
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.url && typeof data.url === "string") {
          processedHtml = processedHtml.split(fullDataUri).join(data.url);
        }
      }
    } catch (err) {
      console.warn("Failed to upload inline base64 image:", err);
    }

    current++;
    onProgress?.(current, total);
  }

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
