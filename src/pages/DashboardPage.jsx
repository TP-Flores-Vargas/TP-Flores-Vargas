import { useMemo, useState } from 'react';
import dayjs from 'dayjs';

import { AlertTriangleIcon, CheckCircleIcon, XCircleIcon } from '../assets/icons/index.jsx';
import Card from '../components/common/Card.jsx';
import CardMetric from '../components/metrics/CardMetric.jsx';
import { constants } from '../config/constants.js';
import { useAlerts } from '../hooks/useAlerts.js';
import { useInterval } from '../hooks/useInterval.js';

const ServerStatusIndicator = ({ title, value, limit }) => {
  const percentage = (value / limit) * 100;
  let colorClass = 'bg-green-500';
  if (percentage > 90) colorClass = 'bg-red-500';
  else if (percentage > 70) colorClass = 'bg-yellow-500';

  return (
    <Card>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">
        {value}
        {title.includes('Uso') ? '%' : ' GB'}
      </p>
      <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
        <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </Card>
  );
};

const DashboardPage = () => {
  const { alerts } = useAlerts();
  const [lastActivity, setLastActivity] = useState(dayjs());

  useInterval(() => setLastActivity(dayjs()), constants.REFRESH_INTERVAL_MS ?? 30 * 1000);

  const alertsToday = useMemo(
    () => alerts.filter((alert) => dayjs(alert.timestamp).isSame(dayjs(), 'day')).length,
    [alerts],
  );

  const healthStatus = useMemo(() => {
    const hasHigh = alerts.some(
      (alert) => alert.criticidad === 'Alta' && dayjs(alert.timestamp).isAfter(dayjs().subtract(1, 'hour')),
    );
    const hasMedium = alerts.some(
      (alert) => alert.criticidad === 'Media' && dayjs(alert.timestamp).isAfter(dayjs().subtract(1, 'hour')),
    );
    if (hasHigh) return { text: 'Alerta Crítica', color: 'bg-red-500', icon: XCircleIcon };
    if (hasMedium) return { text: 'Actividad Sospechosa', color: 'bg-yellow-500', icon: AlertTriangleIcon };
    return { text: 'Red Segura', color: 'bg-green-500', icon: CheckCircleIcon };
  }, [alerts]);

  const alertTypesData = useMemo(() => {
    const counts = alerts.reduce((acc, alert) => {
      acc[alert.tipo] = (acc[alert.tipo] || 0) + 1;
      return acc;
    }, {});
    const values = Object.values(counts);
    const max = values.length ? Math.max(...values) : 0;
    return { counts, max };
  }, [alerts]);

  const trendData = useMemo(() => {
    const base = [
      { periodo: 'Hace 4d', total: 5 },
      { periodo: 'Hace 3d', total: 8 },
      { periodo: 'Hace 2d', total: 4 },
      { periodo: 'Ayer', total: 10 },
    ];
    return [...base, { periodo: 'Hoy', total: alertsToday }];
  }, [alertsToday]);

  const HealthStatusIcon = healthStatus.icon;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className={`p-6 rounded-lg flex items-center justify-between text-white ${healthStatus.color}`}>
          <div>
            <p className="text-sm font-medium opacity-80">Estado de la Red</p>
            <p className="text-2xl font-bold">{healthStatus.text}</p>
          </div>
          <HealthStatusIcon className="w-10 h-10 opacity-70" />
        </div>
        <CardMetric title="Alertas Hoy" value={alertsToday} />
        <Card className="col-span-1 md:col-span-2">
          <p className="text-sm font-medium text-gray-400">Última actividad analizada</p>
          <p className="text-2xl font-bold text-white">{lastActivity.format('h:mm:ss A')}</p>
          <p className="text-xs text-green-400">Sistema de Detección Activo</p>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <ServerStatusIndicator title="Uso de CPU" value={35} limit={100} />
        <ServerStatusIndicator title="Uso de Memoria" value={75} limit={100} />
        <ServerStatusIndicator title="Espacio en Disco" value={150} limit={250} />
        <CardMetric title="Versión del Sistema" value={constants.VERSION || 'MVP'} tone="text-white" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Resumen de Amenazas (Últimos 7 días)</h2>
          <div className="space-y-3">
            {Object.entries(alertTypesData.counts).map(([tipo, total]) => {
              const percentage = alertTypesData.max ? Math.round((total / alertTypesData.max) * 100) : 0;
              return (
                <div key={tipo} className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>{tipo}</span>
                    <span className="font-semibold text-white">{total}</span>
                  </div>
                  <div className="w-full bg-gray-700/60 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {!Object.keys(alertTypesData.counts).length && (
              <p className="text-gray-400 text-sm">No se registraron alertas en este periodo.</p>
            )}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Tendencia de Alertas (Últimos 5 días)</h2>
          <ul className="space-y-3">
            {trendData.map((item) => (
              <li
                key={item.periodo}
                className="flex items-center justify-between bg-gray-900/40 rounded-lg px-4 py-3 border border-gray-800/60"
              >
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide">{item.periodo}</p>
                  <p className="text-lg font-semibold text-white">{item.total} alertas</p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      item.total >= alertsToday
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}
                  >
                    {item.total >= alertsToday ? '↑' : '↓'} tendencia
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
