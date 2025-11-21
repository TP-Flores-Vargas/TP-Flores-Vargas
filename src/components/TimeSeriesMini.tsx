import dayjs from "dayjs";
import { useMemo, useState } from "react";

import type { TimeSeriesBucket } from "../api/alerts";

interface Props {
  series: TimeSeriesBucket[];
  onSelectRange?: (payload: { from: string; to: string; bucket: TimeSeriesBucket }) => void;
  bucketMinutes?: number;
  chartHeightClass?: string;
  title?: string;
  subtitle?: string;
}

const formatBucket = (bucket: string) => dayjs(bucket).format("HH:mm");
const formatTooltip = (bucket: string) => dayjs(bucket).format("DD MMM · HH:mm");
const formatValue = (value: number) => new Intl.NumberFormat("es-PE").format(value);

const buildPath = (points: Array<{ x: number; y: number }>) =>
  points.reduce((path, point, idx) => {
    if (idx === 0) return `M ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, "");

const calculateAxis = (max: number) => {
  if (max === 0) return [0, 0, 0, 0];
  return [max, Math.round(max * 0.66), Math.round(max * 0.33), 0];
};

export const TimeSeriesMini = ({
  series,
  onSelectRange,
  bucketMinutes = 60,
  chartHeightClass = "h-48",
  title = "Evolución del tráfico",
  subtitle = "Últimas 24h",
}: Props) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const prepared = useMemo(() => {
    if (!Array.isArray(series) || series.length === 0) return null;
    const max = Math.max(...series.map((item) => item.count), 1);
    const step = 100 / Math.max(series.length - 1, 1);
    const points = series.map((item, index) => {
      const x = index * step;
      const ratio = max === 0 ? 0 : item.count / max;
      const eased = Math.pow(ratio, 0.7);
      const y = 92 - (12 + eased * 78);
      return { x, y, value: item.count };
    });
    return { points, step, max };
  }, [series]);

  if (!prepared) {
    return <p className="text-sm text-gray-400">Sin datos recientes.</p>;
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
  const axisValues = calculateAxis(max);

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

  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950/80 p-4 shadow-[0_15px_45px_rgba(15,23,42,0.65)]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-base font-semibold text-white">{title}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right text-[11px] text-slate-400">
          <p className="font-semibold text-sky-300">{formatValue(activeBucket.count)}</p>
          <p className="uppercase tracking-[0.2em] text-[9px] text-slate-500">alertas</p>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex">
          <div className="flex flex-col justify-between text-[10px] text-slate-500 pr-3">
            {axisValues.map((value) => (
              <span key={`axis-${value}`}>{formatValue(value)}</span>
            ))}
          </div>
          <div className="flex-1 border-l border-slate-900" />
        </div>

        <svg
          className={`w-full ${chartHeightClass}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="tsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
            <filter id="tsGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {[25, 50, 75].map((ratio) => (
            <line
              key={`grid-${ratio}`}
              x1="0"
              x2="100"
              y1={100 - ratio}
              y2={100 - ratio}
              stroke="rgba(148,163,184,0.35)"
              strokeWidth="0.4"
            />
          ))}

          <path d={areaPath} fill="url(#tsAreaGradient)" opacity="0.9" />
          <path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeOpacity="0.95"
            strokeWidth="1.6"
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
              r={hoverIndex === index ? 2.8 : 1.4}
              fill={hoverIndex === index ? "#fecdd3" : "#bae6fd"}
              opacity={hoverIndex === index ? 1 : 0.7}
              pointerEvents="none"
            />
          ))}

          {points[activeIndex] && (
            <circle
              cx={points[activeIndex].x}
              cy={points[activeIndex].y}
              r={3.8}
              fill="#0f172a"
              stroke="#f472b6"
              strokeWidth="1.2"
              pointerEvents="none"
              filter="url(#tsGlow)"
            />
          )}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-5 py-2 text-[10px] text-slate-400">
          <div className="flex items-center justify-between text-slate-500">
            <span>Pico: {formatValue(series[peakIndex].count)}</span>
            <span>
              {formatBucket(series[series.length - 1].bucket)} · {series[series.length - 1].count}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>{startLabel}</span>
        <span>{midLabel}</span>
        <span>{endLabel}</span>
      </div>

      {activeBucket && (
        <div className="text-xs text-gray-200 bg-slate-950/70 border border-white/5 rounded-2xl px-3 py-3 flex items-start justify-between gap-4">
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
    </div>
  );
};

export default TimeSeriesMini;
