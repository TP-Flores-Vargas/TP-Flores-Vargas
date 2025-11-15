export const glossary = [
  {
    term: "DDoS (Distributed Denial of Service)",
    description:
      "Ataque coordinado que satura un servicio con tráfico desde múltiples orígenes. Nuestro modelo lo clasifica como severidad crítica porque interrumpe operaciones completas.",
    actions: ["Activar mitigación en el borde", "Coordinar con el ISP para filtrar IPs maliciosas"],
  },
  {
    term: "Infiltration",
    description:
      "Movimiento lateral o exfiltración detectada dentro de la red. Se considera crítico ya que implica compromiso del entorno.",
    actions: ["Aislar el host afectado", "Preservar evidencia para DFIR"],
  },
  {
    term: "SQL Injection",
    description:
      "Intentos de ejecutar comandos maliciosos en bases de datos a través de formularios web. El modelo lo marca como crítico por el riesgo de fuga de datos.",
    actions: ["Aplicar reglas WAF", "Revisar la sanitización de la app"],
  },
  {
    term: "Bot / Backdoor",
    description:
      "Tráfico que indica comunicación con centros de comando y control. Requiere contención inmediata.",
    actions: ["Desconectar el host", "Revocar credenciales utilizadas"],
  },
  {
    term: "BruteForce",
    description:
      "Intentos masivos de autenticación para romper credenciales. El modelo lo clasifica como severidad alta.",
    actions: ["Habilitar MFA", "Bloquear IP ofensora"],
  },
  {
    term: "PortScan",
    description:
      "Enumeración agresiva de puertos abiertos. Indica preparación de ataque, por eso se marca como alerta alta.",
    actions: ["Bloquear IP fuente", "Revisar exposición de servicios"],
  },
  {
    term: "XSS",
    description:
      "Inyección de scripts en aplicaciones web para robar sesiones. También se marca como alta.",
    actions: ["Configurar WAF", "Validar inputs en la aplicación"],
  },
  {
    term: "DoS",
    description:
      "Denegación de servicio puntual que afecta a un servicio específico. Se clasifica como severidad media.",
    actions: ["Aplicar rate limiting", "Monitorear si escala a DDoS"],
  },
  {
    term: "Benign",
    description:
      "Tráfico de referencia o datasets de laboratorio. Sirve como baseline y se marca como severidad baja.",
    actions: ["No requiere intervención, sólo se registra"],
  },
];

export const faqItems = [
  {
    question: "¿Cómo elijo el dataset correcto en el laboratorio?",
    answer:
      "Si quieres validar ataques específicos, usa el dataset de referencia. Si buscas reproducir tráfico real, usa el dataset sincronizado desde Zeek o sube tu CSV. El dataset activo es el que consume la simulación de alertas.",
  },
  {
    question: "¿Qué diferencia hay entre riesgo y confianza en el modelo?",
    answer:
      "Riesgo medio representa la probabilidad de ataque (0% = benigno, 100% = ataque). En las tablas mostramos también 'Confianza en benigno' para que sea más intuitivo; ambos valores provienen del mismo score del modelo CICIDS.",
  },
  {
    question: "¿Cómo interpreto el panel 'Actividad últimas 24h'?",
    answer:
      "La gráfica muestra las alertas por hora con línea fluorescente. Al pasar el cursor sobre un punto verás cuántas alertas se registraron y podrás filtrar la tabla para esa hora.",
  },
  {
    question: "¿Qué significa 'Forzar sincronización' en la pestaña Zeek?",
    answer:
      "Ejecuta el script `sync_zeek_and_simulate.sh` para copiar el último `conn.log` desde Zeek y generar alertas. Úsalo después de reiniciar la VM o cuando quieras refrescar el dataset sincronizado.",
  },
];
