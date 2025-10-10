(function () {
  window.helpContent = window.helpContent || {};

  window.helpContent.glossary = {
    'Escaneo de Puertos (Port Scan)':
      'Es como si alguien estuviera tocando todas las puertas y ventanas de una casa para ver cuáles están abiertas. Los atacantes hacen esto para encontrar vulnerabilidades en la red.',
    Malware:
      'Es un término general para cualquier software malicioso (virus, troyanos, spyware) diseñado para dañar o infiltrarse en un sistema sin el consentimiento del usuario.',
    Phishing:
      'Es un intento de engañar a una persona para que revele información sensible (como contraseñas o datos de tarjetas) haciéndose pasar por una entidad de confianza, generalmente a través de un correo electrónico.',
    'Denegación de Servicio (DoS/DDoS)':
      'Es un ataque que busca hacer que un servicio (como la página web del colegio) no esté disponible para sus usuarios, inundándolo con una cantidad masiva de tráfico falso.',
    'Política de Red Violada':
      'Ocurre cuando un usuario en la red utiliza una aplicación o servicio que está prohibido por las normas del colegio, como programas para descargar archivos (P2P), que pueden ser inseguros y consumir mucho ancho de banda.',
  };

  window.helpContent.faqItems = [
    {
      question: "¿Qué hago si veo una alerta 'Crítica'?",
      answer: `1. Mantén la calma. El sistema ya ha detectado el problema.
2. Ve a la pantalla de 'Alertas' y haz clic en la alerta para ver los detalles.
3. Sigue los 'Pasos Recomendados'. La acción más común es identificar el equipo afectado por su IP y desconectarlo de la red.`,
    },
    {
      question: '¿Cómo sé que el sistema está funcionando?',
      answer:
        'En el Dashboard asegúrate de que el indicador de estado diga "Red Segura" o "Actividad Sospechosa". También puedes ver la hora de la "Última actividad analizada", que debe ser reciente.',
    },
  ];
})();
