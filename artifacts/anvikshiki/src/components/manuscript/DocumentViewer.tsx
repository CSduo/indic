import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export function DocumentViewer({ url, title }: { url: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [containerWidth, setContainerWidth] = useState(820);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const width = Math.floor(entries[0]?.contentRect.width || 820);
      setContainerWidth(Math.max(280, width - 2));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setPageNumber(1);

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url,
        ).toString();
        const loadingTask = pdfjs.getDocument({ url });
        loadingTaskRef.current = loadingTask;
        const document = await loadingTask.promise;
        if (cancelled) {
          await loadingTask.destroy();
          return;
        }
        documentRef.current = document;
        setPageCount(document.numPages);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
      void loadingTaskRef.current?.destroy?.();
      loadingTaskRef.current = null;
      documentRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    const document = documentRef.current;
    const canvas = canvasRef.current;
    if (!document || !canvas || !pageCount) return;
    let cancelled = false;

    void (async () => {
      const page = await document.getPage(pageNumber);
      if (cancelled) return;
      const initialViewport = page.getViewport({ scale: 1 });
      const cssScale = Math.min(containerWidth / initialViewport.width, 1.6);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const renderViewport = page.getViewport({ scale: cssScale * pixelRatio });
      const cssViewport = page.getViewport({ scale: cssScale });
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;

      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      canvas.style.width = `${Math.ceil(cssViewport.width)}px`;
      canvas.style.height = `${Math.ceil(cssViewport.height)}px`;
      renderTaskRef.current?.cancel?.();
      const task = page.render({ canvas, canvasContext: context, viewport: renderViewport });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (renderError: unknown) {
        if (!(renderError instanceof Error) || renderError.name !== "RenderingCancelledException") setError(true);
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [containerWidth, pageCount, pageNumber]);

  return (
    <section className="document-viewer" aria-label={`${title} document viewer`}>
      <div className="document-viewer-toolbar">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ink p-2"
            onClick={() => setPageNumber(page => Math.max(1, page - 1))}
            disabled={pageNumber <= 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="font-ui text-xs text-[var(--ink-soft)]" aria-live="polite">
            {pageCount ? `Page ${pageNumber} of ${pageCount}` : "Loading document"}
          </span>
          <button
            type="button"
            className="btn-ink p-2"
            onClick={() => setPageNumber(page => Math.min(pageCount, page + 1))}
            disabled={!pageCount || pageNumber >= pageCount || loading}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ink p-2" aria-label="Open document in a new tab">
            <ExternalLink size={14} />
          </a>
          <a href={url} download className="btn-ink p-2" aria-label="Download document">
            <Download size={14} />
          </a>
        </div>
      </div>
      <div ref={containerRef} className="document-viewer-stage" aria-busy={loading}>
        {loading && <p className="font-ui text-xs text-[var(--ink-faint)]">Loading document…</p>}
        {error ? (
          <div className="p-6 text-center">
            <p className="font-body text-[var(--ink-soft)]">This document cannot be previewed here.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-terracotta mt-4">Open document</a>
          </div>
        ) : (
          <canvas ref={canvasRef} className={loading ? "invisible" : "document-viewer-canvas"} />
        )}
      </div>
    </section>
  );
}
