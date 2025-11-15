import type { DatasetBreakdownEntry, ModelPerformanceMetrics } from "../api/alerts";
import { HelpCircleIcon } from "../assets/icons/index.jsx";
import { InfoTooltip } from "./InfoTooltip";
import { ContextPopover } from "./ContextPopover";
import { formatPercent } from "../utils/modelConfidence";

interface InfoMetricProps {
  label: string;
  value: string;
  helper: string;
}

const InfoMetric = ({ label, value, helper }: InfoMetricProps) => (
  <div className="rounded-2xl bg-slate-900/70 border border-white/5 p-4">
    <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
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

  const formattedRisk = formatPercent(data.avg_model_score);
  const formattedLatency =
    data.avg_latency_ms > 1000
      ? `${(data.avg_latency_ms / 1000).toFixed(2)} s`
      : `${Math.max(0, data.avg_latency_ms).toFixed(0)} ms`;
  const datasetTotal = data.dataset_breakdown.reduce((acc, item) => acc + item.count, 0);

  return (
    <section className="mt-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Desempeño del modelo</h2>
            <ContextPopover
              triggerLabel="¿Qué mide este panel?"
              title="Cómo leer el desempeño del modelo"
              description="Resumen de lo que monitoreamos al evaluar el modelo CICIDS en producción."
            >
              <p>
                Este panel resume cuántas alertas procesó el modelo, qué tan confiado estuvo (score promedio) y
                cuánto tarda en escribir cada evento en la base. También desglosa los tipos de ataque y el origen de
                los datasets.
              </p>
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold text-white">Métricas principales</p>
                <ul className="list-disc pl-4 text-xs text-gray-300 space-y-1">
                  <li>
                    <strong>Alertas modeladas:</strong> volumen total analizado en la ventana seleccionada.
                  </li>
                  <li>
                    <strong>Confianza media:</strong> promedio del score del modelo (0% benigno – 100% ataque).
                  </li>
                  <li>
                    <strong>Latencia promedio:</strong> tiempo entre el evento en Zeek y la inserción de la alerta.
                  </li>
                </ul>
              </div>
              <p className="text-xs text-gray-400">
                Usa esta información para validar que el modelo mantiene tiempos y calidades esperados según el
                dataset activo.
              </p>
            </ContextPopover>
          </div>
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
          helper="Total de alertas que el modelo analizó en esta ventana."
        />
        <InfoMetric
          label="Riesgo medio"
          value={formattedRisk}
          helper="Probabilidad promedio de ataque calculada por el modelo (0 % = sin señales, 100 % = ataque confirmado)."
        />
        <InfoMetric
          label="Latencia promedio"
          value={formattedLatency}
          helper="Tiempo promedio entre el momento en que Zeek detectó el evento y la creación de la alerta."
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
                {formatPercent(entry.avg_model_score)} riesgo medio
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
