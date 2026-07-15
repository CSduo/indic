import { describe, expect, it } from "vitest";
import { recoverLegacyInlineImages } from "./legacy-content";

describe("recoverLegacyInlineImages", () => {
  it("restores missing image sources in document order", () => {
    const body = '<p>One</p><img width="450"><p>Two</p><img src="" height="567">';
    const result = recoverLegacyInlineImages("the-transatlantic-slave-trade-4e607526", body);

    expect(result).toContain('/01.jpg" width="450"');
    expect(result).toContain('/02.jpg" height="567"');
  });

  it("does not overwrite an image source that was repaired in the database", () => {
    const body = '<img src="https://res.cloudinary.com/example/already-fixed.jpg"><img width="541">';
    const result = recoverLegacyInlineImages("the-transatlantic-slave-trade-4e607526", body);

    expect(result).toContain("already-fixed.jpg");
    expect(result).toContain('/02.jpg" width="541"');
  });

  it("leaves unrelated articles unchanged", () => {
    const body = '<img width="450">';
    expect(recoverLegacyInlineImages("another-article", body)).toBe(body);
  });
});
