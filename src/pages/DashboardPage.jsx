import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { AlertTriangleIcon, CheckCircleIcon, DownloadIcon, HelpCircleIcon, XCircleIcon } from "../assets/icons/index.jsx";
import Card from "../components/common/Card.jsx";
import CardMetric from "../components/metrics/CardMetric.jsx";
import { ModelPerformancePanel } from "../components/ModelPerformancePanel";
import { SeverityClassificationPopover } from "../components/SeverityClassificationPopover";
import { StatsCards } from "../components/StatsCards";
import { TimeSeriesMini } from "../components/TimeSeriesMini";
import { InfoTooltip } from "../components/InfoTooltip";
import { translateSeverity } from "../utils/severity";
import { constants } from "../config/constants.js";
import { useInterval } from "../hooks/useInterval.js";
import { defaultFilters, useAlertsStore } from "../store/alerts";
import { fetchDashboardMetrics, fetchModelPerformanceMetrics } from "../api/alerts";
import { dashboardHelp } from "../content/contextualHelp";
import { SeverityBadge } from "../components/SeverityBadge";
import { formatPercent, getConfidenceLabel, getDisplayConfidence } from "../utils/modelConfidence";

dayjs.extend(relativeTime);

const severityRank = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const ServerStatusIndicator = ({ status, causes, onNavigateAlerts, helperCopy, onCauseClick }) => {
  return (
    <Card className="relative overflow-hidden text-white border border-white/10">
      <div className={`absolute inset-0 ${status.color}`} aria-hidden />
      <div className="relative flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium opacity-80">Estado de la Red</p>
            <p className="text-2xl font-bold">{status.text}</p>
            <p className="text-[11px] opacity-75 mt-1">{status.helper}</p>
          </div>
          <InfoTooltip content={helperCopy} align="right">
            <button
              type="button"
              className="rounded-full border border-white/20 bg-black/20 p-1 text-white/80 hover:text-white"
              aria-label="Descripción del estado de la red"
            >
              <HelpCircleIcon className="w-4 h-4" aria-hidden />
            </button>
          </InfoTooltip>
        </div>
      </div>
      {false && causes.length > 0 && (
        <div className="relative mt-4 space-y-2 text-sm bg-black/30 rounded-lg p-3">
          <p className="text-xs uppercase tracking-wide opacity-80">Causas recientes</p>
          {causes.map((alert) => (
            <button
              key={alert.id}
              type="button"
              className="w-full text-left hover:underline"
              onClick={() =>
                {
                  onCauseClick?.(alert);
                  onNavigateAlerts({
                    severity: [alert.severity],
                    query: alert.rule_name,
                  });
                }
              }
            >
              <div className="flex flex-col text-sm text-white/90">
                <span className="font-semibold">{alert.attack_type}</span>
                <span className="text-xs text-gray-300">{alert.rule_name}</span>
                <span className="text-[11px] text-gray-400">
                  {translateSeverity(alert.severity)} · {dayjs(alert.timestamp).fromNow()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};

const DashboardPage = ({ onNavigate }) => {
  const {
    items: alerts,
    metrics,
    loadAlerts,
    refreshMetrics,
    setFilters,
    setSelectedAlert,
  } = useAlertsStore();
  const [lastActivity, setLastActivity] = useState(dayjs());
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [modelError, setModelError] = useState(null);

  const loadDashboardMetrics = useCallback(async () => {
    try {
      const data = await fetchDashboardMetrics();
      setDashboardMetrics(data);
      setDashboardError(null);
    } catch (error) {
      console.error("fetchDashboardMetrics failed", error);
      setDashboardError("No se pudieron cargar las métricas globales.");
    }
  }, []);

  const loadModelMetrics = useCallback(async () => {
    try {
      const data = await fetchModelPerformanceMetrics();
      setModelMetrics(data);
      setModelError(null);
    } catch (error) {
      console.error("fetchModelPerformanceMetrics failed", error);
      setModelError("No se pudo calcular el desempeño del modelo.");
    }
  }, []);

  useEffect(() => {
    if (!alerts.length) {
      loadAlerts();
    }
    if (!metrics) {
      refreshMetrics();
    }
  }, [alerts.length, metrics, loadAlerts, refreshMetrics]);

  useEffect(() => {
    loadDashboardMetrics();
    loadModelMetrics();
  }, [loadDashboardMetrics, loadModelMetrics]);

  useInterval(() => {
    loadAlerts();
    refreshMetrics();
    loadDashboardMetrics();
    loadModelMetrics();
    setLastActivity(dayjs());
  }, constants.REFRESH_INTERVAL_MS ?? 30 * 1000);

  const alertsToday = dashboardMetrics?.alerts_today ?? 0;
  const totalAlerts = dashboardMetrics?.total_alerts ?? alerts.length;
  const severitySnapshot =
    metrics?.total_counts_by_severity ??
    dashboardMetrics?.severity_last24h ??
    metrics?.counts_by_severity ??
    null;
  const last24hSeries = dashboardMetrics?.last24h_series ?? metrics?.last24h_series ?? [];
  const latestAlertText = dashboardMetrics?.latest_alert_timestamp
    ? dayjs(dashboardMetrics.latest_alert_timestamp).fromNow()
    : "sin registros recientes";

  const applyFiltersAndNavigate = (partialFilters = {}) => {
    setFilters({ ...defaultFilters, ...partialFilters });
    onNavigate?.("alertas");
  };

  const healthStatus = useMemo(() => {
    const helperSuffix = `Última alerta ${latestAlertText} · Refrescado ${lastActivity.format("HH:mm:ss")}`;
    if (!severitySnapshot) {
      return {
        text: "Recolectando métricas…",
        color: "bg-slate-700/70",
        icon: CheckCircleIcon,
        helper: helperSuffix,
      };
    }
    if (severitySnapshot.Critical > 0)
      return {
        text: "Alerta Crítica",
        color: "bg-red-600/80",
        icon: XCircleIcon,
        helper: `${severitySnapshot.Critical} incidentes críticos registrados · ${helperSuffix}`,
      };
    if (severitySnapshot.High > 0)
      return {
        text: "Actividad Sospechosa",
        color: "bg-yellow-600/80",
        icon: AlertTriangleIcon,
        helper: `${severitySnapshot.High} alertas de severidad alta registradas · ${helperSuffix}`,
      };
    return {
      text: "Red Segura",
      color: "bg-green-600/80",
      icon: CheckCircleIcon,
      helper: `Sin incidentes graves recientes · ${helperSuffix}`,
    };
  }, [severitySnapshot, latestAlertText, lastActivity]);

  const statusCauses = useMemo(() => {
    const windowStart = dayjs().subtract(2, "hour");
    return alerts
      .filter((alert) => dayjs(alert.timestamp).isAfter(windowStart))
      .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
      .slice(0, 3);
  }, [alerts]);

  const attackDistribution = useMemo(() => {
    if (!dashboardMetrics) {
      return { sorted: [], max: 0 };
    }
    const sorted = dashboardMetrics.attack_distribution
      .map((entry) => [entry.attack_type, entry.count])
      .sort(([, a], [, b]) => b - a);
    const max = sorted.length ? Math.max(...sorted.map(([, value]) => value)) : 0;
    return { sorted, max };
  }, [dashboardMetrics]);

  const recentAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);

  const handleDownloadSummary = () => {
    const rows = [
      ["Sección", "Clave", "Valor"],
      ["Resumen", "Generado", dayjs().format("YYYY-MM-DD HH:mm:ss")],
      ["Resumen", "Alertas Hoy", alertsToday],
      ["Resumen", "Alertas Totales", totalAlerts],
      [
        "Resumen",
        "Última alerta",
        dashboardMetrics?.latest_alert_timestamp
          ? dayjs(dashboardMetrics.latest_alert_timestamp).format("YYYY-MM-DD HH:mm:ss")
          : "Sin registros",
      ],
    ];
    const severityCounts = severitySnapshot ?? {};
    Object.entries(severityCounts).forEach(([severity, count]) => {
      rows.push(["Severidad", severity, count]);
    });
    attackDistribution.sorted.slice(0, 5).forEach(([tipo, total]) => {
      rows.push(["Top Ataques", tipo, total]);
    });
    const csv = rows.map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dashboard-resumen-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
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
      {dashboardError && (
        <p className="text-xs text-amber-400">
          {dashboardError} · reintentaremos automáticamente en los próximos segundos.
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <ServerStatusIndicator
          status={healthStatus}
          causes={statusCauses}
          onNavigateAlerts={(partial) => applyFiltersAndNavigate(partial)}
          helperCopy={dashboardHelp.serverStatus}
          onCauseClick={(alert) => {
            setSelectedAlert(alert);
            applyFiltersAndNavigate({ query: alert.rule_name, severity: [alert.severity] });
          }}
        />
        <CardMetric
          title="Alertas Hoy"
          value={alertsToday}
          description="Ir a la vista con ese rango"
          helperText={dashboardHelp.alertsToday}
          onClick={() =>
            applyFiltersAndNavigate({
              from_ts: dayjs().startOf("day").format("YYYY-MM-DDTHH:mm"),
              to_ts: dayjs().endOf("day").format("YYYY-MM-DDTHH:mm"),
            })
          }
        />
        <CardMetric
          title="Alertas Totales"
          value={totalAlerts}
          description="Ver todas las alertas"
          helperText={dashboardHelp.totalAlerts}
          onClick={() => applyFiltersAndNavigate({ ...defaultFilters })}
        />
        <CardMetric
          title="Versión del Sistema"
          value={constants.VERSION || "MVP"}
          tone="text-white"
          helperText={dashboardHelp.version}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-white/5 bg-slate-950/30 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Clasificación de severidad</p>
            <p className="text-xs text-gray-400">{dashboardHelp.severityIntro}</p>
          </div>
          <SeverityClassificationPopover />
        </div>
        <StatsCards
          counts={severitySnapshot ?? null}
          onFilter={(severity) =>
            applyFiltersAndNavigate(severity ? { severity: [severity] } : { ...defaultFilters })
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        <Card className="xl:col-span-2 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Actividad Últimas 24h</h2>
            <p className="text-xs text-gray-500 uppercase trackingwide">serie temporal</p>
          </div>
          <TimeSeriesMini
            chartHeightClass="h-64 xl:h-80"
            series={last24hSeries}
            onSelectRange={({ from, to }) =>
              applyFiltersAndNavigate({
                from_ts: dayjs(from).format("YYYY-MM-DDTHH:mm"),
                to_ts: dayjs(to).format("YYYY-MM-DDTHH:mm"),
              })
            }
          />
        </Card>
        <Card className="h-full flex flex-col">
          <h2 className="text-lg font-semibold text-white mb-4">Alertas Recientes</h2>
          <ul className="space-y-3 flex-1">
            {recentAlerts.map((alert) => (
              <li key={alert.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-sm hover:text-white rounded-xl border border-transparent hover:border-slate-600 px-2 py-2"
                  onClick={() => {
                    setSelectedAlert(alert);
                    applyFiltersAndNavigate({ query: alert.rule_name, severity: [alert.severity] });
                  }}
                >
                  <div className="flex flex-col text-left gap-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{alert.attack_type}</p>
                      <SeverityBadge value={alert.severity} />
                    </div>
                    <p className="text-xs text-gray-400">Regla: {alert.rule_name}</p>
                    <p className="text-[11px] text-slate-400">
                      {alert.src_ip}:{alert.src_port} → {alert.dst_ip}:{alert.dst_port}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 block">{dayjs(alert.timestamp).fromNow()}</span>
                    <p className="text-[11px] text-gray-300">
                      {formatPercent(getDisplayConfidence(alert.model_score, alert.model_label))}{" "}
                      {getConfidenceLabel(alert.model_label)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
            {!recentAlerts.length && <p className="text-gray-400 text-sm">Sin actividad reciente.</p>}
          </ul>
        </Card>
      </div>

      <ModelPerformancePanel data={modelMetrics} error={modelError} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-white mb-1">Distribución por Tipo de Ataque</h2>
          <p className="text-xs text-gray-500 mb-3">{dashboardHelp.attackDistribution}</p>
          <div className="space-y-3">
            {attackDistribution.sorted.map(([tipo, total]) => {
              const percentage = attackDistribution.max ? Math.round((total / attackDistribution.max) * 100) : 0;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => applyFiltersAndNavigate({ attack_type: [tipo] })}
                  className="w-full text-left"
                >
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>{tipo}</span>
                    <span className="font-semibold text-white">{total}</span>
                  </div>
                  <div className="w-full bg-gray-800/60 rounded-full h-2 mt-1">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${percentage}%` }} />
                  </div>
                </button>
              );
            })}
            {!attackDistribution.sorted.length && (
              <p className="text-gray-400 text-sm">Sin datos suficientes para graficar.</p>
            )}
          </div>
        </Card>
        <div className="grid gap-4">
          <Card>
            <p className="text-sm font-medium text-gray-400">Uso de CPU</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-bold text-white">35%</p>
              <button
                type="button"
                className="text-xs text-sky-300 underline"
                onClick={() => applyFiltersAndNavigate({ protocol: ["TCP"] })}
              >
                Ver procesos
              </button>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
              <div className="bg-green-500 h-2.5 rounded-full" style={{ width: "35%" }} />
            </div>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-400">Uso de Memoria</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-bold text-white">75%</p>
              <span className="text-xs text-gray-400">Nodos IDS</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
              <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: "75%" }} />
            </div>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-400">Espacio en Disco</p>
            <p className="text-2xl font-bold text-white mt-2">150 / 250 GB</p>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
              <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: "60%" }} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
