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
  DoS: "Denegación de servicio",
  DDoS: "Denegación distribuida",
  PortScan: "Port scan / reconocimiento",
  BruteForce: "Fuerza bruta de credenciales",
  XSS: "Ataque web (XSS)",
  SQLi: "Ataque web (SQLi)",
  Bot: "Botnet / backdoor persistente",
  Infiltration: "Infiltración / exfiltración",
  Other: "Otras anomalías detectadas",
};

const severityLabels: Record<Severity, string> = {
  Critical: "Crítica",
  High: "Alta",
  Medium: "Media",
  Low: "Baja",
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
  const label = severityLabels[level] ?? level;
  return `${label}: ${info.criteria}. Qué hacer: ${info.response}. Ejemplos: ${
    attacks || "sin registros"
  }.`;
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
      "Los DDoS tumban servicios completos y requieren respuesta inmediata.",
  },
  {
    attack: "Infiltration",
    severity: "Critical",
    rationale:
      "Marcan intentos de exfiltración o movimiento lateral; se atienden como críticos.",
  },
  {
    attack: "SQLi",
    severity: "Critical",
    rationale:
      "Un SQLi exitoso expone datos sensibles, por eso se clasifica como crítico.",
  },
  {
    attack: "Bot",
    severity: "Critical",
    rationale:
      "Tráfico bot/backdoor implica control remoto del atacante y requiere contención inmediata.",
  },
  {
    attack: "BruteForce",
    severity: "High",
    rationale:
      "Buscan romper credenciales y abrir acceso, por eso se priorizan como altas.",
  },
  {
    attack: "PortScan",
    severity: "High",
    rationale:
      "Descubren superficie para explotación; el SOC los atiende como alertas altas.",
  },
  {
    attack: "XSS",
    severity: "High",
    rationale:
      "Los payloads XSS comprometen sesiones web y ameritan respuesta rápida (alerta alta).",
  },
  {
    attack: "DoS",
    severity: "Medium",
    rationale:
      "Una denegación aislada impacta un servicio puntual; se monitorea como alerta media.",
  },
  {
    attack: "Other",
    severity: "Medium",
    rationale:
      "Cualquier anomalía genérica se mantiene en observación como severidad media.",
  },
  {
    attack: "Benign",
    severity: "Low",
    rationale:
      "Tráfico benigno o datasets de laboratorio no requieren acción inmediata (severidad baja).",
  },
];

export const dashboardHelp = {
  alertsToday: "Cuántas alertas llevamos hoy; sirve para saber si el turno está tranquilo o cargado.",
  totalAlerts: "Total histórico desde la última limpieza de la base. Buen dato para ver tendencias.",
  version: "Número de versión del backend/frontend que estás usando en esta sesión.",
  serverStatus: "Muestra si hubo incidentes fuertes en las últimas 24h y qué tan reciente fue.",
  attackDistribution: "Divide las alertas por tipo de ataque para detectar patrones rápidamente.",
  severityIntro: "Filtra por nivel de riesgo o abre el modal para leer los criterios completos del modelo.",
};

export const alertsPageHelp = {
  filters:
    "Usa los filtros para acotar por severidad, tipo, protocolo o rango horario. El buscador acepta IPs, nombres de regla y texto libre.",
  table:
    "Cada fila resume el origen/destino, la regla Zeek y la confianza del modelo. Haz clic en “Ver” para abrir todos los detalles.",
};

export const zeekLabHelp = {
  datasetSelector:
    "Sube tu CSV o reutiliza el dataset sincronizado/de referencia; todos siguen el formato de conn.log convertido.",
  syntheticGenerator:
    "Si no llega tráfico real, enciende el generador y decide cuántas alertas por minuto quieres para mantener la demo viva.",
  simulation:
    "Genera alertas de prueba. Si no eliges un tipo específico, el modelo clasifica según el dataset activo.",
  commands:
    "Envía comandos SSH a tu VM (Zeek/Kali) para ejecutar zeekctl o scripts auxiliares. Configura las credenciales en backend/.env.",
};

export const reportsHelp = {
  summary:
    "Muestra estadísticas ejecutivas por rango (24h, 7d o 30d): severidad, reglas activas y porcentaje malicioso.",
  download:
    "Descarga el rango completo en CSV o una síntesis lista para compartir con tu equipo.",
};
