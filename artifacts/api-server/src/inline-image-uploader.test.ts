import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

// The submit pages upload a document's embedded images one by one before
// saving it (artifacts/anvikshiki/src/lib/inlineImageUploader.ts). An image
// that failed used to stay in the document as a data URI with no word to the
// author, until the save was refused for "unresolved images".
const modulePath = path.resolve(__dirname, "../../anvikshiki/src/lib/inlineImageUploader.ts");

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uploading a document's embedded images", () => {
  it("replaces every copy of each uploaded image and uploads a repeated image once", async () => {
    const { uploadInlineBase64Images } = await import(/* @vite-ignore */ modulePath);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(200, { url: "https://cdn.example/one.png" }))
      .mockResolvedValueOnce(json(200, { url: "https://cdn.example/two.jpeg" }));
    vi.stubGlobal("fetch", fetchMock);

    const html = `<p><img src="${PNG}"></p><p><img src="${JPEG}"></p><p><img src='${PNG}'></p>`;
    const out = await uploadInlineBase64Images(html);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out).not.toContain("data:image");
    expect(out.match(/one\.png/g)).toHaveLength(2);
    expect(out).toContain("https://cdn.example/two.jpeg");
  });

  it("names each image that could not be uploaded, and why, instead of keeping it silently", async () => {
    const { uploadInlineBase64Images, InlineImageUploadError } = await import(/* @vite-ignore */ modulePath);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json(200, { url: "https://cdn.example/one.png" }))
      .mockResolvedValueOnce(json(413, { error: "Images must be 10 MB or smaller." }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch")));

    const html = `<img src="${PNG}"><img src="${JPEG}"><img src="data:image/gif;base64,R0lGODlh">`;
    const error = await uploadInlineBase64Images(html).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InlineImageUploadError);
    expect(error.total).toBe(3);
    expect(error.failures).toEqual([
      { index: 2, format: "JPEG", reason: "Images must be 10 MB or smaller" },
      { index: 3, format: "GIF", reason: "the network connection failed" },
    ]);
    expect(error.message).toBe(
      "2 of 3 images in your document could not be uploaded: image 2 (JPEG): Images must be 10 MB or smaller; " +
        "image 3 (GIF): the network connection failed. Replace or remove them, then try again.",
    );
    // What did upload is kept, so a retry only needs the failures.
    expect(error.html).toContain("https://cdn.example/one.png");
    expect(error.html).toContain(JPEG);
  });

  it("reports damaged image data without sending it", async () => {
    const { uploadInlineBase64Images } = await import(/* @vite-ignore */ modulePath);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const error = await uploadInlineBase64Images(`<img src="data:image/png;base64,***">`).catch((e: any) => e);
    expect(error.failures).toEqual([{ index: 1, format: "PNG", reason: "the image data is damaged" }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves a document without embedded images untouched", async () => {
    const { uploadInlineBase64Images } = await import(/* @vite-ignore */ modulePath);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const html = `<p>Text <img src="https://cdn.example/a.png"></p>`;
    expect(await uploadInlineBase64Images(html)).toBe(html);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
