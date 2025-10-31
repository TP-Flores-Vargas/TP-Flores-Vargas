import { alerts } from '../data/alerts.js';

const SEVERITY_ORDER = ['Baja', 'Media', 'Alta'];

function cloneAlert(alert) {
  return JSON.parse(JSON.stringify(alert));
}

export function listAlerts(options = {}) {
  const {
    page = 1,
    pageSize = 20,
    severity,
    type,
    status,
    search,
    startDate,
    endDate,
    sortBy = 'timestamp',
    sortOrder = 'desc',
  } = options;

  let results = alerts.map(cloneAlert);

  if (severity) {
    const severityList = Array.isArray(severity) ? severity : String(severity).split(',');
    results = results.filter((alert) => severityList.includes(alert.criticidad));
  }

  if (type) {
    const types = Array.isArray(type) ? type : String(type).split(',');
    results = results.filter((alert) => types.includes(alert.tipo));
  }

  if (status) {
    const statuses = Array.isArray(status) ? status : String(status).split(',');
    results = results.filter((alert) => statuses.includes(alert.status));
  }

  if (search) {
    const normalized = String(search).toLowerCase();
    results = results.filter((alert) =>
      Object.values(alert).some((value) =>
        typeof value === 'string' && value.toLowerCase().includes(normalized),
      ),
    );
  }

  if (startDate || endDate) {
    results = results.filter((alert) => {
      const timestamp = new Date(alert.timestamp).getTime();
      if (Number.isNaN(timestamp)) return false;
      if (startDate && timestamp < new Date(startDate).getTime()) return false;
      if (endDate && timestamp > new Date(endDate).getTime()) return false;
      return true;
    });
  }

  const sorted = results.sort((a, b) => {
    if (sortBy === 'criticidad') {
      const diff = SEVERITY_ORDER.indexOf(a.criticidad) - SEVERITY_ORDER.indexOf(b.criticidad);
      return sortOrder === 'asc' ? diff : -diff;
    }
    const valueA = a[sortBy];
    const valueB = b[sortBy];
    if (valueA === valueB) return 0;
    if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
    return sortOrder === 'asc' ? -1 : 1;
  });

  const totalItems = sorted.length;
  const normalizedPageSize = Math.max(1, Math.min(Number(pageSize) || 20, 100));
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const normalizedPage = Math.max(1, Math.min(Number(page) || 1, totalPages));
  const startIndex = (normalizedPage - 1) * normalizedPageSize;
  const paginated = sorted.slice(startIndex, startIndex + normalizedPageSize);

  return {
    results: paginated,
    meta: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalItems,
      totalPages,
      hasNextPage: normalizedPage < totalPages,
      hasPreviousPage: normalizedPage > 1,
    },
  };
}

export function getAlertById(id) {
  return cloneAlert(alerts.find((alert) => alert.id === id));
}

export function addAlertAction(id, action) {
  const alert = alerts.find((item) => item.id === id);
  if (!alert) return null;
  alert.actions = alert.actions || [];
  alert.actions.push(action);
  alert.status = action.nextStatus || alert.status;
  alert.acknowledged = action.acknowledged ?? alert.acknowledged;
  return cloneAlert(alert);
}

export function getSummary() {
  const total = alerts.length;
  const bySeverity = alerts.reduce((acc, alert) => {
    acc[alert.criticidad] = (acc[alert.criticidad] || 0) + 1;
    return acc;
  }, {});

  const byType = alerts.reduce((acc, alert) => {
    acc[alert.tipo] = (acc[alert.tipo] || 0) + 1;
    return acc;
  }, {});

  const byStatus = alerts.reduce((acc, alert) => {
    acc[alert.status] = (acc[alert.status] || 0) + 1;
    return acc;
  }, {});

  const acknowledged = alerts.reduce(
    (acc, alert) => {
      if (alert.acknowledged) acc.resueltas += 1;
      else acc.pendientes += 1;
      return acc;
    },
    { pendientes: 0, resueltas: 0 },
  );

  const now = new Date();
  const trend = Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - index));
    const dayLabel = day.toISOString().slice(0, 10);
    const totalDay = alerts.filter((alert) => alert.timestamp.slice(0, 10) === dayLabel).length;
    return { date: dayLabel, total: totalDay };
  });

  const topTypes = Object.entries(byType)
    .map(([tipo, totalTipo]) => ({ tipo, total: totalTipo }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    total,
    bySeverity,
    byType,
    byStatus,
    acknowledged,
    trend,
    topTypes,
  };
}

export function getDashboardMetrics() {
  const summary = getSummary();
  const totalCritical = summary.bySeverity.Alta || 0;
  const totalMedium = summary.bySeverity.Media || 0;

  const health = totalCritical > 0 ? 'critical' : totalMedium > 0 ? 'warning' : 'healthy';

  const resources = {
    cpu: { value: 42, limit: 100 },
    memory: { value: 68, limit: 100 },
    storage: { value: 180, limit: 256 },
    sensorsOnline: 5,
    sensorsOffline: 1,
  };

  const lastAlerts = alerts
    .map(cloneAlert)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  return {
    health,
    summary,
    resources,
    lastAlerts,
    lastUpdated: new Date().toISOString(),
  };
}
