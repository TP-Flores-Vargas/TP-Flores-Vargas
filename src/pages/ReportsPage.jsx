import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import Card from "../components/common/Card.jsx";
import { TimeSeriesMini } from "../components/TimeSeriesMini";
import { useAlertsStore } from "../store/alerts";

const RANGE_OPTIONS = {
  "24h": { label: "Últimas 24h", hours: 24 },
  "7d": { label: "Últimos 7 días", hours: 24 * 7 },
  "30d": { label: "Últimos 30 días", hours: 24 * 30 },
};

const formatNumber = (value) => new Intl.NumberFormat("es-PE").format(value);

const SectionTitle = ({ title, description }) => (
  <div className="mb-4">
    <h2 className="text-lg font-semibold text-white">{title}</h2>
    {description ? <p className="text-sm text-gray-400">{description}</p> : null}
  </div>
);

const ReportsPage = () => {
  const { items, metrics, loadAlerts, refreshMetrics, exportCsv } = useAlertsStore();
  const [rangeKey, setRangeKey] = useState("24h");
  const [downloading, setDownloading] = useState(false);
  const [summaryDownloading, setSummaryDownloading] = useState(false);

  useEffect(() => {
    if (!items.length) {
      loadAlerts();
    }
    if (!metrics) {
      refreshMetrics();
    }
  }, [items.length, metrics, loadAlerts, refreshMetrics]);

  const selectedRange = RANGE_OPTIONS[rangeKey];
  const rangeStart = dayjs().subtract(selectedRange.hours, "hour");

  const rangeAlerts = useMemo(
    () => items.filter((alert) => dayjs(alert.timestamp).isAfter(rangeStart)),
    [items, rangeStart],
  );

  const severityOrder = ["Critical", "High", "Medium", "Low"];
  const severityTotals = useMemo(() => {
    return severityOrder.map((level) => ({
      level,
      count: rangeAlerts.filter((alert) => alert.severity === level).length,
    }));
  }, [rangeAlerts]);

  const attackDistribution = useMemo(() => {
    const map = rangeAlerts.reduce((acc, alert) => {
      acc[alert.attack_type] = (acc[alert.attack_type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map)
      .map(([attack, count]) => ({ attack, count }))
      .sort((a, b) => b.count - a.count);
  }, [rangeAlerts]);

  const topRules = useMemo(() => {
    const map = rangeAlerts.reduce((acc, alert) => {
      acc[alert.rule_name] = (acc[alert.rule_name] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map)
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rangeAlerts]);

  const averageScore = useMemo(() => {
    if (!rangeAlerts.length) return 0;
    const sum = rangeAlerts.reduce((acc, alert) => acc + alert.model_score, 0);
    return sum / rangeAlerts.length;
  }, [rangeAlerts]);

  const maliciousRatio = useMemo(() => {
    if (!rangeAlerts.length) return 0;
    const malicious = rangeAlerts.filter((alert) => alert.model_label === "malicious").length;
    return Math.round((malicious / rangeAlerts.length) * 100);
  }, [rangeAlerts]);

  const uniqueSources = useMemo(() => new Set(rangeAlerts.map((alert) => alert.src_ip)).size, [rangeAlerts]);

  const tableRows = useMemo(
    () =>
      rangeAlerts.slice(0, 12).map((alert) => ({
        id: alert.id,
        severity: alert.severity,
        attack: alert.attack_type,
        rule: alert.rule_name,
        score: alert.model_score,
        timestamp: dayjs(alert.timestamp).format("DD MMM HH:mm"),
      })),
    [rangeAlerts],
  );

  const handleCsvDownload = async () => {
    try {
      setDownloading(true);
      const blob = await exportCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alerts-report-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV export failed", error);
    } finally {
      setDownloading(false);
    }
  };

  const handleSummaryDownload = () => {
    setSummaryDownloading(true);
    try {
      const payload = {
        generated_at: dayjs().toISOString(),
        range: RANGE_OPTIONS[rangeKey].label,
        totals: {
          alerts: rangeAlerts.length,
          avg_score: Number(averageScore.toFixed(3)),
          malicious_ratio: maliciousRatio,
          unique_sources: uniqueSources,
        },
        severity_breakdown: severityTotals,
        top_attack_types: attackDistribution.slice(0, 5),
        top_rules,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alerts-summary-${dayjs().format("YYYYMMDD-HHmmss")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setSummaryDownloading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reportes</h1>
          <p className="text-sm text-gray-400">Análisis descargable basado en las alertas actuales.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCsvDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {downloading ? "Generando CSV..." : "Descargar CSV"}
          </button>
          <button
            type="button"
            onClick={handleSummaryDownload}
            disabled={summaryDownloading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white disabled:opacity-60"
          >
            {summaryDownloading ? "Generando informe..." : "Descargar informe"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(RANGE_OPTIONS).map(([key, value]) => (
          <button
            key={key}
            type="button"
            onClick={() => setRangeKey(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              rangeKey === key
                ? "bg-sky-500 text-white"
                : "bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700"
            }`}
          >
            {value.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-gray-400">Alertas en el periodo</p>
          <p className="text-3xl font-bold text-white mt-1">{formatNumber(rangeAlerts.length)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-400">Promedio de score</p>
          <p className="text-3xl font-bold text-white mt-1">{averageScore.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-400">% maliciosas</p>
          <p className="text-3xl font-bold text-white mt-1">{maliciousRatio}%</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-400">IPs origen únicas</p>
          <p className="text-3xl font-bold text-white mt-1">{formatNumber(uniqueSources)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Distribución por severidad" description="Equilibrio de criticidad en el periodo." />
          <div className="space-y-4">
            {severityTotals.map(({ level, count }) => {
              const max = Math.max(...severityTotals.map((item) => item.count), 1);
              const percentage = Math.round((count / max) * 100);
              return (
                <div key={level}>
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>{level}</span>
                    <span className="font-semibold text-white">{count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-700">
                    <div className="h-2 rounded-full bg-sky-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {!severityTotals.some((item) => item.count > 0) && (
              <p className="text-sm text-gray-400">No hay alertas dentro de este rango.</p>
            )}
          </div>
        </Card>
        <Card>
          <SectionTitle
            title="Serie temporal (24h)"
            description="Compara el ritmo actual contra las últimas 24 horas."
          />
          <TimeSeriesMini series={metrics?.last24h_series ?? []} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Principales tipos de ataque" description="Top 5 por volumen en el periodo." />
          <ul className="space-y-3">
            {attackDistribution.slice(0, 5).map(({ attack, count }) => (
              <li key={attack} className="flex items-center justify-between text-sm text-gray-300">
                <span>{attack}</span>
                <span className="font-semibold text-white">{count}</span>
              </li>
            ))}
            {!attackDistribution.length && (
              <p className="text-sm text-gray-400">Sin datos suficientes para mostrar tendencias.</p>
            )}
          </ul>
        </Card>
        <Card>
          <SectionTitle title="Reglas más activas" description="Detecciones que requieren revisión prioritaria." />
          <ul className="space-y-3">
            {topRules.map(({ rule, count }) => (
              <li key={rule} className="flex items-center justify-between text-sm text-gray-300">
                <span className="truncate pr-4">{rule}</span>
                <span className="font-semibold text-white">{count}</span>
              </li>
            ))}
            {!topRules.length && (
              <p className="text-sm text-gray-400">Aún no hay reglas activas para este rango.</p>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle title="Muestra para auditoría" description="Primeras alertas del periodo filtrado." />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700 text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-2 pr-4 font-medium">Fecha</th>
                <th className="py-2 pr-4 font-medium">Severidad</th>
                <th className="py-2 pr-4 font-medium">Ataque</th>
                <th className="py-2 pr-4 font-medium">Regla</th>
                <th className="py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {tableRows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4 whitespace-nowrap">{row.timestamp}</td>
                  <td className="py-3 pr-4">{row.severity}</td>
                  <td className="py-3 pr-4">{row.attack}</td>
                  <td className="py-3 pr-4 truncate max-w-xs">{row.rule}</td>
                  <td className="py-3">{row.score.toFixed(2)}</td>
                </tr>
              ))}
              {!tableRows.length && (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-gray-400">
                    No hay alertas registradas en el periodo seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;
