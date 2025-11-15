import type { Severity } from "../api/alerts";
import { getSeverityTooltip } from "../content/contextualHelp";
import { translateSeverity } from "../utils/severity";
import { InfoTooltip } from "./InfoTooltip";

const palette: Record<Severity, string> = {
  Low: "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50",
  Medium: "bg-amber-500/20 text-amber-200 border border-amber-400/50",
  High: "bg-rose-500/20 text-rose-200 border border-rose-400/60",
  Critical: "bg-red-600/30 text-red-200 border border-red-400",
};

interface Props {
  value: Severity;
}

export const SeverityBadge = ({ value }: Props) => {
  const badge = (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${palette[value]}`}>
      {translateSeverity(value)}
    </span>
  );
  return <InfoTooltip content={getSeverityTooltip(value)}>{badge}</InfoTooltip>;
};
