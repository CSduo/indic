import React from 'react';

interface SkeletonTextProps {
  lines?: number;
  width?: 'full' | 'medium' | 'short';
}

export function SkeletonText({ lines = 1, width = 'full' }: SkeletonTextProps) {
  return (
    <div className={`skeleton-text skeleton-text--${width}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="skeleton-line skeleton-shimmer"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
