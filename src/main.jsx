(function () {
  dayjs.extend(dayjs_plugin_relativeTime);
  dayjs.locale('es');

  window.addEventListener('load', () => {
    const container = document.getElementById('root');
    if (!container) return;
    const root = ReactDOM.createRoot(container);
    const App = window.App;
    root.render(<App />);
  });
})();
