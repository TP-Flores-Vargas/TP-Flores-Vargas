import dayjs from "dayjs";

import type { Alert } from "../api/alerts";
import { SeverityBadge } from "./SeverityBadge";

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
        {dayjs(alert.timestamp).format("YYYY-MM-DD HH:mm:ss")}
      </td>
      <td className="px-3 py-2 font-semibold text-gray-100">{alert.attack_type}</td>
      <td className="px-3 py-2">
        <div className="font-mono text-xs text-gray-400">{alert.src_ip}</div>
        <div className="text-[11px] text-gray-500">→ {alert.dst_ip}</div>
      </td>
      <td className="px-3 py-2 text-gray-300">{alert.protocol}</td>
      <td className="px-3 py-2 text-sm text-gray-200">
        <div>{alert.rule_name}</div>
        <div className="text-xs text-gray-400">{(alert.model_score * 100).toFixed(1)}% · {alert.model_label}</div>
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
