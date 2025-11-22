import type { Alert } from "../api/alerts";
import { SeverityBadge } from "./SeverityBadge";
import { getConfidenceLabel, getDisplayConfidence, formatPercent } from "../utils/modelConfidence";
import { formatLocalTimestamp, formatUtcTimestamp } from "../utils/time";
import { translateAttackType } from "../utils/attackType";

interface Props {
  alert: Alert;
  onSelect: (alert: Alert) => void;
  highlighted?: boolean;
  rowIndex: number;
}

export const AlertRow = ({ alert, onSelect, highlighted, rowIndex }: Props) => {
  const handleRowClick = () => onSelect(alert);

  return (
    <tr
      data-testid={`alerts-row-${rowIndex}`}
      onClick={handleRowClick}
      className={`border-b border-gray-700/70 text-sm cursor-pointer ${
        highlighted ? "bg-emerald-500/10 animate-pulse" : "hover:bg-gray-800/60"
      }`}
    >
      <td className="px-3 py-2">
        <SeverityBadge value={alert.severity} />
      </td>
      <td className="px-3 py-2 font-mono text-xs text-gray-300">
        <div>{formatLocalTimestamp(alert.timestamp)}</div>
        <div className="text-[10px] text-gray-500">{formatUtcTimestamp(alert.timestamp)}</div>
      </td>
      <td className="px-3 py-2 font-semibold text-gray-100">{translateAttackType(alert.attack_type)}</td>
      <td className="px-3 py-2">
        <div className="font-mono text-xs text-gray-400">{alert.src_ip}</div>
        <div className="text-[11px] text-gray-500">→ {alert.dst_ip}</div>
      </td>
      <td className="px-3 py-2 text-gray-300">{alert.protocol}</td>
      <td className="px-3 py-2 text-sm text-gray-200">
        <div className="text-[11px] uppercase text-gray-500">Regla Zeek</div>
        <div className="font-semibold text-gray-100">{alert.rule_name}</div>
        <div className="font-mono text-xs text-gray-400">{alert.rule_id}</div>
        <div className="text-[11px] uppercase text-gray-500 mt-2">Modelo CICIDS</div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-sky-300">
            {formatPercent(getDisplayConfidence(alert.model_score, alert.model_label))}
          </span>
          <span className="text-xs text-gray-400">{getConfidenceLabel(alert.model_label)}</span>
        </div>
        {(alert.meta?.dataset_label || alert.meta?.dataset_source || alert.meta?.source) && (
          <div className="text-[11px] uppercase text-gray-500 mt-2">
            Fuente:{" "}
            <span className="text-gray-300">
              {(alert.meta?.dataset_label as string) ||
                (alert.meta?.dataset_source as string) ||
                (alert.meta?.source as string)}
            </span>
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(alert);
          }}
          className="text-sky-400 hover:text-sky-200 font-semibold"
        >
          Ver
        </button>
      </td>
    </tr>
  );
};
