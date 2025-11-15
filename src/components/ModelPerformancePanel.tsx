import type { DatasetBreakdownEntry, ModelPerformanceMetrics } from "../api/alerts";
import { HelpCircleIcon } from "../assets/icons/index.jsx";
import { InfoTooltip } from "./InfoTooltip";

interface InfoMetricProps {
  label: string;
  value: string;
  helper: string;
}

const InfoMetric = ({ label, value, helper }: InfoMetricProps) => (
  <div className="rounded-2xl bg-slate-900/70 border border-white/5 p-4">
    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
      <span>{label}</span>
      <InfoTooltip content={helper}>
        <button
          type="button"
          aria-label={helper}
          className="rounded-full border border-white/10 bg-white/5 p-1 text-gray-400 hover:text-white"
        >
          <HelpCircleIcon className="w-4 h-4" aria-hidden />
        </button>
      </InfoTooltip>
    </div>
    <p className="text-2xl font-semibold text-white mt-1">{value}</p>
  </div>
);

interface Props {
  data: ModelPerformanceMetrics | null;
  error?: string | null;
}

const formatDatasetLabel = (entry: DatasetBreakdownEntry) =>
  entry.label ?? entry.source ?? "Sin etiqueta";

export const ModelPerformancePanel = ({ data, error }: Props) => {
  if (error) {
    return (
      <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mt-6 rounded-2xl border border-white/5 bg-slate-900/50 p-6 text-sm text-gray-300">
        Calculando desempeño del modelo…
      </div>
    );
  }

  const formattedScore = `${(data.avg_model_score * 100).toFixed(1)}%`;
  const formattedLatency =
    data.avg_latency_ms > 1000
      ? `${(data.avg_latency_ms / 1000).toFixed(2)} s`
      : `${Math.max(0, data.avg_latency_ms).toFixed(0)} ms`;
  const datasetTotal = data.dataset_breakdown.reduce((acc, item) => acc + item.count, 0);

  return (
    <section className="mt-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Desempeño del modelo</h2>
          <p className="text-sm text-gray-400">
            Ventana analizada: últimas {data.window_hours} h · {data.total_alerts} alertas
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Actualizado {new Date(data.window_end).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <InfoMetric
          label="Alertas modeladas"
          value={data.total_alerts.toLocaleString()}
          helper="Cantidad de alertas procesadas por el modelo durante la ventana seleccionada."
        />
        <InfoMetric
          label="Confianza media"
          value={formattedScore}
          helper="Promedio del puntaje del modelo (probabilidad de ataque) en la ventana."
        />
        <InfoMetric
          label="Latencia promedio"
          value={formattedLatency}
          helper="Tiempo promedio entre el evento detectado por Zeek y la inserción de la alerta."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Tipos de ataque destacados
            </h3>
            <InfoTooltip content="Muestra cuántas alertas generó cada tipo de ataque y el puntaje promedio del modelo.">
              <span className="rounded-full border border-white/10 bg-white/5 p-1 text-gray-400 hover:text-white">
                <HelpCircleIcon className="w-4 h-4" aria-hidden />
              </span>
            </InfoTooltip>
          </div>
          <div className="space-y-3">
            {data.attack_type_stats.length === 0 && (
              <p className="text-sm text-gray-400">Sin registros en la ventana seleccionada.</p>
            )}
            {data.attack_type_stats.map((entry) => (
              <div key={entry.attack_type} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">{entry.attack_type}</p>
                  <p className="text-xs text-gray-500">
                    {(entry.avg_model_score * 100).toFixed(1)}% confianza media
                  </p>
                </div>
                <span className="text-sm text-gray-200 font-semibold">
                  {entry.count.toLocaleString()} alertas
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Origen de los datasets
            </h3>
            <InfoTooltip content="Comparación de alertas generadas según el dataset usado (sincronizado, referencia o cargas personalizadas).">
              <span className="rounded-full border border-white/10 bg-white/5 p-1 text-gray-400 hover:text-white">
                <HelpCircleIcon className="w-4 h-4" aria-hidden />
              </span>
            </InfoTooltip>
          </div>
          <div className="space-y-3">
            {datasetTotal === 0 && (
              <p className="text-sm text-gray-400">Aún no se ingresa tráfico desde Zeek/modelo.</p>
            )}
            {data.dataset_breakdown.map((entry) => {
              const percentage = datasetTotal
                ? Math.round((entry.count / datasetTotal) * 100)
                : 0;
              return (
                <div key={`${entry.source}-${entry.label}`} className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>{formatDatasetLabel(entry)}</span>
                    <span>{entry.count.toLocaleString()} · {percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{ width: `${percentage}%` }}
                      aria-label={`Participación ${percentage}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
