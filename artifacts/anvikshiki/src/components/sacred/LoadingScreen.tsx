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
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    setQuoteIdx(Math.floor(Math.random() * WISDOM_QUOTES.length));
    const steps = [15, 35, 60, 82, 100];
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        setPct(steps[i++]);
        setTimeout(tick, i === steps.length ? 150 : 250 + Math.random() * 150);
      } else {
        setFade(true);
        setTimeout(() => onDone?.(), 550);
      }
    };
    const timer = setTimeout(tick, 200);
    return () => clearTimeout(timer);
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
        transition: "opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
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
            Journal &amp; Research Platform
          </span>
          <span style={{ width: 20, height: 1, background: "#C84A10", opacity: 0.8 }} />
        </div>

        {/* Glowing Progress Bar */}
        <div style={{ width: "100%", maxWidth: "240px", margin: "0 auto 1.5rem" }}>
          <div
            style={{
              height: "2px",
              background: "#1F1F1F",
              borderRadius: "4px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #C84A10, #E06020)",
                width: `${pct}%`,
                transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 0 12px rgba(200, 74, 16, 0.8)",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>

        {/* Quote & Progress text */}
        <p
          className="font-body"
          style={{
            fontSize: "0.82rem",
            color: "#D4D4D4",
            fontStyle: "italic",
            marginBottom: "0.25rem",
          }}
        >
          "{currentQuote.sub}"
        </p>
        <p
          className="font-ui"
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#737373",
          }}
        >
          {currentQuote.text} · {pct}%
        </p>
      </div>
    </div>
  );
}

