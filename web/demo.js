const Demo = (() => {
  const highlightClass = 'pulse-highlight';

  function toCamelCase(value) {
    return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  function createDemo() {
    const startButton = document.getElementById('demoPlay');
    const resetButton = document.getElementById('demoReset');
    const narration = document.getElementById('demoNarration');
    const toastStack = document.getElementById('demoToastStack');
    const timeline = document.getElementById('incidentTimeline');

    if (!startButton || !resetButton || !narration || !toastStack) {
      return;
    }

    const trackedMap = new Map();
    document.querySelectorAll('[data-demo-id]').forEach((element) => {
      const id = element.dataset.demoId;
      if (!id) {
        return;
      }

      trackedMap.set(id, element);
      if (element.dataset.demoOriginal === undefined) {
        element.dataset.demoOriginal = element.textContent.trim();
      }
      element.dataset.demoOriginalClass = element.className;

      const trackedStyle = element.dataset.demoTrackStyle;
      if (trackedStyle) {
        trackedStyle.split(',').map((prop) => prop.trim()).filter(Boolean).forEach((prop) => {
          const camel = toCamelCase(prop);
          const key = `demoOriginal${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
          element.dataset[key] = element.style[camel] || '';
        });
      }
    });

    const baseTimelineLength = timeline ? timeline.children.length : 0;

    let timers = [];
    let running = false;

    function getTracked(id) {
      return trackedMap.get(id) || null;
    }

    function clearTimers() {
      timers.forEach((timer) => clearTimeout(timer));
      timers = [];
    }

    function clearHighlights() {
      document.querySelectorAll(`.${highlightClass}`).forEach((element) => {
        element.classList.remove(highlightClass);
      });
    }

    function highlightElement(selector) {
      const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!element) {
        return;
      }

      clearHighlights();
      element.classList.add(highlightClass);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showNarration(message, stepIndex) {
      if (typeof stepIndex === 'number') {
        narration.innerHTML = `<strong>Paso ${stepIndex + 1} de ${steps.length}:</strong> ${message}`;
      } else {
        narration.textContent = message;
      }
      narration.classList.add('visible');
    }

    function pushToast(title, message) {
      const toast = document.createElement('article');
      toast.className = 'demo-toast';
      toast.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
      toastStack.append(toast);

      requestAnimationFrame(() => {
        toast.classList.add('visible');
      });

      const hideTimer = window.setTimeout(() => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => {
          toast.remove();
        }, { once: true });
      }, 6000);

      timers.push(hideTimer);
    }

    function updateText(id, value) {
      const element = getTracked(id);
      if (element) {
        element.textContent = value;
      }
    }

    function updateTrend(id, value, trendClass) {
      const element = getTracked(id);
      if (!element) {
        return;
      }

      element.textContent = value;
      if (trendClass) {
        const baseClasses = (element.dataset.demoOriginalClass || '')
          .split(/\s+/)
          .filter(Boolean)
          .filter((className) => !className.startsWith('trend-'));
        baseClasses.push(trendClass);
        element.className = baseClasses.join(' ');
      }
    }

    function updateChip(id, value, toneClass) {
      const element = getTracked(id);
      if (!element) {
        return;
      }

      element.textContent = value;
      if (toneClass) {
        const baseClasses = (element.dataset.demoOriginalClass || '')
          .split(/\s+/)
          .filter(Boolean)
          .filter((className) => className === 'chip' || !className.startsWith('chip-'));
        if (!baseClasses.includes('chip')) {
          baseClasses.unshift('chip');
        }
        baseClasses.push(toneClass);
        element.className = baseClasses.join(' ');
      }
    }

    function setWidth(id, width) {
      const element = getTracked(id);
      if (element) {
        element.style.width = width;
      }
    }

    function resetDashboardState() {
      clearTimers();
      clearHighlights();

      trackedMap.forEach((element) => {
        if (element.dataset.demoOriginal !== undefined) {
          element.textContent = element.dataset.demoOriginal;
        }
        if (element.dataset.demoOriginalClass !== undefined) {
          element.className = element.dataset.demoOriginalClass;
        }
        if (element.dataset.demoOriginalWidth !== undefined) {
          element.style.width = element.dataset.demoOriginalWidth;
        }
      });

      if (toastStack.childElementCount > 0) {
        toastStack.innerHTML = '';
      }

      while (timeline && timeline.children.length > baseTimelineLength) {
        const firstChild = timeline.firstElementChild;
        if (!firstChild) {
          break;
        }
        firstChild.remove();
      }

      document.querySelectorAll('.action-button.demo-active').forEach((button) => {
        button.classList.remove('demo-active');
      });
    }

    function prependTimelineEvent({ time, title, caption }) {
      if (!timeline) {
        return;
      }

      const item = document.createElement('li');
      item.className = 'timeline-item';
      item.dataset.demoGenerated = 'true';
      item.innerHTML = `
        <span class="timeline-time">${time}</span>
        <div>
          <p class="timeline-title">${title}</p>
          <p class="timeline-caption">${caption}</p>
        </div>
      `;
      timeline.prepend(item);

      requestAnimationFrame(() => {
        item.classList.add(highlightClass);
      });
    }

    function emphasiseActions() {
      document.querySelectorAll('#acciones-rapidas .action-button').forEach((button, index) => {
        const timer = window.setTimeout(() => {
          button.classList.add('demo-active');
          button.addEventListener('animationend', () => {
            button.classList.remove('demo-active');
          }, { once: true });
        }, index * 400);
        timers.push(timer);
      });
    }

    const steps = [
      {
        delay: 0,
        selector: '.metric-card:nth-child(1)',
        narration: 'La disponibilidad global se recalcula tras la estabilización de los enlaces críticos.',
        action: () => {
          updateText('availabilityValue', '99.995%');
          updateTrend('availabilityTrend', '+0.8%', 'trend-up');
          pushToast('SLA restablecido', 'Se activó la redundancia multi-sitio y mejoró la disponibilidad.');
        }
      },
      {
        delay: 4800,
        selector: '.metric-card:nth-child(2)',
        narration: 'El optimizador WAN reduce la latencia promedio para las sedes regionales.',
        action: () => {
          updateText('latencyValue', '18 ms');
          updateTrend('latencyTrend', '-7 ms', 'trend-down');
          pushToast('Optimización de latencia', 'El ruteo dinámico aplicó políticas de menor congestión.');
        }
      },
      {
        delay: 4800,
        selector: '.metric-card:nth-child(3)',
        narration: 'El uso de ancho de banda refleja el pico actual y la proyección del tráfico.',
        action: () => {
          updateText('bandwidthValue', '15.2 Gbps');
          updateTrend('bandwidthTrend', '82%', 'trend-up');
          pushToast('Análisis de tráfico', 'Se prioriza video docente y se regula el tráfico recreativo.');
        }
      },
      {
        delay: 4800,
        selector: '.metric-card:nth-child(4)',
        narration: 'El número de incidentes activos disminuye tras automatizar tareas de respuesta.',
        action: () => {
          updateText('incidentsValue', '2 abiertos');
          updateTrend('incidentsTrend', '0 críticos', 'trend-down');
          pushToast('Incidentes mitigados', 'Las reglas SOAR cerraron tres incidencias de severidad media.');
        }
      },
      {
        delay: 5200,
        selector: '#alertas-tiempo-real',
        narration: 'Las alertas en tiempo real condensan los eventos más relevantes de la red.',
        action: () => {
          updateText('alertCritical', '1 evento crítico atendido en los últimos 5 minutos.');
          updateText('alertWarning', '2 advertencias en seguimiento intensivo.');
          updateText('alertInfo', '12 notificaciones informativas listas para revisión.');
          pushToast('Correlación automática', 'El IDS vinculó eventos y cerró el incidente #458.');
        }
      },
      {
        delay: 5200,
        selector: '#servicios-criticos',
        narration: 'Se monitorea la salud de los servicios estratégicos con métricas puntuales.',
        action: () => {
          updateChip('vpnChip', '96.2%', 'chip-danger');
          updateText('vpnLatency', '56 ms');
          updateText('vpnCheck', 'Hace 1 min');
          pushToast('VPN Corporativa', 'Se habilitó el túnel de respaldo mientras baja la carga.');
        }
      },
      {
        delay: 5200,
        selector: '#incidentTimeline',
        narration: 'La cronología registra los hitos más recientes de la operación diaria.',
        action: () => {
          prependTimelineEvent({
            time: '12:26',
            title: 'Integración SIEM completada',
            caption: 'Evento crítico resuelto con políticas de automatización y escalamiento.'
          });
          pushToast('Bitácora actualizada', 'Se documentó la intervención automática del orquestador de seguridad.');
        }
      },
      {
        delay: 5200,
        selector: '#accesos-sesiones',
        narration: 'Se redistribuyen las sesiones activas para balancear la carga en cada entorno.',
        action: () => {
          setWidth('sessionsProduction', '64%');
          setWidth('sessionsLab', '58%');
          setWidth('sessionsGuest', '26%');
          updateText('sessionsProductionValue', '64 usuarios');
          updateText('sessionsLabValue', '29 usuarios');
          updateText('sessionsGuestValue', '13 usuarios');
          pushToast('Balanceo de sesiones', 'El brokering de acceso priorizó recursos docentes en laboratorio.');
        }
      },
      {
        delay: 5200,
        selector: '#indice-cumplimiento',
        narration: 'El seguimiento de cumplimiento muestra el avance por cada marco de control.',
        action: () => {
          setWidth('nistProgress', '80%');
          updateText('nistProgressValue', '80% completado');
          pushToast('Auditoría NIST CSF', 'Controles de respuesta alcanzan el 80% tras el último ciclo.');
        }
      },
      {
        delay: 5200,
        selector: '#acciones-rapidas',
        narration: 'Los playbooks sugeridos permiten documentar y comunicar las acciones clave.',
        action: () => {
          emphasiseActions();
          pushToast('Playbook sugerido', 'Genera el informe y notifica al comité en un solo clic.');
        }
      }
    ];

    function executeStep(step, index) {
      highlightElement(step.selector);
      showNarration(step.narration, index);
      step.action();
    }

    function finishDemo() {
      running = false;
      startButton.disabled = false;
      resetButton.disabled = false;
      showNarration('Recorrido finalizado. Puedes reiniciar la demostración cuando lo necesites.');
    }

    function startDemo() {
      if (running) {
        return;
      }

      resetDashboardState();
      running = true;
      startButton.disabled = true;
      resetButton.disabled = false;
      showNarration('Iniciando recorrido guiado por el panel.');

      let accumulatedDelay = 0;
      steps.forEach((step, index) => {
        accumulatedDelay += step.delay;
        const timerId = window.setTimeout(() => executeStep(step, index), accumulatedDelay);
        timers.push(timerId);
      });

      const finishTimer = window.setTimeout(finishDemo, accumulatedDelay + 3200);
      timers.push(finishTimer);
    }

    function resetDemo() {
      resetDashboardState();
      running = false;
      startButton.disabled = false;
      resetButton.disabled = true;
      showNarration('Demo reiniciada. Pulsa «Reproducir demo» para comenzar de nuevo.');
      startButton.focus();
    }

    resetButton.addEventListener('click', resetDemo);
    startButton.addEventListener('click', startDemo);
  }

  document.addEventListener('DOMContentLoaded', createDemo);

  return {};
})();
