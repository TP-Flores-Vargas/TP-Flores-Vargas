import type { AttackType, Severity } from "../api/alerts";

type AttackCategory = AttackType | "WEB_ATTACK" | "HEARTBLEED";

type SeverityGuideline = {
  summary: string;
  cvss: string;
  response: string;
  attackExamples: AttackCategory[];
  criteria: string;
};

const attackTypeLabels: Record<AttackCategory, string> = {
  Benign: "BENIGN · tráfico normal o datasets de laboratorio",
  DoS: "DOS · GoldenEye, Slowloris, Slowhttptest",
  DDoS: "DDOS · UDP/HTTP Flood (Hulk, LOIC)",
  PortScan: "PORTSCAN · reconocimiento de superficie",
  BruteForce: "BRUTE_FORCE · Patator (FTP/SSH) / fuerza bruta",
  XSS: "Web Attack · payload XSS",
  SQLi: "Web Attack · intento SQLi",
  Bot: "BOT · backdoor/botnet persistente",
  Infiltration: "INFILTRATION · movimiento lateral/exfiltración",
  Other: "Otras anomalías",
  WEB_ATTACK: "Web Attack · incluye XSS/SQLi detectados",
  HEARTBLEED: "Hartbleed · fuga mediante OpenSSL",
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
    + "y al rango de puntajes CVSS v3.1. El modelo entrenado con Zeek_CICIDS2017 agrupa las etiquetas del dataset "
    + "en categorías operativas (Benign, Web Attack, Brute Force/Patator, Bot, DoS/DDoS, PortScan, Infiltration, Heartbleed/Other) "
    + "y evalúa cada flujo según métricas reales de conn.log (bytes_total, pkts_ratio, protocolos).",
  reference: "NIST SP 800-61r2 · CVSS v3.1",
  guidelines: {
    Critical: {
      summary:
        "Interrupción total, impacto en producción o exfiltración en curso. Corresponde a incidentes de severidad 1 "
        + "de NIST y CVSS ≥ 9.0 y se reserva para tráfico volumétrico, exfiltración o Heartbleed confirmado.",
      cvss: "CVSS ≥ 9.0",
      response: "Intervenir en <15 minutos, activar plan de respuesta.",
      attackExamples: ["DDoS", "Infiltration", "Bot", "HEARTBLEED"],
      criteria: "Impacto directo en disponibilidad/confidencialidad con evidencia de compromiso activo o C2 persistente.",
    },
    High: {
      summary:
        "Compromiso con gran probabilidad de escalamiento: intrusiones autenticadas, fuerza bruta exitosa o "
        + "exploit web que ya superó controles básicos. Equivale a CVSS 7.0-8.9.",
      cvss: "CVSS 7.0 – 8.9",
      response: "Mitigar en <1 hora, aislar hosts afectados.",
      attackExamples: ["BruteForce", "WEB_ATTACK"],
      criteria: "Alto potencial de intrusión (fuerza bruta o payloads Web Attack) con probabilidad de escalamiento.",
    },
    Medium: {
      summary:
        "Eventos con impacto moderado: escaneos, intentos fallidos o explotación limitada. Mapeado a CVSS 4.0-6.9.",
      cvss: "CVSS 4.0 – 6.9",
      response: "Revisar en el mismo turno y crear ticket de seguimiento.",
      attackExamples: ["PortScan", "DoS"],
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

const formatAttackExamples = (examples: AttackCategory[]) =>
  examples
    .map((attack) => attackTypeLabels[attack] ?? attack)
    .join(", ");

export const describeAttackExamples = (examples: AttackCategory[]) =>
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
  attack: AttackCategory;
  severity: Severity;
  rationale: string;
};

export const attackSeverityMatrix: AttackSeverityEntry[] = [
  {
    attack: "DDoS",
    severity: "Critical",
    rationale:
      "Un DDOS volumétrico (Hulk/LOIC) satura bytes_total y pkts_total; requiere intervención inmediata.",
  },
  {
    attack: "Bot",
    severity: "Critical",
    rationale:
      "Actividad BOT implica control remoto del atacante y amerita contención crítica.",
  },
  {
    attack: "Infiltration",
    severity: "Critical",
    rationale:
      "INFILTRATION identifica movimiento lateral o exfiltración; se trata como incidente crítico.",
  },
  {
    attack: "HEARTBLEED",
    severity: "Critical",
    rationale:
      "Heartbleed expone memoria sensible de servidores; cualquier detección se eleva a crítico.",
  },
  {
    attack: "WEB_ATTACK",
    severity: "High",
    rationale:
      "WEB_ATTACK agrupa XSS/SQLi detectados en HTTP; se atienden como alertas altas para evitar acceso a datos.",
  },
  {
    attack: "BruteForce",
    severity: "High",
    rationale:
      "Intentos Patator / fuerza bruta contra credenciales elevan el riesgo de escalamiento; se priorizan como altos.",
  },
  {
    attack: "DoS",
    severity: "Medium",
    rationale:
      "Los ataques DoS (GoldenEye, Slowloris, Slowhttptest) generan disrupciones puntuales; se monitorean como severidad media.",
  },
  {
    attack: "PortScan",
    severity: "Medium",
    rationale:
      "Los portscan elevan pkts_ratio de reconocimiento; se revisan y filtran como alertas medias.",
  },
  {
    attack: "Benign",
    severity: "Low",
    rationale:
      "BENIGN corresponde a tráfico normal o datasets de laboratorio, sirve como baseline y no requiere acción inmediata.",
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
