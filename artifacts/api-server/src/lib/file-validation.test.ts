import { describe, expect, it } from "vitest";
import { hasExpectedFileSignature } from "./file-validation";

describe("hasExpectedFileSignature", () => {
  it("accepts files whose bytes match their supported extension", () => {
    expect(hasExpectedFileSignature({
      originalname: "cover.png",
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    })).toBe(true);
    expect(hasExpectedFileSignature({
      originalname: "paper.pdf",
      buffer: Buffer.from("%PDF-1.7\n", "ascii"),
    })).toBe(true);
  });

  it("rejects spoofed, empty, binary text, and unsupported files", () => {
    expect(hasExpectedFileSignature({ originalname: "malware.png", buffer: Buffer.from("MZ") })).toBe(false);
    expect(hasExpectedFileSignature({ originalname: "empty.pdf", buffer: Buffer.alloc(0) })).toBe(false);
    expect(hasExpectedFileSignature({ originalname: "binary.txt", buffer: Buffer.from([65, 0, 66]) })).toBe(false);
    expect(hasExpectedFileSignature({ originalname: "archive.zip", buffer: Buffer.from("PK") })).toBe(false);
  });
});
