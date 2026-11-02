import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs/animation';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Anime.js interpolates only real changes, never the initial value. A new
 * value retargets from the last displayed value; cancellation removes the old
 * animation from its shared engine. Reduced motion remains immediate. */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 300,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState<number>(value);
  const fromRef = useRef<number>(value);

  useEffect(() => {
    const startVal = fromRef.current;
    const keyboard = document.documentElement.dataset.fitlifeInput === 'keyboard';
    if (reducedMotion || keyboard || duration <= 0 || Math.abs(value - startVal) < 0.001) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const current = { number: startVal };
    const animation = animate(current, {
      number: value,
      duration,
      frameRate: 30,
      ease: 'outCubic',
      onRender: () => {
        fromRef.current = current.number;
        setDisplay(current.number);
      },
      onComplete: () => {
        fromRef.current = value;
        setDisplay(value);
      },
    });
    return () => { animation.cancel(); };
  }, [value, duration, reducedMotion]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <span className={className}>{prefix}{formatted}{suffix}</span>;
};
