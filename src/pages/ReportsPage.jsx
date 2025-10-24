(function () {
  const { useMemo, useState } = React;
  const { Card, Button, Label } = window.Common || {};
  const { useAlerts } = window.Hooks || {};
  const { formatDate, exportToCSV } = window.Utils || {};

  const ReportsPage = () => {
    const [reportVisible, setReportVisible] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('7');
    const [generatedAt, setGeneratedAt] = useState(null);
    const { alerts } = useAlerts();

    const alertsInPeriod = useMemo(() => {
      if (selectedPeriod === 'all') return alerts;
      const days = Number(selectedPeriod);
      if (!Number.isFinite(days)) return alerts;
      const limit = dayjs().subtract(days, 'day');
      return alerts.filter((alert) => dayjs(alert.timestamp).isAfter(limit));
    }, [alerts, selectedPeriod]);

    const alertTypesData = useMemo(() => {
      const counts = alertsInPeriod.reduce((acc, alert) => {
        acc[alert.criticidad] = (acc[alert.criticidad] || 0) + 1;
        return acc;
      }, {});
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      return { counts, total };
    }, [alertsInPeriod]);

    const topThreats = useMemo(() => {
      const threats = alertsInPeriod.reduce((acc, alert) => {
        if (!acc[alert.tipo]) {
          acc[alert.tipo] = { tipo: alert.tipo, total: 0, ultima: alert.timestamp };
        }
        acc[alert.tipo].total += 1;
        acc[alert.tipo].ultima = dayjs(alert.timestamp).isAfter(acc[alert.tipo].ultima)
          ? alert.timestamp
          : acc[alert.tipo].ultima;
        return acc;
      }, {});
      return Object.values(threats)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    }, [alertsInPeriod]);

    const dailyTrend = useMemo(() => {
      const size = selectedPeriod === 'all' ? 7 : Math.min(Number(selectedPeriod) || 7, 30);
      return Array.from({ length: size }).map((_, index) => {
        const day = dayjs().subtract(size - index - 1, 'day');
        const count = alertsInPeriod.filter((alert) => dayjs(alert.timestamp).isSame(day, 'day')).length;
        return { label: day.format('DD MMM'), count };
      });
    }, [alertsInPeriod, selectedPeriod]);

    const periodLabel = selectedPeriod === 'all' ? 'Todo el historial' : `Últimos ${selectedPeriod} días`;

    const handleGenerateReport = () => {
      setReportVisible(true);
      setGeneratedAt(dayjs());
    };

    const handleExportCSV = () => {
      if (!alertsInPeriod.length) return;
      const headers = [
        'ID',
        'Fecha y Hora',
        'Criticidad',
        'Tipo de Amenaza',
        'IP Origen',
        'IP Destino',
        'Puerto Destino',
        'Protocolo',
      ];
      const rows = alertsInPeriod.map((alert) => ({
        ID: alert.id,
        'Fecha y Hora': formatDate?.(alert.timestamp, 'YYYY-MM-DD HH:mm'),
        Criticidad: alert.criticidad,
        'Tipo de Amenaza': alert.tipo,
        'IP Origen': alert.ipOrigen,
        'IP Destino': alert.ipDestino,
        'Puerto Destino': alert.puertoDestino,
        Protocolo: alert.protocolo,
      }));
      const suffix = selectedPeriod === 'all' ? 'historial' : `${selectedPeriod}d`;
      exportToCSV?.(`reporte_alertas_${suffix}.csv`, rows, headers);
    };

    return (
      <div className="p-8 text-white">
        <h1 className="text-3xl font-bold">Reportes de Seguridad</h1>
        <Card className="mt-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            <Label htmlFor="periodo" className="text-sm text-gray-300">
              Seleccionar periodo
            </Label>
            <select
              id="periodo"
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm"
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="all">Todo el historial</option>
            </select>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerateReport}>Generar Reporte</Button>
              <Button variant="success" onClick={handleExportCSV} disabled={!alertsInPeriod.length}>
                Exportar CSV
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.print?.()}
                disabled={!alertsInPeriod.length}
              >
                Imprimir
              </Button>
            </div>
          </div>
        </Card>
        {reportVisible && (
          <div className="mt-8 bg-white text-black p-8 rounded-lg shadow-2xl max-w-5xl mx-auto modal-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Reporte Ejecutivo de Alertas</h2>
                <p className="text-sm text-gray-500">
                  {periodLabel} · Generado {generatedAt ? generatedAt.format('DD/MM/YYYY HH:mm') : '—'}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setReportVisible(false)}>
                Cerrar reporte
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">Alertas Totales</p>
                  <p className="text-4xl font-bold text-indigo-900">{alertTypesData.total}</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                    Distribución por Criticidad
                  </p>
                  <ul className="space-y-2">
                    {Object.entries(alertTypesData.counts).map(([criticidad, total]) => (
                      <li key={criticidad} className="flex justify-between text-sm text-gray-700">
                        <span>{criticidad}</span>
                        <span className="font-semibold">{total}</span>
                      </li>
                    ))}
                    {!Object.keys(alertTypesData.counts).length && (
                      <li className="text-gray-500 text-sm">Sin alertas registradas.</li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Principales Tipos de Amenaza
                </p>
                <ul className="space-y-3">
                  {topThreats.map((threat) => (
                    <li key={threat.tipo} className="border border-gray-200 rounded-lg px-3 py-2">
                      <p className="font-semibold text-gray-800">{threat.tipo}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {threat.total} reporte{threat.total !== 1 ? 's' : ''} · Última detección {dayjs(threat.ultima).fromNow()}
                      </p>
                    </li>
                  ))}
                  {!topThreats.length && (
                    <li className="text-gray-500 text-sm">No hay datos suficientes para destacar amenazas.</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Tendencia diaria</h3>
              <div className="bg-gray-100 rounded-lg p-4">
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                  {dailyTrend.map((item) => (
                    <li key={item.label} className="bg-white rounded-md border border-gray-200 px-3 py-2 text-center">
                      <p className="font-semibold text-gray-800">{item.count}</p>
                      <p>{item.label}</p>
                    </li>
                  ))}
                  {!dailyTrend.length && <li className="text-gray-500">Sin datos para mostrar tendencia.</li>}
                </ul>
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Detalle de alertas</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-200 text-gray-700 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Criticidad</th>
                      <th className="px-4 py-3 text-left">Amenaza</th>
                      <th className="px-4 py-3 text-left">IP Origen</th>
                      <th className="px-4 py-3 text-left">IP Destino</th>
                      <th className="px-4 py-3 text-left">Puerto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertsInPeriod.map((alert) => (
                      <tr key={alert.id} className="border-t border-gray-200">
                        <td className="px-4 py-3">{formatDate?.(alert.timestamp, 'DD/MM/YYYY HH:mm')}</td>
                        <td className="px-4 py-3">{alert.criticidad}</td>
                        <td className="px-4 py-3">{alert.tipo}</td>
                        <td className="px-4 py-3 font-mono text-xs">{alert.ipOrigen}</td>
                        <td className="px-4 py-3 font-mono text-xs">{alert.ipDestino || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{alert.puertoDestino}</td>
                      </tr>
                    ))}
                    {!alertsInPeriod.length && (
                      <tr>
                        <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                          No se registraron alertas en el periodo seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  window.Pages = window.Pages || {};
  window.Pages.ReportsPage = ReportsPage;
})();
