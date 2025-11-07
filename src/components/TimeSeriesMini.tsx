import type { TimeSeriesBucket } from "../api/alerts";

interface Props {
  series: TimeSeriesBucket[];
}

const formatHour = (bucket: string) => new Date(bucket).getHours().toString().padStart(2, "0");

export const TimeSeriesMini = ({ series }: Props) => {
  if (!series || series.length === 0) {
    return <p className="text-sm text-gray-400">Sin datos en las últimas 24 horas.</p>;
  }

  const max = Math.max(...series.map((bucket) => bucket.count), 1);
  const normalize = (bucket: TimeSeriesBucket, index: number) => {
    const x = (index / (series.length - 1 || 1)) * 100;
    const y = 100 - (bucket.count / max) * 100;
    return { x, y };
  };

  const pointsList = series.map((bucket, index) => normalize(bucket, index));
  const polylinePoints = pointsList.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `0,100 ${polylinePoints} 100,100`;

  const firstLabel = formatHour(series[0].bucket);
  const middleLabel = formatHour(series[Math.floor(series.length / 2)].bucket);
  const lastLabel = formatHour(series[series.length - 1].bucket);

  return (
    <div className="space-y-2">
      <div className="relative h-32 w-full">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polygon points={areaPoints} fill="url(#tsGradient)" />
          {pointsList.map((point, index) => (
            <circle
              key={`circle-${series[index].bucket}`}
              cx={point.x}
              cy={point.y}
              r={1.2}
              fill="#bae6fd"
            >
              <title>
                {series[index].count} alertas · {formatHour(series[index].bucket)}:00
              </title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 px-1">
        <span>{firstLabel}:00</span>
        <span>{middleLabel}:00</span>
        <span>{lastLabel}:00</span>
      </div>
    </div>
  );
};
