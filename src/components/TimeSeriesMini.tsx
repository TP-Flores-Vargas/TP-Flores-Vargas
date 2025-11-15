import dayjs from "dayjs";
import { useMemo, useState } from "react";

import type { TimeSeriesBucket } from "../api/alerts";

interface Props {
  series: TimeSeriesBucket[];
  onSelectRange?: (payload: { from: string; to: string; bucket: TimeSeriesBucket }) => void;
  bucketMinutes?: number;
}

const formatBucket = (bucket: string) => dayjs(bucket).format("HH:mm");
const formatTooltip = (bucket: string) => dayjs(bucket).format("DD MMM · HH:mm");

const buildPath = (points: Array<{ x: number; y: number }>) =>
  points.reduce((path, point, idx) => {
    if (idx === 0) return `M ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, "");

export const TimeSeriesMini = ({ series, onSelectRange, bucketMinutes = 60 }: Props) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const prepared = useMemo(() => {
    if (!Array.isArray(series) || series.length === 0) return null;
    const max = Math.max(...series.map((item) => item.count), 1);
    const step = 100 / Math.max(series.length - 1, 1);
    const points = series.map((item, index) => {
      const x = index * step;
      const ratio = max === 0 ? 0 : item.count / max;
      const eased = Math.pow(ratio, 0.65);
      const y = 90 - (10 + eased * 80);
      return { x, y, value: item.count };
    });
    return { points, step, max };
  }, [series]);

  if (!prepared) {
    return <p className="text-sm text-gray-400">Sin datos en las últimas 24 horas.</p>;
  }

  const { points, step, max } = prepared;
  const peakIndex = points.reduce(
    (best, point, idx) => (point.value > points[best].value ? idx : best),
    0,
  );
  let activeIndex = hoverIndex ?? peakIndex;
  if (!series[activeIndex]) {
    activeIndex = peakIndex;
  }
  const activeBucket = series[activeIndex];

  const linePath = buildPath(points);
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  const handleBucketSelect = (index: number) => {
    if (!onSelectRange) return;
    const start = dayjs(series[index].bucket);
    onSelectRange({
      from: start.toISOString(),
      to: start.add(bucketMinutes, "minute").toISOString(),
      bucket: series[index],
    });
  };

  const startLabel = formatBucket(series[0].bucket);
  const midLabel = formatBucket(series[Math.floor(series.length / 2)].bucket);
  const endLabel = formatBucket(series[series.length - 1].bucket);
  const maxValue = Math.max(...series.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      <div className="relative h-44 w-full rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/70 to-slate-900 px-2 pt-4 pb-3">
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="tsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
            <filter id="tsGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[0, 0.5, 1].map((ratio) => (
            <line
              key={`grid-${ratio}`}
              x1="0"
              x2="100"
              y1={95 - ratio * 70}
              y2={95 - ratio * 70}
              stroke="#1f2937"
              strokeWidth="0.4"
            />
          ))}

          <path d={areaPath} fill="url(#tsAreaGradient)" opacity="0.9" />
          <path
            d={linePath}
            fill="none"
            stroke="#8b5cf6"
            strokeOpacity="0.85"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#tsGlow)"
          />

          {points.map((point, index) => (
            <rect
              key={`hit-${series[index].bucket}`}
              x={Math.max(point.x - step / 2, 0)}
              y={0}
              width={Math.max(step, 2)}
              height={100}
              fill="transparent"
              className={onSelectRange ? "cursor-pointer" : "cursor-default"}
              onMouseEnter={() => setHoverIndex(index)}
              onClick={() => handleBucketSelect(index)}
            />
          ))}

          {points.map((point, index) => (
            <circle
              key={`circle-${series[index].bucket}`}
              cx={point.x}
              cy={point.y}
              r={hoverIndex === index ? 2.2 : 1.2}
              fill={hoverIndex === index ? "#f472b6" : "#c084fc"}
              opacity={hoverIndex === index ? 1 : 0.6}
              pointerEvents="none"
            />
          ))}

          {points[activeIndex] && (
            <circle
              cx={points[activeIndex].x}
              cy={points[activeIndex].y}
              r={3.5}
              fill="#0f172a"
              stroke="#f472b6"
              strokeWidth="1.1"
              pointerEvents="none"
              filter="url(#tsGlow)"
            />
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[10px] text-slate-500 px-2 py-1">
          <div className="flex justify-between">
            <span>Pico: {max} alertas</span>
            <span>
              Última hora · {formatBucket(series[series.length - 1].bucket)} ({series[series.length - 1].count})
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
        <span>{startLabel}</span>
        <span>{midLabel}</span>
        <span>{endLabel}</span>
      </div>

      {activeBucket && (
        <div className="text-xs text-gray-200 bg-slate-950/70 border border-white/5 rounded-2xl px-3 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">{formatBucket(activeBucket.bucket)}</p>
            <p className="text-gray-400">{formatTooltip(activeBucket.bucket)}</p>
            {onSelectRange && (
              <button
                type="button"
                className="mt-1 text-[11px] text-sky-300 underline"
                onClick={() => handleBucketSelect(activeIndex)}
              >
                Filtrar por esta hora
              </button>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-sky-300">{activeBucket.count}</p>
            <p className="text-gray-400 text-[11px] uppercase tracking-wide">alertas</p>
            <p className="text-[11px] text-gray-500">
              Pico: {series[peakIndex].count} · {formatBucket(series[peakIndex].bucket)}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between text-[10px] text-slate-500 px-1">
        <span>0 alertas</span>
        <span>{maxValue} alertas</span>
      </div>
    </div>
  );
};
