import dayjs from "dayjs";
import { useMemo, useState } from "react";

import type { TimeSeriesBucket } from "../api/alerts";

interface Props {
  series: TimeSeriesBucket[];
  onSelectRange?: (payload: { from: string; to: string; bucket: TimeSeriesBucket }) => void;
  bucketMinutes?: number;
}

const formatBucket = (bucket: string) => dayjs(bucket).format("HH:mm");
const formatTooltip = (bucket: string) => dayjs(bucket).format("DD MMM YYYY · HH:mm");

export const TimeSeriesMini = ({ series, onSelectRange, bucketMinutes = 60 }: Props) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const prepared = useMemo(() => {
    if (!series || series.length === 0) {
      return null;
    }
    const max = Math.max(...series.map((item) => item.count), 1);
    const step = 100 / Math.max(series.length - 1, 1);
    const points = series.map((item, index) => {
      const x = index * step;
      const y = 90 - (item.count / max) * 70;
      return { x, y, value: item.count };
    });
    return { points, step };
  }, [series]);

  if (!prepared) {
    return <p className="text-sm text-gray-400">Sin datos en las últimas 24 horas.</p>;
  }

  const { points, step } = prepared;
  const peakIndex = points.reduce(
    (best, point, idx) => (point.value > points[best].value ? idx : best),
    0,
  );
  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `0,100 ${linePoints} 100,100`;
  const activeIndex = hoverIndex ?? series.length - 1;
  const activeBucket = series[activeIndex];
  const startLabel = formatBucket(series[0].bucket);
  const peakLabel = formatBucket(series[peakIndex].bucket);
  const endLabel = formatBucket(series[series.length - 1].bucket);

  const handleBucketSelect = (index: number) => {
    if (!onSelectRange) return;
    const start = dayjs(series[index].bucket);
    onSelectRange({
      from: start.toISOString(),
      to: start.add(bucketMinutes, "minute").toISOString(),
      bucket: series[index],
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative h-36 w-full">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#tsAreaGradient)" opacity={0.8} />
          <polyline
            points={linePoints}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point, index) => (
            <rect
              key={`hit-${series[index].bucket}`}
              x={Math.max(point.x - step / 2, 0)}
              y={0}
              width={Math.max(step, 1)}
              height={100}
              fill="transparent"
              className={onSelectRange ? "cursor-pointer" : "cursor-default"}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => handleBucketSelect(index)}
            />
          ))}
          {typeof activeIndex === "number" && points[activeIndex] && (
            <line
              x1={points[activeIndex].x}
              y1="5"
              x2={points[activeIndex].x}
              y2="95"
              stroke="#38bdf8"
              strokeWidth="0.7"
              strokeDasharray="3 3"
            />
          )}
          {points.map((point, index) => (
            <circle
              key={`circle-${series[index].bucket}`}
              cx={point.x}
              cy={point.y}
              r={hoverIndex === index ? 2.4 : 1.4}
              fill={hoverIndex === index ? "#22d3ee" : "#bae6fd"}
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
        </div>
      )}
    </div>
  );
};
