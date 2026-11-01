import React from 'react';

interface PressScaleProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  scaleDown?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
  role?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
}

/** Lightweight press feedback. CSS handles the pressed state so a swipe across
 * a card never causes pointer-down/pointer-up React renders while scrolling. */
export const PressScale: React.FC<PressScaleProps> = ({
  children,
  onClick,
  className = '',
  scaleDown = 0.965,
  disabled = false,
  style,
  role,
  ariaLabel,
  ariaPressed,
}) => (
  <div
    role={role || (onClick ? 'button' : undefined)}
    aria-label={ariaLabel}
    aria-pressed={ariaPressed}
    aria-disabled={disabled || undefined}
    tabIndex={onClick && !disabled ? 0 : undefined}
    onClick={(e) => {
      if (!disabled) onClick?.(e);
    }}
    onKeyDown={(e) => {
      // A native button nested inside a wrapper handles its own keyboard click.
      if (e.target !== e.currentTarget) return;
      if (!disabled && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
    }}
    style={{ ...style, '--press-scale': scaleDown } as React.CSSProperties}
    className={`press-scale ${onClick && !disabled ? 'cursor-pointer select-none' : ''} ${className}`}
  >
    {children}
  </div>
);
