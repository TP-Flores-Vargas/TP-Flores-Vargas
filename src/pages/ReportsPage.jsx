(function () {
  const { useMemo, useState } = React;
  const { Card, Button, Label } = window.Common || {};
  const { useAlerts } = window.Hooks || {};

  const ReportsPage = () => {
    const [reportVisible, setReportVisible] = useState(false);
    const { alerts } = useAlerts();

    const alertTypesData = useMemo(() => {
      const counts = alerts.reduce((acc, alert) => {
        acc[alert.criticidad] = (acc[alert.criticidad] || 0) + 1;
        return acc;
      }, {});
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      return { counts, total };
    }, [alerts]);

    const topThreats = useMemo(() => {
      const threats = alerts.reduce((acc, alert) => {
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
    }, [alerts]);

    return (
      <div className="p-8 text-white">
        <h1 className="text-3xl font-bold">Reportes de Seguridad</h1>
        <Card className="mt-6">
          <div className="flex items-center space-x-4">
            <Label htmlFor="periodo">Seleccionar Periodo:</Label>
            <select
              id="periodo"
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
              defaultValue="7"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
            </select>
            <Button onClick={() => setReportVisible(true)}>Generar Reporte</Button>
          </div>
        </Card>
        {reportVisible && (
          <div className="mt-8 bg-white text-black p-8 rounded-lg shadow-2xl max-w-4xl mx-auto modal-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Resumen de Alertas por Criticidad</h2>
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
                        {threat.total} reporte{threat.total !== 1 ? 's' : ''} · Última detección:{' '}
                        {dayjs(threat.ultima).fromNow()}
                      </p>
                    </li>
                  ))}
                  {!topThreats.length && (
                    <li className="text-gray-500 text-sm">No hay datos suficientes para destacar amenazas.</li>
                  )}
                </ul>
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

