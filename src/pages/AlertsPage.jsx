(function () {
  const { useAlerts } = window.Hooks || {};
  const { severityTheme } = window.Utils || {};
  const { formatDate } = window.Utils || {};

  const AlertsPage = ({ onSelectAlert, onNavigate }) => {
    const { alerts, setSelectedAlert } = useAlerts();
    const handleSelect = (alert) => {
      setSelectedAlert(alert);
      onSelectAlert?.(alert);
      onNavigate?.('detalles-alerta');
    };

    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Historial de Alertas</h1>
        <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/50 text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Criticidad
                </th>
                <th scope="col" className="px-6 py-3">
                  Fecha y Hora
                </th>
                <th scope="col" className="px-6 py-3">
                  Tipo de Amenaza
                </th>
                <th scope="col" className="px-6 py-3">
                  IP de Origen
                </th>
                <th scope="col" className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const theme = severityTheme?.[alert.criticidad] || severityTheme?.default || {};
                return (
                  <tr key={alert.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                          theme.border || 'border-gray-500/60'
                        } ${theme.badge || 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {alert.criticidad}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {formatDate?.(alert.timestamp)} ({dayjs(alert.timestamp).fromNow()})
                    </td>
                    <td className="px-6 py-4 font-medium">{alert.tipo}</td>
                    <td className="px-6 py-4 font-mono">{alert.ipOrigen}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSelect(alert)}
                        className="text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  window.Pages = window.Pages || {};
  window.Pages.AlertsPage = AlertsPage;
})();
