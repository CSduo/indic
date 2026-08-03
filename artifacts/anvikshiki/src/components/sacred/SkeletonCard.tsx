import React from 'react';
import { SkeletonText } from './SkeletonText';

interface SkeletonCardProps {
  variant?: 'article-card' | 'domain-card' | 'profile-card';
  count?: number;
}

export function SkeletonCard({ variant = 'article-card', count = 1 }: SkeletonCardProps) {
  const cards = Array.from({ length: count }, (_, i) => i);
  
  return (
    <>
      {cards.map((i) => (
        <div key={i} className={`skeleton-card skeleton-card--${variant}`}>
          {variant === 'article-card' && (
            <>
              <div className="skeleton-image skeleton-shimmer"></div>
              <div className="skeleton-content">
                <div className="skeleton-tag skeleton-shimmer"></div>
                <SkeletonText lines={2} width="full" />
                <div className="skeleton-date skeleton-shimmer"></div>
              </div>
            </>
          )}
          {variant === 'domain-card' && (
            <>
              <div className="skeleton-circle skeleton-shimmer"></div>
              <SkeletonText lines={1} width="medium" />
            </>
          )}
          {variant === 'profile-card' && (
            <>
              <div className="skeleton-avatar skeleton-shimmer"></div>
              <div className="skeleton-content">
                <SkeletonText lines={1} width="medium" />
                <SkeletonText lines={2} width="full" />
              </div>
            </>
          )}
        </div>
      ))}
    </>
  );
}
