import { api } from './api.js';

export const alertsService = {
  async fetchAlerts() {
    return api.getMockAlerts();
  },
  async fetchAlertById(id) {
    const alerts = await api.getMockAlerts();
    return alerts.find((alert) => alert.id === id) ?? null;
  },
  async fetchSummary() {
    const alerts = await api.getMockAlerts();
    return alerts.reduce(
      (acc, alert) => {
        acc.total += 1;
        acc.bySeverity[alert.criticidad] = (acc.bySeverity[alert.criticidad] || 0) + 1;
        acc.byType[alert.tipo] = (acc.byType[alert.tipo] || 0) + 1;
        return acc;
      },
      { total: 0, bySeverity: {}, byType: {} },
    );
  },
};
