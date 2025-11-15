import type { AttackType, Severity } from "../api/alerts";

type SeverityGuideline = {
  summary: string;
  cvss: string;
  response: string;
  attackExamples: AttackType[];
  criteria: string;
};

const attackTypeLabels: Record<AttackType, string> = {
  Benign: "Tráfico benigno (baseline)",
  DoS: "Denegación de servicio (DoS)",
  DDoS: "Denegación distribuida (DDoS)",
  PortScan: "Port scan / reconocimiento",
  BruteForce: "Fuerza bruta de credenciales",
  XSS: "Web attack · Cross-Site Scripting",
  SQLi: "Web attack · Inyección SQL",
  Bot: "Botnet / backdoor persistente",
  Infiltration: "Infiltración y exfiltración",
  Other: "Otras anomalías detectadas",
};

export const severityOrder: Severity[] = ["Critical", "High", "Medium", "Low"];

export const severityFramework: {
  title: string;
  description: string;
  reference: string;
  guidelines: Record<Severity, SeverityGuideline>;
} = {
  title: "Marco de severidad (NIST SP 800-61 + CVSS v3.1)",
  description:
    "Clasificamos cada alerta alineada al incidente handling guide de NIST SP 800-61 rev. 2 "
    + "y al rango de puntajes CVSS v3.1. Así cada nivel comunica impacto, urgencia y ejemplos de ataques.",
  reference: "NIST SP 800-61r2 · CVSS v3.1",
  guidelines: {
    Critical: {
      summary:
        "Interrupción total, impacto en producción o exfiltración en curso. Corresponde a incidentes de severidad 1 "
        + "de NIST y CVSS ≥ 9.0.",
      cvss: "CVSS ≥ 9.0",
      response: "Intervenir en <15 minutos, activar plan de respuesta.",
      attackExamples: ["DDoS", "Infiltration", "Bot", "SQLi"],
      criteria: "Impacto directo en disponibilidad/confidencialidad con evidencia de compromiso activo.",
    },
    High: {
      summary:
        "Compromiso con gran probabilidad de escalamiento: intrusiones autenticadas, fuerza bruta exitosa o "
        + "movimientos laterales detectados. Equivale a CVSS 7.0-8.9.",
      cvss: "CVSS 7.0 – 8.9",
      response: "Mitigar en <1 hora, aislar hosts afectados.",
      attackExamples: ["BruteForce", "PortScan", "XSS"],
      criteria: "Alto potencial de intrusión (credenciales/superficie web) con probabilidad de escalamiento.",
    },
    Medium: {
      summary:
        "Eventos con impacto moderado: escaneos, intentos fallidos o explotación limitada. Mapeado a CVSS 4.0-6.9.",
      cvss: "CVSS 4.0 – 6.9",
      response: "Revisar en el mismo turno y crear ticket de seguimiento.",
      attackExamples: ["DoS", "Other"],
      criteria: "Disrupción parcial o intentos que requieren seguimiento pero no hay abuso confirmado.",
    },
    Low: {
      summary:
        "Tráfico conocido, ejercicios o falsos positivos que sirven como contexto. CVSS < 4 y categoría informativa.",
      cvss: "CVSS < 4.0",
      response: "Monitoreo continuo; sin acción inmediata.",
      attackExamples: ["Benign"],
      criteria: "Eventos esperados, simulaciones o tráfico etiquetado como benigno por el modelo.",
    },
  },
};

const formatAttackExamples = (examples: AttackType[]) =>
  examples
    .map((attack) => attackTypeLabels[attack] ?? attack)
    .join(", ");

export const describeAttackExamples = (examples: AttackType[]) =>
  formatAttackExamples(examples);

export const getSeverityTooltip = (level: Severity): string => {
  const info = severityFramework.guidelines[level];
  const attacks = formatAttackExamples(info.attackExamples);
  return `${level}: ${info.criteria} ${info.cvss}. Respuesta sugerida: ${
    info.response
  }. Ejemplos: ${attacks || "sin datos"}.`;
};

export type AttackSeverityEntry = {
  attack: AttackType;
  severity: Severity;
  rationale: string;
};

export const attackSeverityMatrix: AttackSeverityEntry[] = [
  {
    attack: "DDoS",
    severity: "Critical",
    rationale:
      "Eventos DDoS degradan disponibilidad de forma inmediata y suelen afectar múltiples activos a la vez.",
  },
  {
    attack: "Infiltration",
    severity: "Critical",
    rationale:
      "Señales de exfiltración o movimiento lateral validado. El modelo detecta payloads asociados a fugas de datos.",
  },
  {
    attack: "SQLi",
    severity: "Critical",
    rationale:
      "Intentos exitosos de inyección SQL pueden dar acceso a bases sensibles, por eso se marcan como críticos.",
  },
  {
    attack: "Bot",
    severity: "Critical",
    rationale:
      "Presencia de tráfico bot/backdoor implica control remoto potencial. Se clasifica como crítico para remediación inmediata.",
  },
  {
    attack: "BruteForce",
    severity: "High",
    rationale:
      "Ataques de fuerza bruta comprometen credenciales y abren paso a intrusiones. Se elevan como severidad alta.",
  },
  {
    attack: "PortScan",
    severity: "High",
    rationale:
      "Escaneos agresivos descubren superficie para explotación. El modelo prioriza estos eventos como altos.",
  },
  {
    attack: "XSS",
    severity: "High",
    rationale:
      "Payloads XSS comprometen integridad de sesiones web. Si el modelo detecta firmas, se marca alto.",
  },
  {
    attack: "DoS",
    severity: "Medium",
    rationale:
      "Denegaciones aisladas afectan un servicio puntual y se monitorean para ver si escalan.",
  },
  {
    attack: "Other",
    severity: "Medium",
    rationale:
      "Cualquier anomalía sin firma clara se mantiene en observación mientras se valida el contexto.",
  },
  {
    attack: "Benign",
    severity: "Low",
    rationale:
      "Tráfico etiquetado como benigno o datasets de laboratorio se usa como referencia y no requiere acción.",
  },
];

export const dashboardHelp = {
  alertsToday:
    "Total de alertas registradas desde las 00:00 UTC del día corriente. Sirve para dimensionar actividad diaria.",
  totalAlerts:
    "Conteo acumulado desde la última reinicialización de la base. Útil para capacity planning y tendencias.",
  version:
    "Versión del stack de monitoreo. Incluye cambios relevantes para el dashboard y el pipeline de ingesta.",
  serverStatus:
    "Indicador de salud basado en las últimas 24h de severidad. Usa el marco NIST + CVSS para priorizar.",
  attackDistribution:
    "Breakdown de alertas por tipo detectado. Ayuda a entender qué vector requiere acciones defensivas.",
  severityIntro:
    "Este bloque resume cómo el modelo aplica la metodología NIST + CVSS para asignar severidad a cada alerta.",
};

export const alertsPageHelp = {
  filters:
    "Filtra por severidad, tipo de ataque, protocolo o rango temporal. El buscador acepta IPs, reglas y etiquetas.",
  table:
    "La tabla muestra los campos clave del IDS. Coloca el cursor sobre la severidad o los valores para ver ayudas."
    + " El modelo CICIDS entrega el score en porcentaje para contextualizar la confianza.",
};

export const zeekLabHelp = {
  datasetSelector:
    "Puedes subir un CSV propio, usar el dataset sincronizado desde Zeek o cargar el dataset de referencia "
    + "curado. Todos respetan el mismo formato que `conn.log` convertido.",
  syntheticGenerator:
    "El generador interno permite mantener tráfico cuando no hay captura real. Ajusta el rate (alertas/min) y "
    + "habilita/deshabilita sin reiniciar el backend.",
  simulation:
    "La simulación fuerza al backend a crear alertas artificiales, ideal para pruebas end-to-end. Si no seleccionas "
    + "un tipo, el modelo predice según el dataset activo.",
  commands:
    "Los comandos se ejecutan vía SSH en la VM de Zeek/Kali para operar `zeekctl`, convertir logs o depurar."
    + " Configura tus credenciales en backend/.env.",
};

export const reportsHelp = {
  summary:
    "Los reportes agregan alertas en bloques de 24h, 7d o 30d con foco ejecutivo: severidad, reglas activas y "
    + "porcentaje de alertas maliciosas.",
  download:
    "Descarga el universo filtrado en CSV o un resumen listo para compartir vía correo o tickets.",
};
