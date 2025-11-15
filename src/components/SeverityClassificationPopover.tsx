import { Fragment } from "react";

import { ContextPopover } from "./ContextPopover";
import { attackSeverityMatrix, severityFramework } from "../content/contextualHelp";
import { translateSeverity } from "../utils/severity";

interface Props {
  className?: string;
}

export const SeverityClassificationPopover = ({ className = "" }: Props) => (
  <ContextPopover
    triggerLabel="¿Cómo clasifica el modelo?"
    title="Clasificación basada en NIST + CVSS"
    description={severityFramework.description}
    className={className}
  >
    <p>
      Cada alerta se etiqueta con la severidad que corresponde al vector CVSS estimado y al impacto observado
      por el modelo CICIDS. Aquí verás en qué nivel cae cada tipo de ataque.
    </p>
    <div className="space-y-2">
      {attackSeverityMatrix.map((entry) => (
        <Fragment key={entry.attack}>
          <div className="flex items-start justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5">
            <div>
              <p className="text-xs font-semibold text-white">{entry.attack}</p>
              <p className="text-[11px] text-gray-400">{entry.rationale}</p>
            </div>
            <span className="text-[11px] font-semibold text-sky-300">
              {translateSeverity(entry.severity)}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  </ContextPopover>
);
