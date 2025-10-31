(function () {
  const { createContext, useContext, useEffect, useMemo, useState } = React;

  const AlertsContext = createContext(null);

  const computeLocalSummary = (items = []) =>
    items.reduce(
      (acc, alert) => {
        acc.total += 1;
        acc.bySeverity[alert.criticidad] = (acc.bySeverity[alert.criticidad] || 0) + 1;
        acc.byType[alert.tipo] = (acc.byType[alert.tipo] || 0) + 1;
        return acc;
      },
      { total: 0, bySeverity: {}, byType: {} },
    );

  const AlertsProvider = ({ children }) => {
    const AuthContext = window.Context?.AuthContext;
    const auth = AuthContext ? useContext(AuthContext) : null;
    const isAuthenticated = Boolean(auth?.isAuthenticated);

    const [alerts, setAlerts] = useState(window.mockAlerts || []);
    const [meta, setMeta] = useState({
      page: 1,
      pageSize: alerts.length,
      totalItems: alerts.length,
      totalPages: 1,
    });
    const [summary, setSummary] = useState(null);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const service = window.Services?.alertsService;
    const defaultOptions = { page: 1, pageSize: 50, sortBy: 'timestamp', sortOrder: 'desc' };

    const loadAlerts = async (options = {}) => {
      if (!service) return;
      setIsLoading(true);
      setError('');
      try {
        const response = await service.fetchAlerts({ ...defaultOptions, ...options });
        const list = response.results || [];
        setAlerts(list);
        if (response.meta) setMeta(response.meta);
        const summaryData = response.summary || (await service.fetchSummary());
        setSummary(summaryData);
      } catch (err) {
        console.error('No se pudieron cargar las alertas actualizadas', err);
        const fallback = window.mockAlerts || [];
        setAlerts(fallback);
        setMeta({
          page: 1,
          pageSize: fallback.length,
          totalItems: fallback.length,
          totalPages: 1,
        });
        setSummary(computeLocalSummary(fallback));
        setError('Mostrando datos locales debido a un problema al contactar el backend.');
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      if (isAuthenticated) {
        loadAlerts();
      } else {
        setAlerts([]);
        setSummary(null);
        setMeta({ page: 1, pageSize: 0, totalItems: 0, totalPages: 0 });
        setSelectedAlert(null);
      }
    }, [isAuthenticated]);

    const value = useMemo(
      () => ({
        alerts,
        summary,
        meta,
        isLoading,
        error,
        selectedAlert,
        setSelectedAlert,
        refreshAlerts: loadAlerts,
      }),
      [alerts, summary, meta, isLoading, error, selectedAlert],
    );

    return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
  };

  window.Context = window.Context || {};
  window.Context.AlertsContext = AlertsContext;
  window.Context.AlertsProvider = AlertsProvider;
})();
