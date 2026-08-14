import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  put: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: fixture.put,
}));

import {
  extractSemanticHtml,
  getGoogleDocumentImport,
  isGoogleDocumentAccessPage,
} from "./extract-url";

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const DATA_PNG = `data:image/png;base64,${PNG_BYTES.toString("base64")}`;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
const originalCloudinaryUrl = process.env.CLOUDINARY_URL;

beforeEach(() => {
  fixture.put.mockReset();
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.CLOUDINARY_URL;
});

afterEach(() => {
  if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  if (originalCloudinaryUrl === undefined) delete process.env.CLOUDINARY_URL;
  else process.env.CLOUDINARY_URL = originalCloudinaryUrl;
});

describe("Google Docs URL import", () => {
  it("normalizes public share links and published-to-web links without treating the published marker as an id", () => {
    expect(getGoogleDocumentImport(
      "https://docs.google.com/document/u/0/d/abc_DEF-123/edit?usp=sharing",
    )).toEqual({
      fetchUrl: "https://docs.google.com/document/d/abc_DEF-123/export?format=html",
      kind: "shared",
    });
    expect(getGoogleDocumentImport(
      "https://docs.google.com/document/d/e/2PACX-1vExample_123/pub?embedded=true",
    )).toEqual({
      fetchUrl: "https://docs.google.com/document/d/e/2PACX-1vExample_123/pub",
      kind: "published",
    });
  });

  it("recognizes Google sign-in and permission shells before they are mistaken for document content", () => {
    expect(isGoogleDocumentAccessPage(
      "<html><head><title>Sign in - Google Accounts</title></head><body>Sign in to continue at accounts.google.com/ServiceLogin</body></html>",
    )).toBe(true);
    expect(isGoogleDocumentAccessPage(
      "<html><head><title>Google Docs</title></head><body>You need access to this document.</body></html>",
    )).toBe(true);
    expect(isGoogleDocumentAccessPage(
      "<html><body><p>Public document text about requesting access to archives.</p></body></html>",
    )).toBe(false);
  });

  it("persists a Google Docs base64 image through Blob and emits only the durable image URL", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";
    fixture.put.mockResolvedValue({ url: "https://blob.example/anvikshiki/imported.png" });

    const result = await extractSemanticHtml(
      `<html><body><p>Opening paragraph.</p><img src="${DATA_PNG}" alt="A diagram"></body></html>`,
      "https://docs.google.com/document/d/example/export?format=html",
    );

    expect(fixture.put).toHaveBeenCalledWith(
      expect.stringMatching(/^anvikshiki\/url_imports\/.+\.png$/),
      PNG_BYTES,
      expect.objectContaining({
        access: "public",
        contentType: "image/png",
        token: "test-blob-token",
      }),
    );
    expect(result.failedEmbeddedImages).toBe(0);
    expect(result.html).toContain('src="https://blob.example/anvikshiki/imported.png"');
    expect(result.html).not.toContain("data:image");
  });

  it("does not emit an embedded image when it cannot be stored", async () => {
    const result = await extractSemanticHtml(
      `<html><body><p>Opening paragraph.</p><img src="${DATA_PNG}" alt="A diagram"></body></html>`,
      "https://docs.google.com/document/d/example/export?format=html",
    );

    expect(result.failedEmbeddedImages).toBe(1);
    expect(result.html).not.toContain("data:image");
    expect(result.html).not.toContain("<img");
  });
});
