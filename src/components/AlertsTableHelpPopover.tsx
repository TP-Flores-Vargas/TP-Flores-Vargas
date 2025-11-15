import { ContextPopover } from "./ContextPopover";

const sections = [
  {
    title: "Severidad",
    description:
      "Nivel de urgencia asignado por el modelo + reglas. Te dice qué tan rápido deberías actuar.",
    details: "Valores posibles: Crítica, Alta, Media o Baja.",
  },
  {
    title: "Fecha",
    description:
      "Momento exacto en el que Zeek registró la conexión que disparó la alerta (UTC). Sirve para correlacionar con otros sistemas.",
  },
  {
    title: "Tipo de ataque",
    description:
      "Clasificación que hace el modelo (PortScan, DDoS, BruteForce, etc.). Ayuda a entender el vector y contexto.",
  },
  {
    title: "IPs",
    description:
      "Incluye IP/puerto de origen y destino. Úsalos para ubicar al host comprometido o la víctima.",
  },
  {
    title: "Protocolo",
    description:
      "Protocolo de transporte o aplicación involucrado (TCP, UDP, HTTP, DNS, ...). Te orienta sobre la superficie afectada.",
  },
];

const ruleAndScoreCopy = [
  {
    title: "Reglas Zeek",
    description:
      "Cada regla es una firma escrita en Zeek (por ejemplo ZEEK-CVE, ZEEK-BruteForce, Zeek BENIGN). Describe qué condición activó el evento.",
    note: "Si ves nombres personalizados, provienen de tus propios scripts o del dataset sincronizado.",
  },
  {
    title: "Score del modelo CICIDS",
    description:
      "Porcentaje de confianza que el modelo de ML asigna a la alerta (0% = benigno, 100% = ataque seguro). Úsalo para priorizar dentro del mismo tipo.",
    note: "Se calcula a partir de las características de tráfico (duración, bytes, flags TCP, etc.) aprendidas del dataset CICIDS2017.",
  },
];

export const AlertsTableHelpPopover = () => (
  <ContextPopover
    triggerLabel="¿Qué significa cada columna?"
    title="Guía rápida de la tabla de alertas"
    description="Consulta este resumen para interpretar los encabezados antes de filtrar o exportar."
  >
    <div className="space-y-2">
      {sections.map((section) => (
        <div key={section.title} className="rounded-lg border border-white/5 bg-black/20 p-2">
          <p className="text-sm font-semibold text-white">{section.title}</p>
          <p className="text-xs text-gray-300">{section.description}</p>
          {section.details && <p className="text-[11px] text-gray-400 mt-1">{section.details}</p>}
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-2">
      {ruleAndScoreCopy.map((item) => (
        <div key={item.title}>
          <p className="text-sm font-semibold text-white">{item.title}</p>
          <p className="text-xs text-gray-300">{item.description}</p>
          {item.note && <p className="text-[11px] text-gray-400 mt-1">{item.note}</p>}
        </div>
      ))}
    </div>
  </ContextPopover>
);
