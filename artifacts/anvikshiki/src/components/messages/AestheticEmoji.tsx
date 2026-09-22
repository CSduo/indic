import React, { useState } from "react";

/**
 * Converts any Unicode emoji string to hexadecimal codepoints used by Apple / Twemoji datasources.
 * Example: '❤️' -> '2764-fe0f', '🪷' -> '1fab7', '🤌' -> '1f90c', '🔥' -> '1f525'.
 */
export function emojiToCode(emoji: string): string {
  if (!emoji) return "";
  const codepoints: string[] = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp !== undefined) {
      codepoints.push(cp.toString(16).toLowerCase());
    }
  }
  let code = codepoints.join("-");
  // Normalize heart if solitary variation selector was omitted
  if (code === "2764") {
    code = "2764-fe0f";
  }
  return code;
}

export function getAppleEmojiUrl(emoji: string): string {
  const code = emojiToCode(emoji);
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${code}.png`;
}

export function getTwemojiUrl(emoji: string): string {
  // Twemoji strips solitary variation selector fe0f in standard SVGs
  const code = emojiToCode(emoji).replace(/-fe0f$/, "");
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`;
}

interface AestheticEmojiProps {
  glyph: string;
  size?: number;
  className?: string;
  alt?: string;
  loading?: "eager" | "lazy";
}

/**
 * Renders authentic Instagram / Apple-style glossy 3D emojis.
 * Eliminates unrendered '[]' boxes on Windows and all platforms with zero tofu.
 */
export const AestheticEmoji = React.memo(function AestheticEmoji({
  glyph,
  size = 24,
  className = "",
  alt,
  loading = "eager",
}: AestheticEmojiProps) {
  const [stage, setStage] = useState<"apple" | "twemoji" | "text">("apple");

  if (!glyph) return null;

  const appleSrc = getAppleEmojiUrl(glyph);
  const twemojiSrc = getTwemojiUrl(glyph);

  if (stage === "text") {
    return (
      <span
        className={`inline-block select-none leading-none ${className}`}
        style={{ fontSize: `${size}px` }}
        role="img"
        aria-label={alt || glyph}
      >
        {glyph}
      </span>
    );
  }

  const currentSrc = stage === "apple" ? appleSrc : twemojiSrc;

  return (
    <img
      src={currentSrc}
      alt={alt || glyph}
      width={size}
      height={size}
      loading={loading}
      decoding="async"
      draggable={false}
      className={`inline-block select-none object-contain pointer-events-none transition-transform duration-100 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        verticalAlign: "-0.18em",
        imageRendering: "-webkit-optimize-contrast",
      }}
      onError={() => {
        if (stage === "apple") {
          setStage("twemoji");
        } else {
          setStage("text");
        }
      }}
    />
  );
});
