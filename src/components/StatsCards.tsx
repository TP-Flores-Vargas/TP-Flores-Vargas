import type { Severity, SeverityCounts } from "../api/alerts";
import { getSeverityTooltip } from "../content/contextualHelp";
import { InfoTooltip } from "./InfoTooltip";
import { HelpCircleIcon } from "../assets/icons/index.jsx";

const severityCards: Array<{ key: Severity | null; label: string; color: string }> = [
  { key: null, label: "Total", color: "bg-slate-800 border border-slate-600 text-gray-100" },
  { key: "Critical", label: "Críticas", color: "bg-red-500/20 text-red-200 border border-red-400/40" },
  { key: "High", label: "Altas", color: "bg-rose-500/20 text-rose-200 border border-rose-400/50" },
  { key: "Medium", label: "Medias", color: "bg-amber-500/20 text-amber-200 border border-amber-400/50" },
  { key: "Low", label: "Bajas", color: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40" },
];

interface Props {
  counts: SeverityCounts | null;
  active?: Severity | null;
  onFilter?: (severity: Severity | null) => void;
}

export const StatsCards = ({ counts, active = null, onFilter }: Props) => {
  const total =
    (counts?.Critical ?? 0) +
    (counts?.High ?? 0) +
    (counts?.Medium ?? 0) +
    (counts?.Low ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {severityCards.map((card) => {
        const value =
          card.key === null
            ? total
            : counts
            ? counts[card.key as keyof SeverityCounts] ?? 0
            : "--";
        const isActive = active === card.key;
        const tooltip =
          card.key === null ? null : getSeverityTooltip(card.key as Severity);
        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onFilter?.(card.key)}
            className={`rounded-xl p-4 text-left transition ${card.color} ${
              isActive ? "ring-2 ring-offset-2 ring-sky-400" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide">{card.label}</p>
              {tooltip && (
                <InfoTooltip content={tooltip} align="right">
                  <span className="inline-flex rounded-full border border-white/15 bg-black/30 p-1 text-gray-200 hover:text-white">
                    <HelpCircleIcon className="w-3.5 h-3.5" aria-hidden />
                  </span>
                </InfoTooltip>
              )}
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </button>
        );
      })}
    </div>
  );
};
