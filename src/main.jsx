(function () {
  dayjs.extend(dayjs_plugin_relativeTime);
  dayjs.locale('es');

  const mountApp = () => {
    const container = document.getElementById('root');
    if (!container || !window.App) return;

    const root = ReactDOM.createRoot(container);
    const App = window.App;
    root.render(<App />);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
})();
