(function () {
  const api = (window.Services && window.Services.api) || {};

  const computeSummary = (alerts = []) => {
    const summary = alerts.reduce(
      (acc, alert) => {
        acc.total += 1;
        acc.bySeverity[alert.criticidad] = (acc.bySeverity[alert.criticidad] || 0) + 1;
        acc.byType[alert.tipo] = (acc.byType[alert.tipo] || 0) + 1;
        return acc;
      },
      { total: 0, bySeverity: {}, byType: {} },
    );
    return summary;
  };

  const normalizeResponse = (response) => {
    if (!response) {
      return {
        results: [],
        meta: { page: 1, pageSize: 0, totalItems: 0, totalPages: 0 },
      };
    }
    if (Array.isArray(response)) {
      return {
        results: response,
        meta: {
          page: 1,
          pageSize: response.length,
          totalItems: response.length,
          totalPages: 1,
        },
      };
    }
    return {
      results: response.results || response.alerts || [],
      meta:
        response.meta ||
        {
          page: response.page || 1,
          pageSize: response.pageSize || (response.results ? response.results.length : 0),
          totalItems: response.totalItems || response.total || 0,
          totalPages: response.totalPages || 1,
        },
    };
  };

  const alertsService = {
    async fetchAlerts(options = {}) {
      try {
        if (!api.fetchAlerts) throw new Error('Servicio no disponible');
        const params = {
          page: options.page || 1,
          pageSize: options.pageSize || 50,
          sortBy: options.sortBy || 'timestamp',
          sortOrder: options.sortOrder || 'desc',
          ...options.filters,
        };
        const response = await api.fetchAlerts(params);
        const normalized = normalizeResponse(response);
        return normalized;
      } catch (error) {
        console.warn('[alertsService] No se pudieron obtener alertas del backend', error);
        const fallback = window.mockAlerts || [];
        return {
          results: fallback,
          meta: {
            page: 1,
            pageSize: fallback.length,
            totalItems: fallback.length,
            totalPages: 1,
          },
          summary: computeSummary(fallback),
          isFallback: true,
        };
      }
    },
    async fetchAlertById(id) {
      try {
        if (api.fetchAlertById) {
          const response = await api.fetchAlertById(id);
          return response?.alert || response || null;
        }
        throw new Error('Servicio no disponible');
      } catch (error) {
        const fallback = (window.mockAlerts || []).find((alert) => alert.id === id);
        return fallback || null;
      }
    },
    async fetchSummary() {
      try {
        if (!api.fetchAlertSummary) throw new Error('Servicio no disponible');
        const response = await api.fetchAlertSummary();
        return response?.summary || response || null;
      } catch (error) {
        const fallback = window.mockAlerts || [];
        return computeSummary(fallback);
      }
    },
    async createAction(id, payload) {
      if (!api.createAlertAction) return null;
      try {
        const response = await api.createAlertAction(id, payload);
        return response?.alert || response || null;
      } catch (error) {
        console.error('No se pudo registrar la acción de alerta', error);
        throw error;
      }
    },
  };

  window.Services = window.Services || {};
  window.Services.alertsService = alertsService;
})();
