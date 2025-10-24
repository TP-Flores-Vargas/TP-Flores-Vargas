(function () {
  const { createContext, useEffect, useMemo, useState } = React;
  const AlertsContext = createContext(null);

  const AlertsProvider = ({ children }) => {
    const [alerts, setAlerts] = useState(window.mockAlerts || []);
    const [selectedAlert, setSelectedAlert] = useState(null);

    useEffect(() => {
      let isMounted = true;
      const loadAlerts = async () => {
        const service = window.Services?.alertsService;
        if (!service) return;
        const data = await service.fetchAlerts();
        if (isMounted) setAlerts(data);
      };
      loadAlerts();
      return () => {
        isMounted = false;
      };
    }, []);

    const value = useMemo(
      () => ({
        alerts,
        setAlerts,
        selectedAlert,
        setSelectedAlert,
      }),
      [alerts, selectedAlert],
    );

    return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
  };

  window.Context = window.Context || {};
  window.Context.AlertsContext = AlertsContext;
  window.Context.AlertsProvider = AlertsProvider;
  window.Context.Providers = window.Context.Providers || {};
  window.Context.Providers.AlertsProvider = AlertsProvider;
})();

