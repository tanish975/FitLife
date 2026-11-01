import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { CelebrationPayload } from '../data/FitLifeStore';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface CelebrationOverlayProps {
  celebration: CelebrationPayload | null;
  onDismiss: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

const COLORS = ['#6BA37E', '#C47451', '#C89643', '#D8C39E', '#87B5AD', '#F4F1EA'];

/** A small, non-blocking achievement notice. It never captures the entire
 * screen, so a celebration cannot interrupt taps or vertical scrolling. */
export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ celebration, onDismiss }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => dismissRef.current(), 2400);
    if (reducedMotion) return () => window.clearTimeout(timer);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return () => window.clearTimeout(timer);
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const particles: Particle[] = Array.from({ length: 24 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      return {
        x: width / 2,
        y: Math.min(height * 0.2, 110),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: 2 + Math.random() * 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
      };
    });
    let rafId = 0;
    const start = performance.now();
    const animate = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.12;
        particle.alpha = Math.max(0, particle.alpha - 0.02);
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.radius * 2, particle.radius);
      }
      ctx.globalAlpha = 1;
      // Stop drawing once the brief burst is over, even if the notice remains.
      if (now - start < 1000 && !document.hidden) rafId = window.requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, width, height);
    };
    rafId = window.requestAnimationFrame(animate);
    return () => { window.clearTimeout(timer); window.cancelAnimationFrame(rafId); };
  }, [celebration, reducedMotion]);

  if (!celebration) return null;
  return (
    <div className="celebration-layer">
      {!reducedMotion && <canvas ref={canvasRef} className="celebration-canvas" aria-hidden="true" />}
      <div className="celebration-banner" role="status" aria-live="polite" onClick={onDismiss}>
        <span className="celebration-icon" aria-hidden="true">{celebration.icon}</span>
        <div className="celebration-copy">
          <span>Achievement Unlocked</span>
          <strong>{celebration.title}</strong>
          <small>{celebration.subtitle}</small>
        </div>
        <button type="button" aria-label="Dismiss achievement" onClick={(event) => { event.stopPropagation(); onDismiss(); }}><X size={17} /></button>
      </div>
    </div>
  );
};
