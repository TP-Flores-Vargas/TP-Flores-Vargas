(function () {
  const ensureDayjsConfigured = () => {
    if (typeof dayjs === 'undefined') {
      return;
    }

    if (typeof dayjs_plugin_relativeTime !== 'undefined') {
      dayjs.extend(dayjs_plugin_relativeTime);
    }

    if (typeof dayjs.locale === 'function') {
      dayjs.locale('es');
    }
  };

  ensureDayjsConfigured();

  let root = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 120;

  const renderFallback = () => {
    const container = document.getElementById('root');
    if (!container) return;

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className =
      'flex flex-col items-center justify-center min-h-screen bg-gray-900 text-center text-white space-y-3 px-6';
    wrapper.innerHTML = `
      <p class="text-xl font-semibold text-red-400">No se pudo iniciar la aplicación.</p>
      <p class="text-sm text-gray-400">Actualiza la página o verifica tu conexión para reintentar.</p>
    `;
    container.appendChild(wrapper);
  };

  const scheduleRetry = () => {
    attempts += 1;
    if (attempts > MAX_ATTEMPTS) {
      renderFallback();
      return;
    }
    setTimeout(mountApp, 50);
  };

  const mountApp = () => {
    ensureDayjsConfigured();

    const container = document.getElementById('root');
    if (!container) {
      scheduleRetry();
      return;
    }

    if (
      typeof React === 'undefined' ||
      typeof ReactDOM === 'undefined' ||
      typeof ReactDOM.createRoot !== 'function'
    ) {
      scheduleRetry();
      return;
    }

    const App = window.App;
    if (!App) {
      scheduleRetry();
      return;
    }

    if (!root) {
      root = ReactDOM.createRoot(container);
    }

    root.render(<App />);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp, { once: true });
  } else {
    mountApp();
  }
})();
