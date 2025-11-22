export const glossary = [
  {
    term: "DDoS (Denegación de servicio distribuida)",
    description:
      "Ataque coordinado que satura un servicio con tráfico desde múltiples orígenes. Se clasifica como crítica porque interrumpe operaciones completas.",
    actions: ["Activar mitigación en el borde", "Coordinar con el ISP para filtrar IPs maliciosas"],
  },
  {
    term: "Bot / Backdoor",
    description:
      "Tráfico que indica comunicación con centros de comando y control. Requiere contención inmediata.",
    actions: ["Desconectar el host", "Revocar credenciales utilizadas"],
  },
  {
    term: "BRUTE_FORCE",
    description:
      "Intentos masivos de autenticación para romper credenciales. El modelo lo clasifica como severidad alta.",
    actions: ["Habilitar MFA", "Bloquear IP ofensora"],
  },
  {
    term: "Escaneo de puertos",
    description:
      "Enumeración agresiva de puertos abiertos. Indica preparación de ataque, por eso se marca como alerta alta.",
    actions: ["Bloquear IP fuente", "Revisar exposición de servicios"],
  },
  {
    term: "DOS",
    description:
      "Denegación de servicio puntual que afecta a un servicio específico. Se clasifica como severidad media.",
    actions: ["Aplicar rate limiting", "Monitorear si escala a DDoS"],
  },
  {
    term: "Benigno",
    description:
      "Tráfico de referencia o datasets de laboratorio. Sirve como baseline y se marca como severidad baja.",
    actions: ["No requiere intervención, sólo se registra"],
  },
];

export const faqItems = [
  {
    question: "¿Qué significan los niveles de alerta?",
    answer:
      "Crítica significa que algo está dañando o puede detener el servicio y hay que actuar ya. Alta indica riesgo claro de intrusión y debe atenderse en la misma hora. Media es actividad sospechosa que conviene revisar en el turno. Baja suele ser tráfico conocido o de prueba, se deja registrado sin urgencia.",
  },
  {
    question: "¿Qué información debo revisar primero?",
    answer:
      "Empieza por la tarjeta de estado y la gráfica de las últimas 24h: si suben las alertas críticas o altas, filtra la tabla por esos niveles. Al abrir una alerta revisa origen/destino, la regla que se activó y la hora para saber a qué servicio impacta.",
  },
  {
    question: "¿Cómo priorizo si hay muchas alertas?",
    answer:
      "Usa los filtros de severidad y tipo de ataque para quedarte con las críticas y altas. Luego agrupa por origen o destino para ver si provienen del mismo lugar y descarga el reporte rápido si debes escalarlo al equipo.",
  },
  {
    question: "¿Qué hago si creo que es un falso positivo?",
    answer:
      "Comprueba si la IP o el dominio ya son conocidos y si el tráfico coincide con tareas habituales (copias, actualizaciones). Si todo luce normal, marca la alerta como revisada y comenta por qué, para que el resto del equipo lo sepa.",
  },
];
