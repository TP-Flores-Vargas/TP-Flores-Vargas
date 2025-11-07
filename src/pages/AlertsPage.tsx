import { useEffect, useMemo, useState } from "react";

import type { Alert, Severity } from "../api/alerts";
import { FiltersBar } from "../components/FiltersBar";
import { AlertDrawer } from "../components/AlertDrawer";
import AlertDetailModal from "../components/alerts/AlertDetailModal";
import { AlertRow } from "../components/AlertRow";
import { StatsCards } from "../components/StatsCards";
import { TimeSeriesMini } from "../components/TimeSeriesMini";
import { useAlertsStore } from "../store/alerts";

type Props = {
  onSelectAlert?: (alert: Alert | null) => void;
};

export const AlertsPage = ({ onSelectAlert }: Props = {}) => {
  const {
    items,
    total,
    page,
    pageSize,
    sort,
    filters,
    loadAlerts,
    refreshMetrics,
    setFilters,
    setPagination,
    setSort,
    selectedAlert,
    setSelectedAlert,
    metrics,
    loading,
    liveEnabled,
    toggleLive,
    highlights,
    exportCsv,
    error,
  } = useAlertsStore();

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [filtersKey, page, pageSize, sort]);

  useEffect(() => {
    refreshMetrics();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSort = (column: string) => {
    const next = sort === column ? `-${column}` : column;
    setSort(next);
  };

  const handleSelect = (alert: Alert) => {
    setSelectedAlert(alert);
    onSelectAlert?.(alert);
  };

  const handleExport = async () => {
    const blob = await exportCsv();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `alerts_${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full" data-testid="alerts-page">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 uppercase">Centro de Alertas IDS</p>
            <h1 className="text-3xl font-bold text-white">Alertas en Tiempo Real</h1>
          </div>
          <button
            type="button"
            onClick={refreshMetrics}
            className="text-sm text-sky-400 underline"
          >
            Refrescar métricas
          </button>
        </div>

        <FiltersBar
          filters={filters}
          onChange={setFilters}
          onApply={loadAlerts}
          onReset={() => setFilters({ severity: [], attack_type: [], protocol: [], query: "", from_ts: null, to_ts: null })}
          liveEnabled={liveEnabled}
          onToggleLive={toggleLive}
          onExport={handleExport}
          loading={loading}
        />

        <StatsCards
          counts={metrics?.counts_by_severity ?? null}
          active={filters.severity.length === 1 ? (filters.severity[0] as Severity) : null}
          onFilter={(severity) => {
            if (severity === null) {
              setFilters({ severity: [] });
            } else {
              setFilters({ severity: [severity] });
            }
          }}
        />

        <div className="bg-slate-900/70 border border-gray-800/70 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-200 mb-2">Últimas 24h</p>
          <TimeSeriesMini series={metrics?.last24h_series ?? []} />
        </div>

        <div className="bg-slate-900/70 border border-gray-800/70 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <p className="text-sm text-gray-300">
              {loading ? "Cargando alertas..." : `${total} alertas filtradas`}
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <div className="overflow-auto">
            <table data-testid="alerts-table" className="min-w-full text-left">
              <thead className="text-xs uppercase tracking-wide text-gray-400 bg-slate-950/40">
                <tr>
                  <th className="px-3 py-2">Severidad</th>
                  <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort("timestamp")}>
                    Fecha
                  </th>
                  <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort("attack_type")}>
                    Tipo
                  </th>
                  <th className="px-3 py-2">IPs</th>
                  <th className="px-3 py-2">Protocolo</th>
                  <th className="px-3 py-2 cursor-pointer" onClick={() => handleSort("model_score")}>
                    Score / Regla
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((alert, index) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    rowIndex={index}
                    onSelect={handleSelect}
                    highlighted={Boolean(highlights[alert.id])}
                  />
                ))}
              </tbody>
            </table>
            {items.length === 0 && !loading && (
              <p className="text-center text-sm text-gray-400 py-6">Sin resultados para los filtros aplicados.</p>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-sm text-gray-300">
            <div>
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1 border border-gray-700 rounded disabled:opacity-40"
                onClick={() => setPagination(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                ←
              </button>
              <button
                type="button"
                className="px-3 py-1 border border-gray-700 rounded disabled:opacity-40"
                onClick={() => setPagination(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
      {selectedAlert &&
        (isDesktop ? (
          <AlertDrawer
            alert={selectedAlert}
            onClose={() => {
              setSelectedAlert(null);
              onSelectAlert?.(null);
            }}
          />
        ) : (
          <AlertDetailModal
            alert={selectedAlert}
            onClose={() => {
              setSelectedAlert(null);
              onSelectAlert?.(null);
            }}
          />
        ))}
    </div>
  );
};

export default AlertsPage;
