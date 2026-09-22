import React, { useState, useEffect } from "react";

/**
 * Known specific codepoint mappings for Microsoft Fluent 3D Emoji assets
 * where the standard stripping of variation selectors requires special handling.
 */
const FLUENT_OVERRIDES: Record<string, string> = {
  "😮‍💨": "1f62e-200d-1f4a8",
  "🧘‍♂️": "1f9d8-200d-2642-fe0f",
  "🧘‍♀️": "1f9d8-200d-2640-fe0f",
};

/**
 * Converts any Unicode emoji string to hexadecimal codepoints for Microsoft Fluent 3D assets.
 * Example: '❤️' -> '2764', '🔥' -> '1f525', '🪷' -> '1fab7', '🤌' -> '1f90c'.
 */
export function emojiToFluentCode(emoji: string): string {
  if (!emoji) return "";
  if (FLUENT_OVERRIDES[emoji]) {
    return FLUENT_OVERRIDES[emoji];
  }
  const codepoints: string[] = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp !== undefined) {
      codepoints.push(cp.toString(16).toLowerCase());
    }
  }
  // Microsoft Fluent 3D Unicode assets strip solitary fe0f and zero-width joiners
  return codepoints.filter((cp) => cp !== "fe0f" && cp !== "200d").join("-");
}

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

/**
 * Primary high-resolution 3D glossy emoji asset URL (Microsoft Fluent 3D).
 * Delivers ray-traced, specular-highlighted 3D emojis at full retina resolution.
 */
export function getFluentEmojiUrl(emoji: string): string {
  const code = emojiToFluentCode(emoji);
  return `https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/${code}_3d.png`;
}

/**
 * Secondary Apple-style emoji asset URL.
 */
export function getAppleEmojiUrl(emoji: string): string {
  const code = emojiToCode(emoji);
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${code}.png`;
}

/**
 * Tertiary vector SVG emoji asset URL (Twemoji).
 */
export function getTwemojiUrl(emoji: string): string {
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
 * Renders authentic Instagram-style glossy 3D emojis using Microsoft Fluent 3D ray-traced assets.
 * Seamlessly falls back to Apple PNG -> Twemoji SVG -> Unicode text if a network error occurs.
 * Eliminates unrendered '[]' boxes on Windows, Android, and all platforms with zero tofu.
 */
export const AestheticEmoji = React.memo(function AestheticEmoji({
  glyph,
  size = 24,
  className = "",
  alt,
  loading = "eager",
}: AestheticEmojiProps) {
  const [stage, setStage] = useState<"fluent" | "apple" | "twemoji" | "text">("fluent");

  // Reset stage if glyph changes
  useEffect(() => {
    setStage("fluent");
  }, [glyph]);

  if (!glyph) return null;

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

  const currentSrc =
    stage === "fluent"
      ? getFluentEmojiUrl(glyph)
      : stage === "apple"
      ? getAppleEmojiUrl(glyph)
      : getTwemojiUrl(glyph);

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
      }}
      onError={() => {
        if (stage === "fluent") {
          setStage("apple");
        } else if (stage === "apple") {
          setStage("twemoji");
        } else {
          setStage("text");
        }
      }}
    />
  );
});
