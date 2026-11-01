import React from 'react';
import { PressScale } from './PressScale';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  badge?: string | number;
}

interface SegmentedSelectorProps<T extends string> {
  options: SegmentOption<T>[];
  selected: T | null;
  onChange: (value: T, origin: HTMLElement) => void;
  scrollable?: boolean;
  size?: 'sm' | 'md';
  /** Marks the two appearance options for the non-interactive WebView snapshot. */
  themePreview?: boolean;
}

/**
 * SegmentedSelector — chips spring on selection, labels cross-fade with a solid natural sage pill.
 */
export function SegmentedSelector<T extends string>({
  options,
  selected,
  onChange,
  scrollable = false,
  size = 'md',
  themePreview = false,
}: SegmentedSelectorProps<T>) {
  return (
    <div
      className={`${
        scrollable
          ? 'flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1'
          : 'grid rounded-2xl border border-[#2F3A33] bg-[#141916] p-1'
      }`}
      style={
        !scrollable
          ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <PressScale
            key={opt.value}
            scaleDown={0.93}
            ariaPressed={isActive}
            onClick={(event) => onChange(opt.value, event.currentTarget)}
            className={`${scrollable ? 'shrink-0' : ''}`}
          >
            <div
              data-fitlife-theme-choice={themePreview ? opt.value : undefined}
              className={`relative flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl font-medium transition-colors duration-150 ${
                size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
              } ${
                isActive
                  ? 'bg-[#528B67] text-[#F4F1EA] font-semibold shadow-sm scale-[1.02]'
                  : scrollable
                  ? 'border border-[#2F3A33] bg-[#1E2520] text-[#B8B5AD] hover:text-[#F4F1EA]'
                  : 'text-[#84877F] hover:text-[#F4F1EA]'
              }`}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                ...(isActive ? { backgroundColor: 'var(--accent-primary-text)', color: 'var(--bg-base)' } : {}),
              }}
            >
              <span className="truncate">{opt.label}</span>
              {opt.badge !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    isActive ? 'bg-[#151A17]/35 text-[#F4F1EA]' : 'bg-[#2A332D] text-[#B8B5AD]'
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </div>
          </PressScale>
        );
      })}
    </div>
  );
}
