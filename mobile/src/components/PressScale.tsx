import React, { useState } from 'react';

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

/**
 * PressScale — every tappable card or interactive surface scales down smoothly
 * under finger/pointer press and springs back on release.
 */
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
}) => {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      role={role || (onClick ? 'button' : undefined)}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-disabled={disabled || undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (!disabled && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      style={{
        ...style,
        transform: pressed ? `scale(${scaleDown})` : 'scale(1)',
        transition: pressed
          ? 'transform 110ms cubic-bezier(0.2, 0.8, 0.2, 1)'
          : 'transform 340ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      className={`${onClick && !disabled ? 'cursor-pointer select-none' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
