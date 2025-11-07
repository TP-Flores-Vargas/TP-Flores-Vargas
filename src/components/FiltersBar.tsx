import { useState } from "react";

import type { AttackType, Protocol, Severity } from "../api/alerts";

interface Props {
  filters: {
    severity: Severity[];
    attack_type: AttackType[];
    protocol: Protocol[];
    from_ts: string | null;
    to_ts: string | null;
    query: string;
  };
  onChange: (partial: Partial<Props["filters"]>) => void;
  onApply: () => void;
  onReset: () => void;
  liveEnabled: boolean;
  onToggleLive: () => void;
  onExport: () => void;
  loading: boolean;
}

const severityOptions: Severity[] = ["Low", "Medium", "High", "Critical"];
const attackOptions: AttackType[] = [
  "Benign",
  "DoS",
  "DDoS",
  "PortScan",
  "BruteForce",
  "XSS",
  "SQLi",
  "Bot",
  "Infiltration",
  "Other",
];
const protocolOptions: Protocol[] = ["TCP", "UDP", "ICMP", "HTTP", "HTTPS", "DNS", "Other"];

export const FiltersBar = ({
  filters,
  onChange,
  onApply,
  onReset,
  liveEnabled,
  onToggleLive,
  onExport,
  loading,
}: Props) => {
  const [collapsed, setCollapsed] = useState(true);

  const toggleValue = (key: "severity" | "attack_type" | "protocol", value: string) => {
    const list = filters[key];
    const exists = list.includes(value as never);
    const next = exists ? list.filter((item) => item !== value) : [...list, value];
    onChange({ [key]: next } as Partial<Props["filters"]>);
  };

  const renderToggleGroup = (
    label: string,
    options: string[],
    key: "severity" | "attack_type" | "protocol",
  ) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wide">
        <span>{label}</span>
        {filters[key].length > 0 && (
          <button
            type="button"
            className="text-[10px] text-sky-300 underline"
            onClick={() => onChange({ [key]: [] } as Partial<Props["filters"]>)}
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = filters[key].includes(option as never);
          return (
            <button
              key={`${label}-${option}`}
              type="button"
              className={`px-2 py-1 text-xs rounded-full border transition ${
                active
                  ? "bg-sky-500/20 border-sky-400 text-sky-100"
                  : "border-gray-600 text-gray-400 hover:text-white"
              }`}
              onClick={() => toggleValue(key, option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );

  const hasFilters =
    filters.severity.length ||
    filters.attack_type.length ||
    filters.protocol.length ||
    filters.from_ts ||
    filters.to_ts ||
    filters.query;

  return (
    <div className="bg-slate-900/70 border border-gray-800/70 rounded-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
        <div>
          <p className="text-sm text-gray-300 font-semibold">Filtros avanzados</p>
          <p className="text-xs text-gray-500">{hasFilters ? "Filtros aplicados" : "Sin filtros"}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 text-xs border border-gray-600 rounded text-gray-300 hover:text-white"
            onClick={onReset}
          >
            Limpiar todo
          </button>
          <button
            type="button"
            className="px-3 py-1 text-xs border border-gray-600 rounded text-gray-300 hover:text-white"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? "Mostrar filtros" : "Ocultar filtros"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col text-xs text-gray-400 gap-1">
              <label>Desde</label>
              <input
                type="datetime-local"
                className="bg-slate-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                value={filters.from_ts ?? ""}
                onChange={(e) => onChange({ from_ts: e.target.value || null })}
              />
            </div>
            <div className="flex flex-col text-xs text-gray-400 gap-1">
              <label>Hasta</label>
              <input
                type="datetime-local"
                className="bg-slate-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                value={filters.to_ts ?? ""}
                onChange={(e) => onChange({ to_ts: e.target.value || null })}
              />
            </div>
            <div className="flex flex-col text-xs text-gray-400 gap-1 md:col-span-2">
              <label>Búsqueda</label>
              <input
                type="search"
                placeholder="IP, regla, ataque..."
                className="bg-slate-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                value={filters.query}
                onChange={(e) => onChange({ query: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && onApply()}
              />
            </div>
          </div>

          {renderToggleGroup("Severidad", severityOptions, "severity")}

          <div className="grid gap-4 md:grid-cols-2">
            {renderToggleGroup("Tipo de ataque", attackOptions, "attack_type")}
            {renderToggleGroup("Protocolo", protocolOptions, "protocol")}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg"
              onClick={onApply}
              disabled={loading}
            >
              Aplicar
            </button>
            <button
              type="button"
              data-testid="export-csv"
              className="px-3 py-2 bg-slate-800 border border-gray-600 text-sm text-gray-200 rounded-lg"
              onClick={onExport}
            >
              Export CSV
            </button>
            <button
              type="button"
              data-testid="live-toggle"
              aria-pressed={liveEnabled}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                liveEnabled ? "bg-rose-600 text-white" : "bg-slate-800 text-gray-200 border border-gray-600"
              }`}
              onClick={onToggleLive}
            >
              {liveEnabled ? "Live ON" : "Live OFF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
