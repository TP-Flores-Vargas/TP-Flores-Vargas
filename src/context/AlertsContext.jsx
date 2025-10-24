(function () {
  const { createContext, useCallback, useEffect, useMemo, useRef, useState } = React;
  const { useInterval } = window.Hooks || {};
  const { constants } = window.Config || {};
  const POLL_INTERVAL = constants?.REFRESH_INTERVAL_MS ?? 30 * 1000;
  const AlertsContext = createContext(null);

  const AlertsProvider = ({ children }) => {
    const [alerts, setAlerts] = useState(window.mockAlerts || []);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const isMountedRef = useRef(true);

    const loadAlerts = useCallback(async () => {
      const service = window.Services?.alertsService;
      if (!service) return;
      try {
        const data = await service.fetchAlerts();
        if (isMountedRef.current && Array.isArray(data)) {
          setAlerts(data);
          setSelectedAlert((prev) => {
            if (!prev) return prev;
            const refreshedAlert = data.find((item) => item.id === prev.id);
            if (!refreshedAlert) return null;
            const hasChanged =
              prev.timestamp !== refreshedAlert.timestamp ||
              prev.criticidad !== refreshedAlert.criticidad ||
              prev.tipo !== refreshedAlert.tipo ||
              prev.detalles !== refreshedAlert.detalles ||
              prev.recomendacion !== refreshedAlert.recomendacion ||
              prev.ipOrigen !== refreshedAlert.ipOrigen ||
              prev.ipDestino !== refreshedAlert.ipDestino ||
              prev.puertoDestino !== refreshedAlert.puertoDestino ||
              prev.protocolo !== refreshedAlert.protocolo;
            return hasChanged ? { ...prev, ...refreshedAlert } : prev;
          });
        }
      } catch (error) {
        console.warn('No se pudieron obtener las alertas', error);
      }
    }, []);

    useEffect(() => {
      loadAlerts();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadAlerts]);

    useInterval?.(loadAlerts, POLL_INTERVAL);

    const value = useMemo(
      () => ({
        alerts,
        setAlerts,
        selectedAlert,
        setSelectedAlert,
        refreshAlerts: loadAlerts,
      }),
      [alerts, selectedAlert, loadAlerts],
    );

    return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
  };

  window.Context = window.Context || {};
  window.Context.AlertsContext = AlertsContext;
  window.Context.AlertsProvider = AlertsProvider;
})();

