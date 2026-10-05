import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialDataScript, serializeInitialData } from "./lib/ssr-html";

/*
  The SPA's reader for the server's __INITIAL_DATA__ block
  (artifacts/anvikshiki/src/lib/initialData.ts). It decides whether a page
  renders the server's content first, and whether the client leaves the
  server's <head> alone, so it is tested here against the exact markup the
  server emits. The module caches what it parsed, so each case loads a fresh
  copy with a stubbed document and location.
*/
const CLIENT_MODULE = path.resolve(__dirname, "../../anvikshiki/src/lib/initialData.ts");

async function loadClient(html: string | null, pathname: string) {
  vi.resetModules();
  const textContent = html?.match(/<script id="__INITIAL_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  vi.stubGlobal("document", {
    getElementById: (id: string) => (id === "__INITIAL_DATA__" && textContent !== undefined ? { textContent } : null),
  });
  vi.stubGlobal("window", { location: { pathname } });
  return import(/* @vite-ignore */ CLIENT_MODULE);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const archiveBlock = initialDataScript({
  route: "archive",
  path: "/archive",
  data: { page: 1, works: [{ title: "</script><script>alert(1)</script> & more " }] },
  site: { papers: false },
});

describe("SPA initial data reader", () => {
  it("returns the server's data for its route while on the rendered path", async () => {
    const client = await loadClient(archiveBlock, "/archive/");
    const data = client.readInitialData("archive");
    expect(data.works[0].title).toBe("</script><script>alert(1)</script> & more ");
    expect(client.isServerRenderedPath()).toBe(true);
    expect(client.readInitialData("home")).toBeUndefined();
  });

  it("ignores the payload after navigating to another path, but keeps site facts", async () => {
    const client = await loadClient(archiveBlock, "/about");
    expect(client.readInitialData("archive")).toBeUndefined();
    expect(client.isServerRenderedPath()).toBe(false);
    expect(client.readSiteFacts()).toEqual({ papers: false });
  });

  it("compares encoded and decoded spellings of the same path as equal", async () => {
    const decoded = "/articles/ānvīkṣikī-essay";
    const encoded = encodeURI(decoded);
    for (const [serverPath, browserPath] of [[decoded, encoded], [encoded, encoded], [encoded, decoded]]) {
      const block = initialDataScript({ route: "article", path: serverPath, data: { slug: "x" } });
      const client = await loadClient(block, browserPath);
      expect(client.readInitialData("article"), `${serverPath} vs ${browserPath}`).toEqual({ slug: "x" });
    }
  });

  it("treats a page without a payload (the SPA shell) as client-rendered", async () => {
    const client = await loadClient(null, "/search");
    expect(client.readInitialData("archive")).toBeUndefined();
    expect(client.isServerRenderedPath()).toBe(false);
    expect(client.readSiteFacts()).toBeUndefined();
  });

  it("survives a malformed block", async () => {
    const client = await loadClient('<script id="__INITIAL_DATA__" type="application/json">{not json</script>', "/");
    expect(client.readInitialData("home")).toBeUndefined();
    expect(client.isServerRenderedPath()).toBe(false);
  });

  it("the serialized block cannot close its own script element", () => {
    expect(serializeInitialData({ html: "</script>" })).not.toContain("</script>");
    expect(archiveBlock.match(/<\/script>/g)).toHaveLength(1);
  });
});
