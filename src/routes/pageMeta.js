(function () {
  window.Routes = window.Routes || {};
  window.Routes.pageMeta = {
    inicio: {
      title: 'Inicio',
      description:
        'Bienvenido al panel principal del Sistema IDS para instituciones educativas. Explora la misión del proyecto y accesos rápidos a los módulos clave.',
      actions: [
        { label: 'Ver Dashboard en vivo', target: 'dashboard', variant: 'primary', size: 'sm' },
        { label: 'Revisar Alertas', target: 'alertas', variant: 'secondary', size: 'sm' },
      ],
    },
    dashboard: {
      title: 'Dashboard en Tiempo Real',
      description:
        'Monitorea en vivo la salud de la red, la actividad de las alertas y el estado de los recursos críticos del sistema de detección.',
      actions: [
        { label: 'Ir a Alertas', target: 'alertas', variant: 'secondary', size: 'sm' },
      ],
    },
    alertas: {
      title: 'Centro de Alertas',
      description:
        'Consulta el historial completo de incidentes detectados, clasificados por criticidad, junto a su contexto operativo.',
      actions: [
        { label: 'Ver detalle actual', target: 'detalles-alerta', variant: 'primary', size: 'sm' },
      ],
    },
    'detalles-alerta': {
      title: 'Detalles de Alerta',
      description:
        'Analiza en profundidad una alerta, con pasos recomendados y datos técnicos para una respuesta rápida.',
      actions: [
        { label: 'Regresar al historial', target: 'alertas', variant: 'secondary', size: 'sm' },
      ],
    },
    reportes: {
      title: 'Reportes de Seguridad',
      description:
        'Genera reportes ejecutivos con métricas clave de comportamiento y evolución de amenazas para tu institución educativa.',
      actions: [
        { label: 'Configurar alertas críticas', target: 'configuracion', variant: 'secondary', size: 'sm' },
      ],
    },
    configuracion: {
      title: 'Configuración del Sistema',
      description:
        'Administra credenciales, notificaciones y tareas de mantenimiento para mantener protegido el entorno académico.',
      actions: [
        { label: 'Volver al Dashboard', target: 'dashboard', variant: 'secondary', size: 'sm' },
      ],
    },
    ayuda: {
      title: 'Centro de Ayuda',
      description:
        'Accede a glosarios y preguntas frecuentes para capacitar al personal en la operación del IDS educativo.',
    },
  };
})();
