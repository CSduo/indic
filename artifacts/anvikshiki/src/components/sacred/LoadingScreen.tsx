import { useEffect, useState } from "react";

const WISDOM_QUOTES = [
  { text: "Satyam Eva Jayate", sub: "Truth alone triumphs" },
  { text: "Ātmānaṃ Viddhi", sub: "Know Thyself" },
  { text: "Charaivetī Charaivetī", sub: "Keep moving forward, always" },
  { text: "Tamaso Mā Jyotirgamaya", sub: "Lead me from darkness into light" },
];

export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [pct, setPct] = useState(0);
  const [fade, setFade] = useState(false);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * WISDOM_QUOTES.length));

  useEffect(() => {
    // Snappy, elegant 380ms progress curve
    const startTime = performance.now();
    const duration = 380;

    let animFrame: number;
    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic curve
      const eased = 1 - Math.pow(1 - progress, 3);
      setPct(Math.round(eased * 100));

      if (progress < 1) {
        animFrame = requestAnimationFrame(updateProgress);
      } else {
        setFade(true);
        setTimeout(() => onDone?.(), 300);
      }
    };

    animFrame = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animFrame);
  }, [onDone]);

  const currentQuote = WISDOM_QUOTES[quoteIdx];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ĀnvīkṢikī"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        color: "#FFFFFF",
        transition: "opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? "none" : "auto",
        padding: "2rem",
      }}
    >
      {/* Subtle ambient bloom */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200, 74, 16, 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: "420px", width: "100%" }}>
        {/* Brand Name */}
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            letterSpacing: "0.35em",
            color: "#FFFFFF",
            marginBottom: "0.4rem",
            fontWeight: 400,
            textTransform: "uppercase",
          }}
        >
          ĀNVĪKṢIKĪ
        </h1>

        {/* Subtitle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <span style={{ width: 20, height: 1, background: "#C84A10", opacity: 0.8 }} />
          <span
            className="font-ui"
            style={{
              fontSize: "0.62rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#A3A3A3",
              fontWeight: 600,
            }}
          >
            A Journal of Indic Ideas
          </span>
          <span style={{ width: 20, height: 1, background: "#C84A10", opacity: 0.8 }} />
        </div>

        {/* Dynamic Sanskrit quote */}
        <div style={{ minHeight: "48px", marginBottom: "2rem" }}>
          <p
            className="font-display"
            style={{
              fontSize: "1.05rem",
              color: "#E5E5E5",
              letterSpacing: "0.08em",
              marginBottom: "0.2rem",
              fontStyle: "italic",
            }}
          >
            "{currentQuote.text}"
          </p>
          <p
            className="font-ui"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#C84A10",
              opacity: 0.85,
            }}
          >
            {currentQuote.sub}
          </p>
        </div>

        {/* Progress bar container */}
        <div
          style={{
            width: "100%",
            maxWidth: "240px",
            margin: "0 auto 0.75rem",
            height: "2px",
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: "2px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "linear-gradient(90deg, #C84A10, #E07A5F, #FFB703)",
              transition: "width 0.05s linear",
              borderRadius: "2px",
              boxShadow: "0 0 8px rgba(200, 74, 16, 0.6)",
            }}
          />
        </div>

        {/* Progress percentage counter */}
        <div
          className="font-ui"
          style={{
            fontSize: "0.62rem",
            letterSpacing: "0.2em",
            color: "#525252",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pct}%
        </div>
      </div>
    </div>
  );
}
