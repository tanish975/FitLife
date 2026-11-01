import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * AnimatedCounter — smoothly counts up or down to the target value using cubic-out easing.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 650,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState<number>(value);
  const fromRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = fromRef.current;
    const endVal = value;
    if (reducedMotion || duration <= 0 || Math.abs(endVal - startVal) < 0.001) {
      fromRef.current = endVal;
      setDisplay(endVal);
      return;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Cubic ease out
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startVal + (endVal - startVal) * eased;
      setDisplay(current);
      fromRef.current = current;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = endVal;
        setDisplay(endVal);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, reducedMotion]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
