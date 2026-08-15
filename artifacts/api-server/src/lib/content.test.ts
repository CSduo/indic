import { describe, expect, it } from "vitest";
import { countUnresolvedArticleImages, sanitizeArticleBody, sanitizeOptionalArticleBody } from "./content";

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

  it("removes empty image placeholders while keeping valid relative images", () => {
    const result = sanitizeArticleBody(`
      <p>Before</p>
      <img width="450" height="340">
      <img src="" width="541" height="567">
      <img src="/images/articles/recovered.jpg" alt="Recovered">
      <p>After</p>
    `);

    expect(result).not.toContain('width="450"');
    expect(result).not.toContain('width="541"');
    expect(result).toContain('src="/images/articles/recovered.jpg"');
  });

  it("keeps inline base64 media, which is what the upload fallback produces", () => {
    const result = sanitizeArticleBody(`
      <img src="data:image/png;base64,iVBORw0KGgo=" alt="Inline figure">
      <audio src="data:audio/webm;base64,GkXfo0="></audio>
    `);

    expect(result).toContain("data:image/png;base64,");
    expect(result).toContain("data:audio/webm;base64,");
  });

  it("drops data URIs that could carry script or a non-media payload", () => {
    const result = sanitizeArticleBody(`
      <img src="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Lz48L3N2Zz4=">
      <img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">
    `);

    expect(result).not.toContain("svg+xml");
    expect(result).not.toContain("text/html");
  });

  it("detects images that would lose their source during sanitization", () => {
    // Absolute, site-relative, and inline base64 sources all survive a round
    // trip through the database. Only browser-local schemes are unresolved.
    expect(countUnresolvedArticleImages(`
      <img src="https://res.cloudinary.com/example/one.jpg">
      <img src="/api/uploads/two.jpg">
      <img src="data:image/png;base64,abc">
      <img src="file:///C:/temporary/three.jpg">
      <img width="450">
    `)).toBe(1);

    expect(countUnresolvedArticleImages(`
      <img src="blob:https://example.com/9f8b-4c1d">
      <img src="file:///C:/temporary/three.jpg">
    `)).toBe(2);
  });
});
