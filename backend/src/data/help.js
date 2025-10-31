export const helpContent = {
  glossary: {
    'Escaneo de Puertos (Port Scan)':
      'Intento de identificar puertos abiertos en un equipo o red para encontrar servicios expuestos.',
    Malware:
      'Software malicioso diseñado para infiltrarse o dañar sistemas, como virus, gusanos o troyanos.',
    Phishing:
      'Estrategia de ingeniería social que busca obtener información confidencial suplantando la identidad de una entidad confiable.',
    'Denegación de Servicio (DoS/DDoS)':
      'Ataque orientado a saturar un servicio con tráfico falso, impidiendo que usuarios legítimos accedan.',
    'Política de Red Violada':
      'Uso de aplicaciones o servicios prohibidos por las políticas internas, como aplicaciones P2P o proxys no autorizados.',
    'Intrusión Interna':
      'Actividad anómala generada por cuentas legítimas que podría indicar abuso de privilegios o credenciales comprometidas.',
  },
  faqItems: [
    {
      question: "¿Qué hago si veo una alerta 'Crítica'?",
      answer:
        'Desconecte inmediatamente el equipo involucrado, notifique al responsable TI y siga los pasos recomendados en los detalles de la alerta.',
    },
    {
      question: '¿Cómo sé que el sistema está analizando la red?',
      answer:
        'Revise el Dashboard: el indicador de estado mostrará la última actividad. También puede consultar el historial paginado en la vista de alertas.',
    },
    {
      question: '¿Puedo generar reportes en PDF?',
      answer:
        'Desde la sección de reportes puede generar un resumen descargable. El backend produce un archivo en base64 listo para convertirse en PDF.',
    },
  ],
};
