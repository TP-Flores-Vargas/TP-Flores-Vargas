(function () {
  const { createContext, useEffect, useMemo, useState } = React;
  const AlertsContext = createContext(null);

  const AlertsProvider = ({ children }) => {
    const [alerts, setAlerts] = useState(window.mockAlerts || []);
    const [selectedAlert, setSelectedAlert] = useState(null);

    useEffect(() => {
      let isMounted = true;
      const loadAlerts = async () => {
        try {
          const service = window.Services?.alertsService;
          if (!service || typeof service.fetchAlerts !== 'function') {
            if (isMounted) {
              setAlerts(window.mockAlerts || []);
            }
            return;
          }
          const data = await service.fetchAlerts();
          if (isMounted) setAlerts(Array.isArray(data) ? data : window.mockAlerts || []);
        } catch (error) {
          console.error('No fue posible cargar las alertas:', error);
          if (isMounted) {
            setAlerts(window.mockAlerts || []);
          }
        }
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
})();

