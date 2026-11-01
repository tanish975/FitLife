import React, { useEffect, useRef } from 'react';
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
  rotation: number;
  vRot: number;
}

// Natural botanical & earthy confetti tones
const COLORS = ['#6BA37E', '#C47451', '#C89643', '#D8C39E', '#87B5AD', '#F4F1EA'];

/**
 * CelebrationOverlay — Canvas particle burst when a badge unlocks, fired from a
 * one-shot flow; auto-dismisses so it's never something to tap through.
 */
export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  celebration,
  onDismiss,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!celebration) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);

    if (reducedMotion) return () => clearTimeout(timer);
    const canvas = canvasRef.current;
    if (!canvas) return () => clearTimeout(timer);
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => clearTimeout(timer);

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const particles: Particle[] = Array.from({ length: 85 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      return {
        x: width / 2,
        y: height * 0.35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        radius: 3 + Math.random() * 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
      };
    });

    let rafId = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.vx *= 0.985;
        p.alpha = Math.max(0, p.alpha - 0.011);
        p.rotation += p.vRot;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.radius, -p.radius * 0.6, p.radius * 2, p.radius * 1.2);
        ctx.restore();
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [celebration, onDismiss, reducedMotion]);

  if (!celebration) return null;

  return (
    <div
      onClick={onDismiss}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#0E120F]/75 backdrop-blur-sm animate-fade-in"
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative z-10 mx-6 max-w-xs rounded-[28px] border border-[#497A5B] bg-[#1E2520] p-6 text-center shadow-2xl animate-pop-spring">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#25382B] border border-[#497A5B] text-3xl">
          {celebration.icon}
        </div>
        <div className="inline-block rounded-full bg-[#25382B] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7BB38F]">
          Achievement Unlocked
        </div>
        <h3 className="mt-2 font-heading text-lg font-bold text-[#F4F1EA]">{celebration.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#B8B5AD]">{celebration.subtitle}</p>
        <p className="mt-3 text-[10px] text-[#84877F]">Auto-dismissing...</p>
      </div>
    </div>
  );
};
