import { useMemo, useState } from "react";

import type { TimeSeriesBucket } from "../api/alerts";

interface Props {
  series: TimeSeriesBucket[];
}

const formatBucket = (bucket: string) => {
  const date = new Date(bucket);
  return `${date.getHours().toString().padStart(2, "0")}:00`;
};

const formatTooltip = (bucket: string) => {
  const date = new Date(bucket);
  return date.toLocaleString();
};

export const TimeSeriesMini = ({ series }: Props) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const prepared = useMemo(() => {
    if (!series || series.length === 0) {
      return null;
    }
    const max = Math.max(...series.map((item) => item.count), 1);
    const step = 100 / series.length;
    const points = series.map((item, index) => {
      const x = index * step + step / 2;
      const y = 90 - (item.count / max) * 70;
      const barHeight = (item.count / max) * 70;
      return { x, y, barHeight };
    });
    return { points, max, step };
  }, [series]);

  if (!prepared) {
    return <p className="text-sm text-gray-400">Sin datos en las últimas 24 horas.</p>;
  }

  const { points, max, step } = prepared;
  const peakIndex = points.reduce(
    (best, point, idx) => (point.barHeight > points[best].barHeight ? idx : best),
    0,
  );
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `0,100 ${linePoints} 100,100`;
  const activeIndex = hoverIndex ?? series.length - 1;
  const activeBucket = series[activeIndex];
  const startLabel = formatBucket(series[0].bucket);
  const peakLabel = formatBucket(series[peakIndex].bucket);
  const endLabel = formatBucket(series[series.length - 1].bucket);

  return (
    <div className="space-y-3">
      <div className="relative h-36 w-full">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#tsAreaGradient)" opacity={0.5} />
          {points.map((point, index) => (
            <g key={`bar-${series[index].bucket}`}>
              <rect
                x={point.x - step * 0.35}
                y={100 - point.barHeight - 5}
                width={step * 0.7}
                height={point.barHeight}
                fill="rgba(56,189,248,0.25)"
                className="transition-all"
              />
              <rect
                x={point.x - step / 2}
                y={0}
                width={step}
                height={100}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            </g>
          ))}
          <polyline
            points={linePoints}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point, index) => (
            <circle
              key={`circle-${series[index].bucket}`}
              cx={point.x}
              cy={point.y}
              r={hoverIndex === index ? 2.2 : 1.2}
              fill={hoverIndex === index ? "#f97316" : "#bae6fd"}
            />
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
        <span>{startLabel}</span>
        <span>
          Pico: {series[peakIndex].count} · {peakLabel}
        </span>
        <span>{endLabel}</span>
      </div>
      {activeBucket && (
        <div className="text-xs text-gray-200 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">{formatBucket(activeBucket.bucket)}</p>
            <p className="text-gray-400">{formatTooltip(activeBucket.bucket)}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-sky-300">{activeBucket.count}</p>
            <p className="text-gray-400 text-[11px] uppercase tracking-wide">alertas</p>
          </div>
        </div>
      )}
    </div>
  );
};
