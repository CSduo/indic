/** Lightweight shimmer skeleton shown while lazy-loaded page chunks download. */
export function PageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading page…"
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        padding: "3rem 1.5rem",
        maxWidth: "860px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: "2rem",
          width: "55%",
          borderRadius: "6px",
          background: "var(--skeleton-base, rgba(128,128,128,0.12))",
          animation: "skeletonShimmer 1.6s ease-in-out infinite",
          backgroundSize: "200% 100%",
        }}
      />
      {/* Subtitle */}
      <div
        style={{
          height: "1rem",
          width: "35%",
          borderRadius: "4px",
          background: "var(--skeleton-base, rgba(128,128,128,0.08))",
          animation: "skeletonShimmer 1.6s ease-in-out 0.1s infinite",
          backgroundSize: "200% 100%",
        }}
      />
      {/* Card row */}
      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginTop: "1rem" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: "1 1 220px",
              height: "180px",
              borderRadius: "10px",
              background: "var(--skeleton-base, rgba(128,128,128,0.09))",
              animation: `skeletonShimmer 1.6s ease-in-out ${i * 0.12}s infinite`,
              backgroundSize: "200% 100%",
            }}
          />
        ))}
      </div>
      {/* Text lines */}
      {[90, 78, 85, 60].map((w, i) => (
        <div
          key={i}
          style={{
            height: "0.8rem",
            width: `${w}%`,
            borderRadius: "4px",
            background: "var(--skeleton-base, rgba(128,128,128,0.07))",
            animation: `skeletonShimmer 1.6s ease-in-out ${0.2 + i * 0.08}s infinite`,
            backgroundSize: "200% 100%",
          }}
        />
      ))}
    </div>
  );
}
