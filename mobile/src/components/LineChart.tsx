import React, { useEffect, useRef, useState } from 'react';
import { useFitLife } from '../data/FitLifeStore';
import { chartDateFractions } from '../domain/ProgressAggregator';

export interface LineChartDatum {
  dateKey: string;
  label: string;
  value: number | null;
  sublabel?: string;
}

interface LineChartProps {
  data: LineChartDatum[];
  name: string;
  height?: number;
  lineColor?: string;
  secondaryData?: LineChartDatum[];
  secondaryLabel?: string;
  secondaryColor?: string;
  targetValue?: number;
  targetLabel?: string;
  unitSuffix?: string;
  yDecimals?: number;
}

/** Calendar-spaced visual chart with a keyboard/screen-reader data table. */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  name,
  height = 185,
  lineColor,
  secondaryData,
  secondaryLabel,
  secondaryColor,
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
  const resolvedSecondary = secondaryColor || themeColors.accentWarm;
  const padLeft = 38, padRight = 14, padTop = 20, padBottom = 28;

  useEffect(() => { setHoverIdx(null); }, [data, secondaryData]);
  useEffect(() => {
    const canvas = canvasRef.current, container = containerRef.current;
    if (!canvas || !container) return;
    const draw = () => {
      const width = container.clientWidth || 320;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);
      const allValues: number[] = [];
      data.forEach((item) => { if (item.value !== null && Number.isFinite(item.value)) allValues.push(item.value); });
      secondaryData?.forEach((item) => { if (item.value !== null && Number.isFinite(item.value)) allValues.push(item.value); });
      if (targetValue !== undefined && Number.isFinite(targetValue) && targetValue > 0) allValues.push(targetValue);
      if (allValues.length === 0) {
        ctx.fillStyle = themeColors.textMuted; ctx.font = '500 12px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('No entries to chart', width / 2, height / 2);
        ctx.restore(); return;
      }
      const plotW = Math.max(10, width - padLeft - padRight), plotH = Math.max(10, height - padTop - padBottom);
      const rawMin = Math.min(...allValues), rawMax = Math.max(...allValues), span = Math.max(1, rawMax - rawMin);
      const minY = Math.max(0, rawMin - span * 0.18), maxY = rawMax + span * 0.18;
      const xs = chartDateFractions(data.map((item) => item.dateKey));
      const toX = (index: number) => padLeft + xs[index] * plotW;
      const toY = (value: number) => padTop + plotH * (1 - (value - minY) / Math.max(0.0001, maxY - minY));

      ctx.strokeStyle = themeColors.ringTrack; ctx.lineWidth = 1; ctx.fillStyle = themeColors.textMuted;
      ctx.font = '500 10px Inter, sans-serif'; ctx.textAlign = 'right';
      for (let g = 0; g <= 3; g++) {
        const ratio = g / 3, y = padTop + plotH * ratio, value = maxY - ratio * (maxY - minY);
        ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(width - padRight, y); ctx.stroke();
        ctx.fillText(value.toFixed(yDecimals), padLeft - 6, y + 3);
      }
      if (targetValue !== undefined && Number.isFinite(targetValue) && targetValue > 0) {
        const y = toY(targetValue);
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = themeColors.accentWarm; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(width - padRight, y); ctx.stroke();
        if (targetLabel) {
          ctx.fillStyle = themeColors.accentWarmText; ctx.font = '600 10px Inter, sans-serif'; ctx.textAlign = 'right';
          ctx.fillText(targetLabel, width - padRight - 2, Math.max(12, y - 5));
        }
        ctx.restore();
      }

      const drawSeries = (items: LineChartDatum[], color: string, keyPrefix: string) => {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.75; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        let active = false;
        ctx.beginPath();
        items.forEach((item, index) => {
          if (item.value === null || !Number.isFinite(item.value)) { active = false; return; }
          const x = toX(index), y = toY(item.value);
          if (!active) { ctx.moveTo(x, y); active = true; } else ctx.lineTo(x, y);
        });
        ctx.stroke(); ctx.restore();

        items.forEach((item, index) => {
          const x = toX(index);
          if (item.value === null || !Number.isFinite(item.value)) return;
          const selected = hoverIdx === index || (hoverIdx === null && index === data.length - 1);
          ctx.beginPath(); ctx.arc(x, toY(item.value), selected ? 5 : 3.2, 0, Math.PI * 2);
          ctx.fillStyle = selected ? themeColors.textPrimary : color; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = themeColors.bgCard; ctx.stroke();
        });
      };

      drawSeries(data, resolvedLine, 'primary');
      if (secondaryData) drawSeries(secondaryData, resolvedSecondary, 'secondary');

      let lastLabelX = -Infinity;
      data.forEach((item, index) => {
        const x = toX(index);
        if ((index === 0 || index === data.length - 1 || index % 3 === 0) && (x - lastLabelX >= 42 || index === 0)) {
          ctx.fillStyle = themeColors.textMuted; ctx.font = '500 10px Inter, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(item.label, x, height - 8); lastLabelX = x;
        }
      });
      ctx.restore();
    };
    draw();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(draw); observer.observe(container); return () => observer.disconnect();
    }
    window.addEventListener('resize', draw); return () => window.removeEventListener('resize', draw);
  }, [data, height, resolvedLine, resolvedSecondary, targetValue, targetLabel, hoverIdx, yDecimals, themeColors, secondaryData]);

  const activeIndex = hoverIdx !== null && hoverIdx < data.length ? hoverIdx : Math.max(0, data.length - 1);
  const activeDatum = data[activeIndex];
  const formatValue = (value: number | null) => value === null ? 'Not logged' : `${value.toFixed(yDecimals)}${unitSuffix}`;
  const handlePointer = (clientX: number) => {
    const container = containerRef.current;
    if (!container || !data.length) return;
    const rect = container.getBoundingClientRect(), plotWidth = Math.max(10, rect.width - padLeft - padRight);
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left - padLeft) / plotWidth));
    const positions = chartDateFractions(data.map((item) => item.dateKey));
    const index = positions.reduce((best, x, i) => Math.abs(x - fraction) < Math.abs(positions[best] - fraction) ? i : best, 0);
    setHoverIdx(index);
  };
  return <div ref={containerRef} className="w-full">
    {activeDatum && <div aria-hidden="true" className="mb-2 flex items-center justify-between rounded-xl bg-[#141916] px-3 py-1.5 text-xs border border-[#2F3A33]">
      <span className="text-[#B8B5AD] font-medium">{activeDatum.sublabel || activeDatum.label}</span>
      <span className="font-heading font-semibold text-[#7BB38F]">{formatValue(activeDatum.value)}</span>
    </div>}
    <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} aria-hidden="true" style={{ width: '100%', height }}
      onPointerMove={(event) => handlePointer(event.clientX)} onPointerDown={(event) => handlePointer(event.clientX)}
      onPointerLeave={() => setHoverIdx(null)} className="touch-pan-y cursor-crosshair block" />
    <details className="mt-2 text-xs text-[#B8B5AD]">
      <summary className="cursor-pointer font-semibold text-[#7BB38F]">View {name.toLowerCase()} data table</summary>
      {data.length ? <div className="overflow-x-auto"><table aria-label={`${name} data`} className="mt-2 w-full text-left">
        <thead><tr><th scope="col" className="py-1 pr-3">Date</th><th scope="col" className="py-1">Value</th></tr></thead>
        <tbody>{data.map((item, index) => <tr key={`${item.dateKey}-${index}`}><th scope="row" className="py-1 pr-3 font-medium">{item.dateKey}</th><td className="py-1">{formatValue(item.value)}</td></tr>)}</tbody>
      </table></div> : <p className="mt-2">No entries yet.</p>}
    </details>
  </div>;
};
