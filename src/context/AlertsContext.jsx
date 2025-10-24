(function () {
  const { createContext, useCallback, useEffect, useMemo, useState } = React;
  const AlertsContext = createContext(null);

  const AlertsProvider = ({ children }) => {
    const [alerts, setAlerts] = useState(window.mockAlerts || []);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [isLoading, setIsLoading] = useState(!Array.isArray(window.mockAlerts));
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchAlerts = useCallback(async () => {
      const service = window.Services?.alertsService;
      if (!service) return [];
      const data = await service.fetchAlerts();
      return Array.isArray(data) ? data : [];
    }, []);

    const refreshAlerts = useCallback(async () => {
      setIsLoading(true);
      try {
        const data = await fetchAlerts();
        setAlerts(data);
        setLastUpdated(new Date().toISOString());
        return data;
      } finally {
        setIsLoading(false);
      }
    }, [fetchAlerts]);

    useEffect(() => {
      let isMounted = true;
      const load = async () => {
        setIsLoading(true);
        try {
          const data = await fetchAlerts();
          if (isMounted) {
            setAlerts(data);
            setLastUpdated(new Date().toISOString());
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };
      load();
      return () => {
        isMounted = false;
      };
    }, [fetchAlerts]);

    const value = useMemo(
      () => ({
        alerts,
        setAlerts,
        selectedAlert,
        setSelectedAlert,
        refreshAlerts,
        isLoading,
        lastUpdated,
      }),
      [alerts, selectedAlert, refreshAlerts, isLoading, lastUpdated],
    );

    return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
  };

  window.Context = window.Context || {};
  window.Context.AlertsContext = AlertsContext;
  window.Context.AlertsProvider = AlertsProvider;
})();

