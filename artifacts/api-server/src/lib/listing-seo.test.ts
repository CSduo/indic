import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";
import { effectiveSeoDescription, effectiveTopics } from "./effective-seo";
import { listingSeoFor } from "./public-content";

// Every listing page, and the related essays under every essay, lists all
// published works with their descriptions and topics. Those are derived from
// each work's body, so the listing reads only a hash of each body and fetches
// a body only for a version it has not described yet.

const md5 = (text: string) => createHash("md5").update(text).digest("hex");

const BODIES: Record<string, string> = {
  "listing-a": "<p>Champa, the Hindu kingdom of central Vietnam, built temples at Mỹ Sơn for a thousand years.</p>",
  "listing-b": "<p>Girmit labourers arrived in Fiji from 1879, and by 1946 Indo-Fijians outnumbered indigenous Fijians.</p>",
};

function listed(id: string, updatedAt = "2026-08-01T00:00:00.000Z", body = BODIES[id]) {
  return { id, slug: `${id}-slug`, title: `Essay ${id}`, excerpt: null, updatedAt, bodyHash: md5(body) };
}

function loader(bodies: Record<string, string> = BODIES) {
  return vi.fn(async (_kind: string, ids: string[]) => new Map(ids.map((id) => [id, bodies[id] ?? null])));
}

describe("listing descriptions and topics", () => {
  it("read a body only for a version not described yet", async () => {
    const first = loader();
    const rows = [listed("listing-a"), listed("listing-b")];
    const seo = await listingSeoFor("article", rows, first);
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0][1]).toEqual(["listing-a", "listing-b"]);
    rows.forEach((row, i) => {
      const full = { ...row, body: BODIES[row.id] };
      expect(seo[i]).toEqual({ description: effectiveSeoDescription(full, "article"), topics: effectiveTopics(full) });
    });

    const again = loader();
    expect(await listingSeoFor("article", rows, again)).toEqual(seo);
    expect(again).not.toHaveBeenCalled();

    // An edit is a new version: only that work's body is read again.
    const edited = `${BODIES["listing-b"]}<p>The 1987 coups followed.</p>`;
    const afterEdit = loader({ ...BODIES, "listing-b": edited });
    const updated = [rows[0], listed("listing-b", "2026-09-01T00:00:00.000Z", edited)];
    const next = await listingSeoFor("article", updated, afterEdit);
    expect(afterEdit.mock.calls.map((call) => call[1])).toEqual([["listing-b"]]);
    expect(next[0]).toEqual(seo[0]);
    expect(next[1]).toEqual({
      description: effectiveSeoDescription({ ...updated[1], body: edited }, "article"),
      topics: effectiveTopics({ ...updated[1], body: edited }),
    });
  });

  it("use a body already at hand without reading it again", async () => {
    const load = loader();
    const row = { id: "listing-c", slug: "listing-c", title: "Essay C", updatedAt: "2026-08-02T00:00:00.000Z", body: BODIES["listing-a"] };
    const [seo] = await listingSeoFor("article", [row], load);
    expect(load).not.toHaveBeenCalled();
    expect(seo.description).toBe(effectiveSeoDescription(row, "article"));
  });
});
