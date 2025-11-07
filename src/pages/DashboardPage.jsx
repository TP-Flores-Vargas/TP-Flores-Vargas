import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { AlertTriangleIcon, CheckCircleIcon, DownloadIcon, XCircleIcon } from "../assets/icons/index.jsx";
import Card from "../components/common/Card.jsx";
import CardMetric from "../components/metrics/CardMetric.jsx";
import { StatsCards } from "../components/StatsCards";
import { TimeSeriesMini } from "../components/TimeSeriesMini";
import { constants } from "../config/constants.js";
import { useInterval } from "../hooks/useInterval.js";
import { useAlertsStore } from "../store/alerts";

dayjs.extend(relativeTime);

const ServerStatusIndicator = ({ title, value, limit }) => {
  const percentage = (value / limit) * 100;
  let colorClass = "bg-green-500";
  if (percentage > 90) colorClass = "bg-red-500";
  else if (percentage > 70) colorClass = "bg-yellow-500";

  return (
    <Card>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">
        {value}
        {title.includes("Uso") ? "%" : " GB"}
      </p>
      <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
        <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </Card>
  );
};

const DashboardPage = () => {
  const { items: alerts, metrics, loadAlerts, refreshMetrics } = useAlertsStore();
  const [lastActivity, setLastActivity] = useState(dayjs());

  useEffect(() => {
    if (!alerts.length) {
      loadAlerts();
    }
    if (!metrics) {
      refreshMetrics();
    }
  }, [alerts.length, metrics, loadAlerts, refreshMetrics]);

  useInterval(() => setLastActivity(dayjs()), constants.REFRESH_INTERVAL_MS ?? 30 * 1000);

  const alertsToday = useMemo(
    () => alerts.filter((alert) => dayjs(alert.timestamp).isSame(dayjs(), "day")).length,
    [alerts],
  );

  const healthStatus = useMemo(() => {
    const hasCritical = alerts.some(
      (alert) =>
        alert.severity === "Critical" && dayjs(alert.timestamp).isAfter(dayjs().subtract(30, "minute")),
    );
    const hasHigh = alerts.some(
      (alert) => alert.severity === "High" && dayjs(alert.timestamp).isAfter(dayjs().subtract(1, "hour")),
    );
    if (hasCritical) return { text: "Alerta Crítica", color: "bg-red-500", icon: XCircleIcon };
    if (hasHigh) return { text: "Actividad Sospechosa", color: "bg-yellow-500", icon: AlertTriangleIcon };
    return { text: "Red Segura", color: "bg-green-500", icon: CheckCircleIcon };
  }, [alerts]);

  const attackDistribution = useMemo(() => {
    const counts = alerts.reduce((acc, alert) => {
      acc[alert.attack_type] = (acc[alert.attack_type] || 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    const max = sorted.length ? sorted[0][1] : 0;
    return { sorted, max };
  }, [alerts]);

  const recentAlerts = useMemo(
    () =>
      alerts
        .slice(0, 5)
        .map((alert) => ({
          id: alert.id,
          label: alert.attack_type,
          severity: alert.severity,
          timestamp: dayjs(alert.timestamp).fromNow(),
          rule: alert.rule_name,
        })),
    [alerts],
  );

  const HealthStatusIcon = healthStatus.icon;

  const handleDownloadSummary = () => {
    const payload = {
      generated_at: dayjs().toISOString(),
      totals: {
        today: alertsToday,
        severity: metrics?.counts_by_severity ?? {},
      },
      top_attack_types: attackDistribution.sorted.slice(0, 5),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard-summary-${dayjs().format("YYYYMMDD-HHmmss")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">Resumen en vivo del IDS</p>
        </div>
        <button
          type="button"
          onClick={handleDownloadSummary}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm font-semibold text-gray-200 hover:text-white"
        >
          <span className="hidden sm:inline">Descargar resumen</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className={`p-6 rounded-lg flex items-center justify-between text-white ${healthStatus.color}`}>
          <div>
            <p className="text-sm font-medium opacity-80">Estado de la Red</p>
            <p className="text-2xl font-bold">{healthStatus.text}</p>
            <p className="text-[11px] opacity-75 mt-1">
              Última actividad {lastActivity.format("h:mm:ss A")}
            </p>
          </div>
          <HealthStatusIcon className="w-10 h-10 opacity-70" />
        </div>
        <CardMetric title="Alertas Hoy" value={alertsToday} />
        <CardMetric title="Alertas Totales" value={alerts.length} />
        <CardMetric title="Versión del Sistema" value={constants.VERSION || "MVP"} tone="text-white" />
      </div>

      <StatsCards counts={metrics?.counts_by_severity ?? null} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Actividad Últimas 24h</h2>
            <p className="text-xs text-gray-500 uppercase trackingwide">serie temporal</p>
          </div>
          <TimeSeriesMini series={metrics?.last24h_series ?? []} />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Alertas Recientes</h2>
          <ul className="space-y-3">
            {recentAlerts.map((alert) => (
              <li key={alert.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-white">{alert.label}</p>
                  <p className="text-xs text-gray-400">Regla: {alert.rule}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">{alert.timestamp}</span>
                  <span className="text-xs uppercase tracking-wide text-gray-400">{alert.severity}</span>
                </div>
              </li>
            ))}
            {!recentAlerts.length && <p className="text-gray-400 text-sm">Sin actividad reciente.</p>}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Distribución por Tipo de Ataque</h2>
          <div className="space-y-3">
            {attackDistribution.sorted.map(([tipo, total]) => {
              const percentage = attackDistribution.max ? Math.round((total / attackDistribution.max) * 100) : 0;
              return (
                <div key={tipo}>
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>{tipo}</span>
                    <span className="font-semibold text-white">{total}</span>
                  </div>
                  <div className="w-full bg-gray-800/60 rounded-full h-2 mt-1">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {!attackDistribution.sorted.length && (
              <p className="text-gray-400 text-sm">Sin datos suficientes para graficar.</p>
            )}
          </div>
        </Card>
        <div className="grid gap-4">
          <ServerStatusIndicator title="Uso de CPU" value={35} limit={100} />
          <ServerStatusIndicator title="Uso de Memoria" value={75} limit={100} />
          <ServerStatusIndicator title="Espacio en Disco" value={150} limit={250} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
