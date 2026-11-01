import React from 'react';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * EmptyState — drawn, slowly-pulsing pulse-line mark with solid natural sage stroke.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-[26px] border border-[#2F3A33] bg-[#1E2520] px-6 py-8 text-center">
      <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#151A17] border border-[#3B5946]">
        <svg viewBox="0 0 108 108" className="h-11 w-11 relative z-10">
          <path
            d="M26,54 L40,54 L47,36 L54,74 L61,54 L82,54"
            fill="none"
            stroke="#6BA37E"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse-line"
          />
        </svg>
      </div>
      <h4 className="font-heading text-base font-semibold text-[#F4F1EA]">{title}</h4>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#84877F]">{subtitle}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-xl bg-[#528B67] px-4 py-2 text-xs font-semibold text-[#F4F1EA] transition active:scale-95 hover:bg-[#5E9A74]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
