import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { fetchAlerts } from "../api/alerts";
import Card from "../components/common/Card.jsx";
import { HelpCircleIcon } from "../assets/icons/index.jsx";
import { SeverityBadge } from "../components/SeverityBadge";
import { SeverityClassificationPopover } from "../components/SeverityClassificationPopover";
import { TimeSeriesMini } from "../components/TimeSeriesMini";
import { InfoTooltip } from "../components/InfoTooltip";
import { ContextPopover } from "../components/ContextPopover";
import { useAlertsStore } from "../store/alerts";
import { reportsHelp } from "../content/contextualHelp";
import { formatPercent, getDisplayConfidence, getConfidenceLabel } from "../utils/modelConfidence";
import { translateSeverity } from "../utils/severity";

const RANGE_OPTIONS = {
  all: { label: "Todo", hours: null, description: "Datos acumulados" },
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
  const metrics = useAlertsStore((state) => state.metrics);
  const refreshMetrics = useAlertsStore((state) => state.refreshMetrics);
  const exportCsv = useAlertsStore((state) => state.exportCsv);
  const reportRanges = useAlertsStore((state) => state.reportRanges);
  const setReportRangeData = useAlertsStore((state) => state.setReportRangeData);
  const [rangeKey, setRangeKey] = useState("all");
  const [downloading, setDownloading] = useState(false);
  const [summaryDownloading, setSummaryDownloading] = useState(false);
  const [reportAlerts, setReportAlerts] = useState(reportRanges["all"] ?? []);
  const [reportLoading, setReportLoading] = useState(false);
  const [rangeError, setRangeError] = useState(null);

  useEffect(() => {
    if (!metrics) {
      refreshMetrics();
    }
  }, [metrics, refreshMetrics]);

  const selectedRange = RANGE_OPTIONS[rangeKey];

  useEffect(() => {
    if (reportRanges[rangeKey]) {
      setReportAlerts(reportRanges[rangeKey]);
    }
  }, [rangeKey, reportRanges]);

  useEffect(() => {
    let cancelled = false;
    const fetchRangeAlerts = async () => {
      const rangeHours = selectedRange.hours;
      const rangeStart = typeof rangeHours === "number" ? dayjs().subtract(rangeHours, "hour") : null;
      const maxPages = rangeKey === "all" ? 100 : 5;
      setReportLoading(true);
      setRangeError(null);
      try {
        const aggregated = [];
        const pageSize = 400;
        let page = 1;
        let reachedCap = false;
        while (true) {
          const data = await fetchAlerts({
            page,
            page_size: pageSize,
            sort: "-timestamp",
            from_ts: rangeStart ? rangeStart.toISOString() : undefined,
          });
          aggregated.push(...data.items);
          if (data.items.length < pageSize) {
            break;
          }
          if (page >= maxPages) {
            reachedCap = true;
            break;
          }
          page += 1;
        }
        if (!cancelled) {
          setReportAlerts(aggregated);
          setReportRangeData(rangeKey, aggregated);
          if (reachedCap) {
            setRangeError("La muestra se truncó al máximo permitido. Aplica un rango más acotado para más detalle.");
          }
        }
      } catch (error) {
        console.error("No se pudo cargar el rango", error);
        if (!cancelled) {
          setRangeError("No se pudo cargar el periodo seleccionado.");
        }
      } finally {
        if (!cancelled) {
          setReportLoading(false);
        }
      }
    };

    fetchRangeAlerts();

    return () => {
      cancelled = true;
    };
  }, [rangeKey, selectedRange.hours, setReportRangeData]);

  const rangeAlerts = reportAlerts;

  const severityOrder = ["Critical", "High", "Medium", "Low"];
  const severityTotals = useMemo(
    () =>
      severityOrder.map((level) => ({
        level,
        count: rangeAlerts.filter((alert) => alert.severity === level).length,
      })),
    [rangeAlerts],
  );

  const attackDistribution = useMemo(() => {
    const counts = rangeAlerts.reduce((acc, alert) => {
      acc[alert.attack_type] = (acc[alert.attack_type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([attack, count]) => ({ attack, count }))
      .sort((a, b) => b.count - a.count);
  }, [rangeAlerts]);

  const topRules = useMemo(() => {
    const counts = rangeAlerts.reduce((acc, alert) => {
      acc[alert.rule_name] = (acc[alert.rule_name] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rangeAlerts]);

  const averageRisk = useMemo(() => {
    if (!rangeAlerts.length) return 0;
    return rangeAlerts.reduce((sum, alert) => sum + alert.model_score, 0) / rangeAlerts.length;
  }, [rangeAlerts]);

  const maliciousRatio = useMemo(() => {
    if (!rangeAlerts.length) return 0;
    const malicious = rangeAlerts.filter((alert) => alert.model_label === "malicious").length;
    return Math.round((malicious / rangeAlerts.length) * 100);
  }, [rangeAlerts]);

  const uniqueSources = useMemo(
    () => new Set(rangeAlerts.map((alert) => alert.src_ip)).size,
    [rangeAlerts],
  );

  const tableRows = useMemo(
    () =>
      rangeAlerts.slice(0, 20).map((alert) => ({
        ...alert,
        timestampLabel: dayjs(alert.timestamp).format("DD MMM HH:mm"),
        ipSummary: `${alert.src_ip}:${alert.src_port} → ${alert.dst_ip}:${alert.dst_port}`,
        confidenceValue: getDisplayConfidence(alert.model_score, alert.model_label),
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
      const rows = [
        ["Sección", "Clave", "Valor"],
        ["Resumen", "Generado", dayjs().format("YYYY-MM-DD HH:mm:ss")],
        ["Resumen", "Rango", selectedRange.label],
        ["Resumen", "Alertas", rangeAlerts.length],
        ["Resumen", "Riesgo promedio", formatPercent(averageRisk)],
        ["Resumen", "% Maliciosas", `${maliciousRatio}%`],
        ["Resumen", "IPs Únicas", uniqueSources],
      ];
      severityTotals.forEach(({ level, count }) => rows.push(["Severidad", level, count]));
      attackDistribution.slice(0, 5).forEach(({ attack, count }) => rows.push(["Ataques", attack, count]));
      topRules.forEach(({ rule, count }) => rows.push(["Reglas", rule, count]));
      const csv = rows.map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alerts-summary-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
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
          <InfoTooltip content={reportsHelp.download}>
            <button
              type="button"
              onClick={handleCsvDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {downloading ? "Generando CSV..." : "Descargar CSV de alertas"}
            </button>
          </InfoTooltip>
          <InfoTooltip content={reportsHelp.download}>
            <button
              type="button"
              onClick={handleSummaryDownload}
              disabled={summaryDownloading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white disabled:opacity-60"
            >
              {summaryDownloading ? "Compilando..." : "Descargar informe"}
            </button>
          </InfoTooltip>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <SeverityClassificationPopover />
        <span>Consulta el marco si necesitas justificar por qué cada ataque cae en cierto nivel.</span>
      </div>
      <div className="flex items-start gap-2 text-xs text-gray-400 max-w-3xl">
        <HelpCircleIcon className="w-4 h-4 text-gray-500 mt-0.5" aria-hidden />
        <p>{reportsHelp.summary}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(RANGE_OPTIONS).map(([key, value]) => (
          <button
            key={key}
            type="button"
            onClick={() => setRangeKey(key)}
            aria-pressed={rangeKey === key}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition ${
              rangeKey === key ? "bg-sky-500 text-white border-sky-400" : "bg-gray-900 text-gray-300 border-gray-700"
            }`}
          >
            {value.label}
          </button>
        ))}
        {reportLoading && (
          <span className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" /> Cargando rango…
          </span>
        )}
        {rangeError && <span className="text-xs text-red-400">{rangeError}</span>}
        <ContextPopover
          triggerLabel="¿Cómo se calculan?"
          title="Rangos disponibles"
          description="Cada botón aplica una ventana relativa hacia atrás desde ahora."
        >
          <p>Todo: sin filtro temporal (muestra el histórico completo).</p>
          <p>24h: últimas 24 horas. 7d: acumulado de la última semana. 30d: último mes.</p>
          <p className="text-xs text-gray-400">
            Puedes combinarlo con filtros manuales (fechas en el panel de Alertas) si necesitas un rango específico.
          </p>
        </ContextPopover>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Alertas en el periodo</span>
            <InfoTooltip content="Cantidad de alertas registradas dentro del rango seleccionado.">
              <HelpCircleIcon className="w-4 h-4 text-gray-500" />
            </InfoTooltip>
          </div>
          <p className="text-3xl font-bold text-white mt-1">{formatNumber(rangeAlerts.length)}</p>
          <p className="text-xs text-gray-500 mt-1">{selectedRange.label}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Riesgo medio</span>
            <InfoTooltip content="Promedio del score del modelo (0% benigno, 100% ataque confirmado).">
              <HelpCircleIcon className="w-4 h-4 text-gray-500" />
            </InfoTooltip>
          </div>
          <p className="text-3xl font-bold text-white mt-1">{formatPercent(averageRisk)}</p>
          <p className="text-[11px] text-gray-500 mt-1">0% benigno · 100% ataque</p>
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
                    <span>{translateSeverity(level)}</span>
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
          <SectionTitle title="Serie temporal (24h)" description="Comparativo contra la última jornada." />
          <TimeSeriesMini series={metrics?.last24h_series ?? []} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Principales tipos de ataque" description="Top 5 por volumen en el periodo." />
          <ul className="space-y-3">
            {attackDistribution.slice(0, 5).map(({ attack, count }) => (
              <li key={attack} className="flex items-center justify-between text-sm text-gray-300">
                <span className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-xs">{attack}</span>
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
                <th className="py-2 pr-4 font-medium">Tipo</th>
                <th className="py-2 pr-4 font-medium">IPs</th>
                <th className="py-2 pr-4 font-medium">Protocolo</th>
                <th className="py-2 font-medium">Regla / Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {tableRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/60 transition">
                  <td className="py-3 pr-4 whitespace-nowrap">{row.timestampLabel}</td>
                  <td className="py-3 pr-4">
                    <SeverityBadge value={row.severity} />
                  </td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-1 rounded-full bg-gray-800 text-xs border border-gray-700">
                      {row.attack_type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-300">{row.ipSummary}</td>
                  <td className="py-3 pr-4 text-xs uppercase text-gray-400">{row.protocol}</td>
                  <td className="py-3 pr-4">
                    <p className="truncate text-sm font-semibold text-white">{row.rule_name}</p>
                    <p className="text-xs text-gray-400">
                      {formatPercent(row.confidenceValue)} ({getConfidenceLabel(row.model_label)})
                    </p>
                  </td>
                </tr>
              ))}
              {!tableRows.length && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
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
