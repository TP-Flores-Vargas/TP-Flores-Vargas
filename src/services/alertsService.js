(function () {
  const api = (window.Services && window.Services.api) || {};

  const loadMockAlerts = async () => {
    if (typeof api.getMockAlerts === 'function') {
      return api.getMockAlerts();
    }
    return Promise.resolve(window.mockAlerts || []);
  };

  const alertsService = {
    async fetchAlerts() {
      return loadMockAlerts();
    },
    async fetchAlertById(id) {
      const alerts = await loadMockAlerts();
      return alerts.find((alert) => alert.id === id) || null;
    },
    async fetchSummary() {
      const alerts = await loadMockAlerts();
      const totals = alerts.reduce(
        (acc, alert) => {
          acc.total += 1;
          acc.bySeverity[alert.criticidad] = (acc.bySeverity[alert.criticidad] || 0) + 1;
          acc.byType[alert.tipo] = (acc.byType[alert.tipo] || 0) + 1;
          return acc;
        },
        { total: 0, bySeverity: {}, byType: {} },
      );
      return totals;
    },
  };

  window.Services = window.Services || {};
  window.Services.alertsService = alertsService;
})();

