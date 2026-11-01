import React, { useEffect, useRef } from 'react';
import { useFitLife } from '../data/FitLifeStore';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface AnimatedRingProps {
  progress: number; // 0..1
  size?: number;
  strokeWidth?: number;
  startColor?: string;
  endColor?: string;
  trackColor?: string;
  glowBloom?: boolean;
  children?: React.ReactNode;
}

/**
 * AnimatedRing — Canvas-drawn circular progress ring that animates smoothly
 * on mount and whenever `progress` or theme changes using a solid natural stroke color.
 */
export const AnimatedRing: React.FC<AnimatedRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 10,
  startColor,
  trackColor,
  children,
}) => {
  const { themeColors, settings } = useFitLife();
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentProgressRef = useRef<number>(0);

  const resolvedStroke = startColor || themeColors.accentPrimary;
  const resolvedTrack = trackColor || themeColors.ringTrack;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const startVal = currentProgressRef.current;
    const targetVal = Math.max(0, Math.min(1, progress));
    const duration = settings.motionStyle === 'gentle' ? 380 : 700;
    const startTime = performance.now();
    let rafId = 0;

    const render = (val: number) => {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const center = size / 2;
      const radius = (size - strokeWidth * 2) / 2;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + val * Math.PI * 2;

      // Track ring
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = resolvedTrack;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Solid natural active arc
      if (val > 0.005) {
        ctx.beginPath();
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.strokeStyle = resolvedStroke;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.restore();
    };

    if (reducedMotion) {
      currentProgressRef.current = targetVal;
      render(targetVal);
      return;
    }

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = startVal + (targetVal - startVal) * eased;
      currentProgressRef.current = val;
      render(val);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [progress, size, strokeWidth, resolvedStroke, resolvedTrack, reducedMotion, settings.motionStyle]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="relative z-10 block"
      />
      {children && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
};
