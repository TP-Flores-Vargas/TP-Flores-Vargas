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
    {
      id: 5,
      timestamp: '2025-10-07T09:40:00',
      criticidad: 'Media',
      tipo: 'Intrusión SSH',
      ipOrigen: '38.21.150.23',
      ipDestino: '192.168.1.30',
      puertoDestino: 22,
      protocolo: 'TCP',
      detalles:
        'Se registraron múltiples intentos fallidos de autenticación mediante SSH hacia el servidor académico. Los intentos se originaron desde una dirección IP extranjera.',
      recomendacion: `1. **Bloquear la IP 38.21.150.23:** Aplique una regla temporal en el firewall para detener nuevos intentos.
 2. **Habilitar autenticación multifactor:** Si es posible, agregue MFA para los accesos administrativos.
 3. **Verificar credenciales:** Cambie las contraseñas de las cuentas administrativas si es que pudieron haber sido expuestas.`,
    },
    {
      id: 6,
      timestamp: '2025-10-06T15:05:00',
      criticidad: 'Baja',
      tipo: 'Uso Anómalo de Ancho de Banda',
      ipOrigen: '192.168.1.180',
      ipDestino: 'N/A',
      puertoDestino: 'N/A',
      protocolo: 'HTTP',
      detalles:
        'El equipo del laboratorio 12 presenta un consumo de ancho de banda 5 veces superior al promedio habitual. Se observó streaming de video en resolución 4K durante horario de clases.',
      recomendacion: `1. **Contactar al docente encargado:** Verifique si el uso corresponde a una clase autorizada.
 2. **Aplicar políticas de calidad de servicio (QoS):** Limite el ancho de banda para actividades no prioritarias en horario escolar.
 3. **Registrar el evento:** Documente la actividad para evaluar ajustes en las políticas de uso aceptable.`,
    },
    {
      id: 7,
      timestamp: '2025-10-05T22:18:00',
      criticidad: 'Alta',
      tipo: 'Ataque DDoS Mitigado',
      ipOrigen: 'Varias fuentes',
      ipDestino: '179.6.25.10',
      puertoDestino: 443,
      protocolo: 'TCP',
      detalles:
        'El proveedor de internet reportó y mitigó un pico de tráfico anómalo dirigido a la página web institucional. Se identificaron más de 15.000 solicitudes por segundo durante 3 minutos.',
      recomendacion: `1. **Coordinar con el proveedor:** Solicite el reporte detallado del incidente y confirme que las medidas de mitigación sigan activas.
 2. **Comunicar al personal directivo:** Informe brevemente del evento y las acciones tomadas.
 3. **Monitorear la disponibilidad:** Revise el tiempo de respuesta del portal institucional durante las próximas horas.`,
    },
    {
      id: 8,
      timestamp: '2025-09-30T12:30:00',
      criticidad: 'Media',
      tipo: 'USB No Autorizado',
      ipOrigen: 'Equipo Biblioteca 03',
      ipDestino: 'N/A',
      puertoDestino: 'N/A',
      protocolo: 'USB',
      detalles:
        'Se detectó la conexión de un dispositivo USB no registrado en un equipo público. El dispositivo contenía archivos ejecutables desconocidos.',
      recomendacion: `1. **Retirar el dispositivo:** Solicite al usuario desconectar el USB inmediatamente.
 2. **Analizar el contenido:** Revise el dispositivo con un antivirus actualizado antes de volver a conectarlo.
 3. **Actualizar la política de uso:** Refuerce la comunicación sobre el uso de dispositivos externos en equipos del colegio.`,
    },
  ];
})();
