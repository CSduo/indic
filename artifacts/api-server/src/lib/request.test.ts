import { describe, expect, it } from "vitest";
import { parsePagination, toLikePattern } from "./request";

describe("parsePagination", () => {
  it("clamps limits and offsets to safe bounds", () => {
    expect(parsePagination("500", "-4", { defaultLimit: 20, maxLimit: 50 })).toEqual({ limit: 50, offset: 0 });
    expect(parsePagination("0", "12")).toEqual({ limit: 1, offset: 12 });
    expect(parsePagination("invalid", undefined)).toEqual({ limit: 20, offset: 0 });
  });
});

describe("toLikePattern", () => {
  it("escapes wildcard input and enforces the search length cap", () => {
    expect(toLikePattern(" 100%_match ")).toBe("%100\\%\\_match%");
    expect(toLikePattern("x".repeat(250), 20)).toBe(`%${"x".repeat(20)}%`);
  });
});
