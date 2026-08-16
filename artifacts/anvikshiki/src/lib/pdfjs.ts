/**
 * Shared pdf.js loader.
 *
 * pdf.js does its parsing in a web worker, and the worker script has to be
 * fetched at runtime. The previous setup pointed at it with
 *
 *     new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url)
 *
 * which looks right but is not: `new URL(…, import.meta.url)` only resolves
 * *relative* paths. A bare package specifier like "pdfjs-dist/…" is left
 * untouched, so in a production build it resolved to a path under the hashed
 * asset directory that nothing was ever emitted to. The worker 404'd, pdf.js
 * rejected, and the reader was told only that extraction had failed.
 *
 * The `?url` suffix makes Vite emit the worker as a real asset and hand back
 * its final hashed URL, which is correct in dev and in production alike.
 */

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

export function loadPdfjs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const [pdfjs, workerUrl] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.mjs?url").then(m => m.default),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })().catch(err => {
      // Allow a later attempt rather than caching the failure forever.
      pdfjsPromise = null;
      throw err;
    });
  }
  return pdfjsPromise;
}
