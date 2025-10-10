(function () {
  window.mockAlerts = [
    {
      id: 1,
      timestamp: '2025-10-09T21:10:00',
      criticidad: 'Alta',
      tipo: 'Malware Detectado',
      ipOrigen: '192.168.1.105',
      ipDestino: '104.18.32.229',
      puertoDestino: 443,
      protocolo: 'TCP',
      detalles:
        'Se detectó tráfico consistente con el troyano "Emotet". El equipo está intentando contactar a un servidor de Comando y Control (C&C).',
      recomendacion: `1. **Aislar el equipo:** Desconecte inmediatamente el computador con la IP 192.168.1.105 de la red (cable y WiFi).
 2. **Analizar con antivirus:** Ejecute un análisis completo y actualizado del antivirus en el equipo afectado.
 3. **Cambiar credenciales:** Si el usuario del equipo ha iniciado sesión en cuentas importantes, cambie sus contraseñas desde un equipo limpio.`,
    },
    {
      id: 2,
      timestamp: '2025-10-09T20:45:12',
      criticidad: 'Media',
      tipo: 'Escaneo de Puertos',
      ipOrigen: '200.48.225.10',
      ipDestino: '192.168.1.1',
      puertoDestino: '1-1024',
      protocolo: 'TCP',
      detalles:
        'Una IP externa está escaneando múltiples puertos en el router principal de la escuela. Esto suele ser una fase de reconocimiento previa a un ataque.',
      recomendacion: `1. **Monitorear la IP:** Vigile la actividad de la IP 200.48.225.10. Si persiste, considere bloquearla.
 2. **Revisar reglas del Firewall:** Asegúrese de que solo los puertos necesarios estén abiertos al exterior en la configuración del router.
 3. **No se requiere acción inmediata** si el escaneo se detiene, pero manténgase alerta.`,
    },
    {
      id: 3,
      timestamp: '2025-10-09T18:15:30',
      criticidad: 'Baja',
      tipo: 'Política de Red Violada',
      ipOrigen: '192.168.1.112',
      ipDestino: 'N/A',
      puertoDestino: 'N/A',
      protocolo: 'P2P',
      detalles:
        'Se detectó tráfico de tipo Peer-to-Peer (BitTorrent), el cual consume mucho ancho de banda y puede ser una fuente de malware.',
      recomendacion: `1. **Identificar al usuario:** Corresponde al equipo del laboratorio de computación.
 2. **Comunicar la política:** Recuerde al usuario o al responsable del aula que el uso de aplicaciones P2P no está permitido.
 3. **Considerar bloqueo:** Si la actividad persiste, se puede configurar el firewall para bloquear este tipo de tráfico.`,
    },
    {
      id: 4,
      timestamp: '2025-10-08T11:05:00',
      criticidad: 'Alta',
      tipo: 'Intento de Phishing',
      ipOrigen: '185.125.218.45',
      ipDestino: '192.168.1.50',
      puertoDestino: 25,
      protocolo: 'SMTP',
      detalles:
        'Se detectó un correo electrónico entrante desde una IP maliciosa conocida que contenía un enlace a un sitio de phishing que suplanta a Microsoft Office 365.',
      recomendacion: `1. **Alertar a los usuarios:** Envíe un comunicado a todo el personal para no abrir correos de remitentes desconocidos y no hacer clic en enlaces sospechosos.
 2. **Eliminar el correo:** Si es posible, pida al usuario del equipo 192.168.1.50 que elimine el correo sin abrirlo.
 3. **Bloquear remitente:** Bloquee la IP de origen en su servidor de correo o firewall si es posible.`,
    },
  ];
})();
