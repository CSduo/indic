import { describe, expect, it } from "vitest";
import { sanitizeArticleBody, sanitizeOptionalArticleBody } from "./content";

describe("sanitizeArticleBody", () => {
  it("removes executable markup and unsafe URL schemes", () => {
    const result = sanitizeArticleBody(`
      <script>alert(1)</script>
      <p onclick="alert(2)">Safe text</p>
      <a href="javascript:alert(3)" target="_blank">bad link</a>
      <img src="javascript:alert(4)" onerror="alert(5)">
    `);

    expect(result).not.toContain("<script");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("onerror");
    expect(result).toContain("Safe text");
  });

  it("preserves supported long-form formatting and hardens external content", () => {
    const result = sanitizeArticleBody(`
      <h2 id="argument">Argument</h2>
      <blockquote><strong>Quoted</strong> text</blockquote>
      <a href="https://example.com" target="_blank">Source</a>
      <img src="https://example.com/image.jpg" alt="Illustration">
      <audio src="https://example.com/reading.mp3"></audio>
      <table><tbody><tr><th scope="col">Idea</th><td>Nyāya</td></tr></tbody></table>
    `);

    expect(result).toContain('<h2 id="argument">');
    expect(result).toContain("<blockquote>");
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('loading="lazy"');
    expect(result).toContain('decoding="async"');
    expect(result).toContain('controls="controls"');
    expect(result).toContain('preload="metadata"');
    expect(result).toContain("<table>");
  });

  it("handles absent and non-string legacy values safely", () => {
    expect(sanitizeArticleBody(null)).toBe("");
    expect(sanitizeOptionalArticleBody(undefined)).toBeUndefined();
  });
});
