import { describe, expect, it } from "vitest";
import { pickSlugRedirect } from "./publication-lookup";

const CURRENT = "beyond-angkor-why-is-vietnam-frequently-excluded-from-the-history-of-hindu-influence-in-southeast-asia-86ef8134";

describe("pickSlugRedirect", () => {
  it("sends a shortened slug to the one published slug that extends it", () => {
    expect(pickSlugRedirect("beyond-angkor-why-is-vietnam-frequently-excluded", [CURRENT])).toBe(CURRENT);
  });

  it("matches hash-suffix variants", () => {
    expect(pickSlugRedirect("some-essay-1a2b3c4d", ["some-essay"])).toBe("some-essay");
    expect(pickSlugRedirect("some-essay-1a2b", ["some-essay-1a2b3c4d"])).toBe("some-essay-1a2b3c4d");
    expect(pickSlugRedirect("some-essay-9999ffff", ["some-essay-1a2b3c4d"])).toBe("some-essay-1a2b3c4d");
  });

  it("gives up when the match is ambiguous or absent", () => {
    expect(pickSlugRedirect("some-essay", ["some-essay-one", "some-essay-two"])).toBeNull();
    expect(pickSlugRedirect("some-essay", [])).toBeNull();
    expect(pickSlugRedirect("some-essay", ["some-essay"])).toBeNull();
    expect(pickSlugRedirect("some", ["something-else"])).toBeNull();
  });
});
