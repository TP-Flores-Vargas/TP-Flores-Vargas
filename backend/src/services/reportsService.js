import { alerts } from '../data/alerts.js';

export function buildReportSummary(days = 7) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);

  const relevantAlerts = alerts.filter((alert) => new Date(alert.timestamp) >= cutoff);

  const totals = relevantAlerts.reduce(
    (acc, alert) => {
      acc.total += 1;
      acc.bySeverity[alert.criticidad] = (acc.bySeverity[alert.criticidad] || 0) + 1;
      acc.byType[alert.tipo] = (acc.byType[alert.tipo] || 0) + 1;
      return acc;
    },
    { total: 0, bySeverity: {}, byType: {} },
  );

  const topThreats = Object.entries(totals.byType)
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const timeline = relevantAlerts
    .map((alert) => ({ date: alert.timestamp.slice(0, 10), criticidad: alert.criticidad }))
    .reduce((acc, item) => {
      acc[item.date] = acc[item.date] || { date: item.date, total: 0, critical: 0 };
      acc[item.date].total += 1;
      if (item.criticidad === 'Alta') acc[item.date].critical += 1;
      return acc;
    }, {});

  const timelineData = Object.values(timeline).sort((a, b) => (a.date > b.date ? 1 : -1));

  return {
    generatedAt: new Date().toISOString(),
    range: { from: cutoff.toISOString(), to: now.toISOString(), days },
    totals,
    topThreats,
    timeline: timelineData,
  };
}

export function buildReportDocument(summary) {
  const lines = [
    'Reporte Básico de Alertas',
    `Generado: ${summary.generatedAt}`,
    `Periodo: ${summary.range.from} - ${summary.range.to}`,
    '',
    `Total de alertas: ${summary.totals.total}`,
    '',
    'Distribución por criticidad:',
    ...Object.entries(summary.totals.bySeverity).map(([severity, total]) => `  - ${severity}: ${total}`),
    '',
    'Principales tipos de amenaza:',
    ...summary.topThreats.map((threat) => `  - ${threat.tipo}: ${threat.total} eventos`),
  ];

  return lines.join('\n');
}
