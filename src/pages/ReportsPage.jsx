import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { fetchAlerts, fetchReportsSummary } from "../api/alerts";
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
import { translateAttackType } from "../utils/attackType";

const RANGE_OPTIONS = {
  "1h": { label: "Última hora", hours: 1 },
  "24h": { label: "Últimas 24h", hours: 24 },
  "7d": { label: "Últimos 7 días", hours: 24 * 7 },
  "30d": { label: "Últimos 30 días", hours: 24 * 30 },
};

const severityOrder = ["Critical", "High", "Medium", "Low"];
const EMPTY_SEVERITY_COUNTS = {
  Critical: 0,
  High: 0,
  Medium: 0,
  Low: 0,
};
const formatNumber = (value) => new Intl.NumberFormat("es-PE").format(value);
const TABLE_PAGE_SIZE = 20;

const SectionTitle = ({ title, description }) => (
  <div className="mb-4">
    <h2 className="text-lg font-semibold text-white">{title}</h2>
    {description ? <p className="text-sm text-gray-400">{description}</p> : null}
  </div>
);

const buildRangeParams = (hours) => {
  const rangeStart = typeof hours === "number" ? dayjs().subtract(hours, "hour") : null;
  return {
    from_ts: rangeStart ? rangeStart.toISOString() : undefined,
    to_ts: dayjs().toISOString(),
  };
};

const ReportsPage = () => {
  const metrics = useAlertsStore((state) => state.metrics);
  const refreshMetrics = useAlertsStore((state) => state.refreshMetrics);
  const [rangeKey, setRangeKey] = useState("1h");
  const [downloading, setDownloading] = useState(false);
  const [summaryDownloading, setSummaryDownloading] = useState(false);
  const [reportSummary, setReportSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [reportSample, setReportSample] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState(null);
  const [tablePage, setTablePage] = useState(1);

  useEffect(() => {
    if (!metrics) {
      refreshMetrics();
    }
  }, [metrics, refreshMetrics]);

  const selectedRange = RANGE_OPTIONS[rangeKey];

  useEffect(() => {
    setTablePage(1);
  }, [rangeKey]);

  useEffect(() => {
    let cancelled = false;
    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      const params = buildRangeParams(selectedRange.hours);
      try {
        const data = await fetchReportsSummary(params);
        if (!cancelled) {
          setReportSummary(data);
        }
      } catch (error) {
        console.error("fetchReportsSummary failed", error);
        if (!cancelled) {
          setSummaryError("No se pudo cargar el resumen del periodo.");
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };
    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [rangeKey, selectedRange.hours]);

  useEffect(() => {
    let cancelled = false;
    const loadTablePage = async () => {
      setTableLoading(true);
      setTableError(null);
      const params = buildRangeParams(selectedRange.hours);
      try {
        const data = await fetchAlerts({
          page: tablePage,
          page_size: TABLE_PAGE_SIZE,
          sort: "-timestamp",
          from_ts: params.from_ts,
          to_ts: params.to_ts,
        });
        if (!cancelled) {
          setReportSample(data.items);
          setReportTotal(data.total);
        }
      } catch (error) {
        console.error("fetchAlerts sample failed", error);
        if (!cancelled) {
          setTableError("No se pudieron cargar las alertas de auditoría.");
        }
      } finally {
        if (!cancelled) {
          setTableLoading(false);
        }
      }
    };
    loadTablePage();
    return () => {
      cancelled = true;
    };
  }, [rangeKey, tablePage, selectedRange.hours]);

  const reportSummaryCounts = reportSummary?.severity_counts ?? EMPTY_SEVERITY_COUNTS;
  const severityTotals = severityOrder.map((level) => ({
    level,
    count: reportSummaryCounts[level] ?? 0,
  }));
  const attackDistribution = (reportSummary?.attack_distribution ?? []).map(({ attack_type, count }) => ({
    attack: attack_type,
    label: translateAttackType(attack_type),
    count,
  }));
  const topRules = (reportSummary?.top_rules ?? []).map(({ rule_name, count }) => ({
    rule: rule_name,
    count,
  }));
  const averageRisk = reportSummary?.average_score ?? 0;
  const maliciousRatio = Math.round(reportSummary?.malicious_ratio ?? 0);
  const uniqueSources = reportSummary?.unique_sources ?? 0;
  const totalAlertsInPeriod = reportSummary?.total_alerts ?? reportTotal;

  const totalTablePages = Math.max(1, Math.ceil(reportTotal / TABLE_PAGE_SIZE));
  useEffect(() => {
    setTablePage((prev) => Math.min(prev, totalTablePages));
  }, [totalTablePages]);

  const tableFrom = reportTotal ? (tablePage - 1) * TABLE_PAGE_SIZE + 1 : 0;
  const tableTo = Math.min(reportTotal, tablePage * TABLE_PAGE_SIZE);

  const tableRows = useMemo(
    () =>
      reportSample.map((alert) => ({
        ...alert,
        attack_label: translateAttackType(alert.attack_type),
        timestampLabel: dayjs(alert.timestamp).format("DD MMM HH:mm"),
        ipSummary: `${alert.src_ip}:${alert.src_port} → ${alert.dst_ip}:${alert.dst_port}`,
        confidenceValue: getDisplayConfidence(alert.model_score, alert.model_label),
      })),
    [reportSample],
  );

  const handleCsvDownload = async () => {
    setDownloading(true);
    try {
      const params = buildRangeParams(selectedRange.hours);
      const aggregated = [];
      let page = 1;
      const maxPages = 5;
      const pageSize = rangeKey === "24h" ? 300 : 250;
      while (true) {
        const data = await fetchAlerts({
          page,
          page_size: pageSize,
          sort: "-timestamp",
          from_ts: params.from_ts,
          to_ts: params.to_ts,
        });
        aggregated.push(...data.items);
        if (data.items.length < pageSize) {
          break;
        }
        if (page >= maxPages) {
          break;
        }
        page += 1;
      }
      const headers = ["Fecha", "Severidad", "Tipo", "Origen", "Destino", "Protocolo", "Regla", "Score"];
      const rows = aggregated.slice(0, 1000).map((alert) => [
        dayjs(alert.timestamp).format("YYYY-MM-DD HH:mm:ss"),
        alert.severity,
        alert.attack_type,
        `${alert.src_ip}:${alert.src_port}`,
        `${alert.dst_ip}:${alert.dst_port}`,
        alert.protocol,
        alert.rule_name,
        formatPercent(getDisplayConfidence(alert.model_score, alert.model_label)),
      ]);
      const csv = [headers, ...rows]
        .map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alerts-report-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
        ["Resumen", "Alertas", totalAlertsInPeriod],
        ["Resumen", "Riesgo promedio", formatPercent(averageRisk)],
        ["Resumen", "% Maliciosas", `${maliciousRatio}%`],
        ["Resumen", "IPs Únicas", uniqueSources],
      ];
      severityTotals.forEach(({ level, count }) => rows.push(["Severidad", level, count]));
      attackDistribution
        .slice(0, 5)
        .forEach(({ label, count }) => rows.push(["Ataques", label, count]));
      topRules.forEach(({ rule, count }) => rows.push(["Reglas", rule, count]));
      const csv = rows.map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alerts-summary-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
            {downloading ? "Generando CSV..." : "Descargar CSV de alertas"}
          </button>
          <button
            type="button"
            onClick={handleSummaryDownload}
            disabled={summaryDownloading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white disabled:opacity-60"
          >
            {summaryDownloading ? "Compilando..." : "Descargar informe"}
          </button>
        </div>
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
        {summaryLoading && (
          <span className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" /> Cargando rango…
          </span>
        )}
        {summaryError && <span className="text-xs text-red-400">{summaryError}</span>}
        <ContextPopover
          triggerLabel="¿Cómo se calculan?"
          title="Rangos disponibles"
          description="Cada botón aplica una ventana relativa hacia atrás desde ahora."
        >
          <p>1h: última hora. 24h: últimas 24 horas. 7d: acumulado de la última semana. 30d: último mes.</p>
          <p className="text-xs text-gray-400">
            La página usa métricas del backend para resumir el periodo y solo descarga los registros necesarios.
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
          <p className="text-3xl font-bold text-white mt-1">{formatNumber(totalAlertsInPeriod)}</p>
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
            {attackDistribution.slice(0, 5).map(({ attack, label, count }) => (
              <li key={attack} className="flex items-center justify-between text-sm text-gray-300">
                <span className="px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-xs">{label}</span>
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
                      {row.attack_label}
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
              {!tableRows.length && !tableLoading && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    No hay alertas registradas en el periodo seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {tableLoading && (
          <p className="px-4 py-2 text-xs text-gray-400">Cargando muestra de alertas…</p>
        )}
        {tableError && <p className="px-4 py-2 text-xs text-red-400">{tableError}</p>}
        <div className="flex flex-col gap-2 px-4 py-3 text-xs text-gray-400 md:flex-row md:items-center md:justify-between">
          <p>
            {reportTotal
              ? `Mostrando ${formatNumber(tableFrom)}-${formatNumber(tableTo)} de ${formatNumber(reportTotal)} alertas del periodo.`
              : "No hay alertas para este periodo."}
          </p>
          {totalTablePages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTablePage((prev) => Math.max(1, prev - 1))}
                disabled={tablePage === 1}
                className="rounded px-3 py-1 border border-slate-700 bg-slate-900 text-white disabled:opacity-50"
              >
                Anterior
              </button>
              <span>
                {tablePage} / {totalTablePages}
              </span>
              <button
                type="button"
                onClick={() => setTablePage((prev) => Math.min(totalTablePages, prev + 1))}
                disabled={tablePage === totalTablePages}
                className="rounded px-3 py-1 border border-slate-700 bg-slate-900 text-white disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;
