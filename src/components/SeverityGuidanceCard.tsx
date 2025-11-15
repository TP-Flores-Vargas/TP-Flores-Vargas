import { HelpCircleIcon } from "../assets/icons/index.jsx";
import type { Severity } from "../api/alerts";
import {
  describeAttackExamples,
  severityFramework,
  severityOrder,
} from "../content/contextualHelp";

interface Props {
  compact?: boolean;
  className?: string;
}

export const SeverityGuidanceCard = ({ compact = false, className = "" }: Props) => (
  <section
    className={`rounded-2xl border border-white/5 bg-slate-900/70 p-4 text-gray-200 ${className}`}
    aria-label="Ayuda contextual sobre severidad"
  >
    <div className="flex gap-3">
      <HelpCircleIcon className="w-5 h-5 text-sky-300 shrink-0" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-white">{severityFramework.title}</p>
        <p className="text-xs text-gray-400">{severityFramework.description}</p>
        <p className="text-[11px] text-gray-500 mt-1">{severityFramework.reference}</p>
      </div>
    </div>
    <div
      className={`mt-4 grid gap-3 ${
        compact ? "md:grid-cols-2 text-xs" : "sm:grid-cols-2 text-sm"
      }`}
    >
      {severityOrder.map((level) => {
        const info = severityFramework.guidelines[level as Severity];
        return (
          <div
            key={level}
            className="rounded-xl border border-white/5 bg-black/20 p-3"
          >
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-400">
              <span>{level}</span>
              <span className="text-[10px] text-gray-500">{info.cvss}</span>
            </div>
            <p className="mt-1 text-gray-200">{info.summary}</p>
            <p className="mt-1 text-[11px] text-gray-400">{info.criteria}</p>
            <p className="mt-2 text-[11px] text-sky-300">{info.response}</p>
            <p className="mt-1 text-[11px] text-gray-500">
              Ejemplos: {describeAttackExamples(info.attackExamples)}
            </p>
          </div>
        );
      })}
    </div>
  </section>
);
