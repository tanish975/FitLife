import React from 'react';

interface ShimmerProps {
  count?: number;
}

/**
 * Shimmer — skeleton placeholders while search loads, sized to match
 * the real result cards so nothing jumps when data lands.
 */
export const Shimmer: React.FC<ShimmerProps> = ({ count = 4 }) => {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="relative overflow-hidden rounded-[22px] border border-[#2F3A33] bg-[#1E2520] p-4 h-[78px] flex items-center justify-between"
        >
          <div className="space-y-2.5 flex-1 pr-4">
            <div className="h-4 w-3/5 rounded-lg bg-[#2A332D] shimmer-pulse" />
            <div className="h-3 w-2/5 rounded-md bg-[#252E28] shimmer-pulse" />
          </div>
          <div className="h-9 w-20 rounded-xl bg-[#2A332D] shimmer-pulse" />
        </div>
      ))}
    </div>
  );
};
