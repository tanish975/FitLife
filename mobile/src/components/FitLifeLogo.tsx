import React from 'react';

/** Original, scalable dumbbell mark: deliberately legible at launcher size. */
export const FitLifeLogo: React.FC<{ className?: string; decorative?: boolean }> = ({ className = '', decorative = true }) => (
  <svg className={`fitlife-logo ${className}`} viewBox="0 0 64 64" role={decorative ? undefined : 'img'} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : 'FitLife fitness'} focusable="false">
    <circle className="fitlife-logo-base" cx="32" cy="32" r="27" />
    <g className="fitlife-logo-accent" transform="rotate(-35 32 32)">
      <rect x="18" y="29.5" width="28" height="5" rx="2.5" />
      <rect x="14.5" y="23" width="6" height="18" rx="2.5" />
      <rect x="10.5" y="26.5" width="4" height="11" rx="2" />
      <rect x="43.5" y="23" width="6" height="18" rx="2.5" />
      <rect x="49.5" y="26.5" width="4" height="11" rx="2" />
    </g>
  </svg>
);
