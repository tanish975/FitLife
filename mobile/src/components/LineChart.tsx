import React, { useEffect, useRef, useState } from 'react';
import { useFitLife } from '../data/FitLifeStore';

export interface LineChartDatum {
  label: string;
  value: number;
  sublabel?: string;
}

interface LineChartProps {
  data: LineChartDatum[];
  height?: number;
  lineColor?: string;
  endColor?: string;
  targetValue?: number;
  targetLabel?: string;
  unitSuffix?: string;
  yDecimals?: number;
}

/**
 * LineChart — Hand-built HTML5 Canvas chart. Draws data immediately rather
 * than re-rendering React and reallocating a large canvas on every frame.
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 185,
  lineColor,
  targetValue,
  targetLabel,
  unitSuffix = '',
  yDecimals = 0,
}) => {
  const { themeColors } = useFitLife();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const resolvedLine = lineColor || themeColors.accentPrimary;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const width = container.clientWidth || 320;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      // Changing canvas dimensions reallocates its backing bitmap; only do it
      // when its size actually changed, not for every selected data point.
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      if (data.length === 0) { ctx.restore(); return; }

      const padLeft = 38;
      const padRight = 14;
      const padTop = 20;
      const padBottom = 28;
      const plotW = Math.max(10, width - padLeft - padRight);
      const plotH = Math.max(10, height - padTop - padBottom);

      const values = data.map((d) => d.value);
      if (targetValue !== undefined && targetValue > 0) {
        values.push(targetValue);
      }

      const rawMin = Math.min(...values);
      const rawMax = Math.max(...values);
      const span = Math.max(1, rawMax - rawMin);
      const minY = Math.max(0, rawMin - span * 0.18);
      const maxY = rawMax + span * 0.18;

      const toX = (i: number) =>
        data.length === 1 ? padLeft + plotW / 2 : padLeft + (i / (data.length - 1)) * plotW;
      const toY = (v: number) => {
        const norm = (v - minY) / Math.max(0.0001, maxY - minY);
        return padTop + plotH * (1 - norm);
      };

      // Draw horizontal grid lines + Y labels
      ctx.strokeStyle = themeColors.ringTrack;
      ctx.lineWidth = 1;
      ctx.fillStyle = themeColors.textMuted;
      ctx.font = '500 10px Inter, sans-serif';
      ctx.textAlign = 'right';

      for (let g = 0; g <= 3; g++) {
        const ratio = g / 3;
        const y = padTop + plotH * ratio;
        const val = maxY - ratio * (maxY - minY);
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
        ctx.fillText(val.toFixed(yDecimals), padLeft - 6, y + 3);
      }

      // Optional target line
      if (targetValue !== undefined && targetValue > 0) {
        const ty = padTop + plotH * (1 - (targetValue - minY) / Math.max(0.0001, maxY - minY));
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = themeColors.accentWarm;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, ty);
        ctx.lineTo(width - padRight, ty);
        ctx.stroke();
        if (targetLabel) {
          ctx.fillStyle = themeColors.accentWarmText;
          ctx.font = '600 10px Inter, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(targetLabel, width - padRight - 2, Math.max(12, ty - 5));
        }
        ctx.restore();
      }

      const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));

      const buildCurve = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        if (pts.length > 1) {
          const last = pts[pts.length - 1];
          ctx.lineTo(last.x, last.y);
        }
      };

      // Solid subtle area fill under curve (no gradient)
      if (pts.length > 1) {
        ctx.save();
        buildCurve();
        ctx.lineTo(pts[pts.length - 1].x, padTop + plotH);
        ctx.lineTo(pts[0].x, padTop + plotH);
        ctx.closePath();
        ctx.fillStyle = `${resolvedLine}22`;
        ctx.fill();
        ctx.restore();
      }

      // Solid stroke curve
      ctx.save();
      buildCurve();
      ctx.strokeStyle = resolvedLine;
      ctx.lineWidth = 2.75;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // Points & X-axis labels
      pts.forEach((p, idx) => {
        const isHovered = hoverIdx === idx || (hoverIdx === null && idx === pts.length - 1);

        if (idx === 0 || idx === pts.length - 1 || idx % 3 === 0) {
          ctx.fillStyle = isHovered ? themeColors.textPrimary : themeColors.textMuted;
          ctx.font = isHovered ? '600 10px Inter, sans-serif' : '500 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(data[idx].label, p.x, height - 8);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, isHovered ? 5 : 3.2, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? themeColors.textPrimary : resolvedLine;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = themeColors.bgCard;
        ctx.stroke();
      });

      ctx.restore();
    };

    draw();
    // Redraw after rotation or layout changes without triggering a React render.
    // A window resize fallback covers older Android WebViews.
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(draw);
      observer.observe(container);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [data, height, resolvedLine, targetValue, targetLabel, hoverIdx, yDecimals, themeColors]);

  const activeIndex = hoverIdx !== null ? hoverIdx : Math.max(0, data.length - 1);
  const activeDatum = data[activeIndex];

  const handlePointer = (clientX: number) => {
    const container = containerRef.current;
    if (!container || data.length === 0) return;
    const rect = container.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const idx = Math.round((relX / rect.width) * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <div ref={containerRef} className="w-full select-none">
      {activeDatum && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-[#141916] px-3 py-1.5 text-xs border border-[#2F3A33]">
          <span className="text-[#B8B5AD] font-medium">
            {activeDatum.sublabel || activeDatum.label}
          </span>
          <span className="font-heading font-semibold text-[#7BB38F]">
            {activeDatum.value.toFixed(yDecimals)}
            {unitSuffix}
          </span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height }}
        onPointerMove={(e) => handlePointer(e.clientX)}
        onPointerDown={(e) => handlePointer(e.clientX)}
        onPointerLeave={() => setHoverIdx(null)}
        className="touch-pan-y cursor-crosshair block"
      />
    </div>
  );
};
