/*
  Server-rendered pages embed the data they were built from:

    <script id="__INITIAL_DATA__" type="application/json">
      {"route":"home","path":"/","data":{...}}
    </script>

  Pages read it here so their first render shows the same content the server
  sent, instead of an empty state that a failed or blocked request would leave
  in place. The payload belongs to one URL path: after client-side navigation
  to another path it no longer applies and readInitialData returns undefined.
*/

export interface InitialDataEnvelope {
  route: string;
  path: string;
  data: unknown;
  /** Site-wide facts (not tied to the path), e.g. whether any paper is published. */
  site?: { papers?: boolean };
}

let parsed: InitialDataEnvelope | null | undefined;

function envelope(): InitialDataEnvelope | null {
  if (parsed !== undefined) return parsed;
  parsed = null;
  if (typeof document === "undefined") return parsed;
  try {
    const element = document.getElementById("__INITIAL_DATA__");
    const value = element?.textContent ? JSON.parse(element.textContent) : null;
    if (value && typeof value.route === "string" && typeof value.path === "string") {
      parsed = value as InitialDataEnvelope;
    }
  } catch {
    parsed = null;
  }
  return parsed;
}

export function normalizePath(path: string): string {
  let value = path || "/";
  try {
    value = decodeURI(value);
  } catch {
    // Keep the raw path.
  }
  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

function onServerRenderedPath(payload: InitialDataEnvelope): boolean {
  return typeof window !== "undefined" &&
    normalizePath(window.location.pathname) === normalizePath(payload.path);
}

/** The server's data for `route`, while the visitor is still on the path it was rendered for. */
export function readInitialData<T>(route: string): T | undefined {
  const payload = envelope();
  if (!payload || payload.route !== route || !onServerRenderedPath(payload)) return undefined;
  return payload.data as T;
}

/** Whether the current path arrived as a server-rendered page (with its own metadata). */
export function isServerRenderedPath(): boolean {
  const payload = envelope();
  return Boolean(payload && onServerRenderedPath(payload));
}

/**
 * Site-wide facts from the server-rendered page the visit started on. They do
 * not depend on the path, so they stay usable after client-side navigation.
 * Undefined when the visit started on a page the server did not render.
 */
export function readSiteFacts(): InitialDataEnvelope["site"] | undefined {
  return envelope()?.site;
}
