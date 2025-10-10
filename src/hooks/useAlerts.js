(function () {
  const { useContext } = React;

  const useAlerts = () => {
    const context = useContext(window.Context?.AlertsContext);
    if (!context) throw new Error('useAlerts debe usarse dentro de AlertsProvider');
    return context;
  };

  window.Hooks = window.Hooks || {};
  window.Hooks.useAlerts = useAlerts;
})();

