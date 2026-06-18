import { Emblem } from "./Emblem";

interface WordmarkProps {
  size?: "sm" | "md" | "lg";
  showDevanagari?: boolean;
  className?: string;
}

const sizes = {
  sm: { emblem: 28, devanagari: "text-lg", roman: "text-xs" },
  md: { emblem: 36, devanagari: "text-2xl", roman: "text-sm" },
  lg: { emblem: 48, devanagari: "text-3xl", roman: "text-base" },
};

export function Wordmark({ size = "md", showDevanagari = true, className = "" }: WordmarkProps) {
  const s = sizes[size];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Emblem size={s.emblem} />
      <div className="flex flex-col leading-none">
        {showDevanagari && (
          <span
            className={`${s.devanagari} font-semibold`}
            style={{ fontFamily: "var(--font-deva)", color: "var(--gold)", letterSpacing: "0.02em" }}
          >
            आन्वीक्षिकी
          </span>
        )}
        <span
          className={`${s.roman} font-medium tracking-[0.2em] uppercase`}
          style={{ fontFamily: "var(--font-ui)", color: "var(--gold)", opacity: 0.85 }}
        >
          Ānvīkṣikī
        </span>
      </div>
    </div>
  );
}
