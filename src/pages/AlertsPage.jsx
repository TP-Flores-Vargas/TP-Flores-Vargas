(function () {
  const { useMemo, useState } = React;
  const { Button } = window.Common || {};
  const { useAlerts } = window.Hooks || {};
  const { severityTheme, formatDate, exportToCSV } = window.Utils || {};
  const { AlertFilters } = window.Components?.Alerts || {};

  const AlertsPage = ({ onSelectAlert }) => {
    const { alerts, setSelectedAlert, refreshAlerts } = useAlerts();
    const [filters, setFilters] = useState({ severity: 'all', timeRange: 'all', search: '' });
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filteredAlerts = useMemo(() => {
      const now = dayjs();
      return alerts.filter((alert) => {
        const matchesSeverity = filters.severity === 'all' || alert.criticidad === filters.severity;
        const matchesSearch = filters.search
          ? [alert.tipo, alert.ipOrigen, alert.ipDestino]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(filters.search.toLowerCase()))
          : true;
        const matchesTimeRange = (() => {
          if (filters.timeRange === 'all') return true;
          const timestamp = dayjs(alert.timestamp);
          if (!timestamp.isValid()) return false;
          if (filters.timeRange === '24h') return timestamp.isAfter(now.subtract(24, 'hour'));
          if (filters.timeRange === '7d') return timestamp.isAfter(now.subtract(7, 'day'));
          if (filters.timeRange === '30d') return timestamp.isAfter(now.subtract(30, 'day'));
          return true;
        })();
        return matchesSeverity && matchesSearch && matchesTimeRange;
      });
    }, [alerts, filters]);

    const severityCounts = useMemo(
      () =>
        filteredAlerts.reduce(
          (acc, alert) => {
            acc[alert.criticidad] = (acc[alert.criticidad] || 0) + 1;
            acc.total += 1;
            return acc;
          },
          { total: 0 },
        ),
      [filteredAlerts],
    );

    const handleSelect = (alert) => {
      setSelectedAlert(alert);
      onSelectAlert?.(alert);
    };

    const handleFilterChange = (field, value) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const handleResetFilters = () => {
      setFilters({ severity: 'all', timeRange: 'all', search: '' });
    };

    const handleExportAlerts = () => {
      if (!filteredAlerts.length) return;
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
      const rows = filteredAlerts.map((alert) => ({
        ID: alert.id,
        'Fecha y Hora': formatDate?.(alert.timestamp, 'YYYY-MM-DD HH:mm'),
        Criticidad: alert.criticidad,
        'Tipo de Amenaza': alert.tipo,
        'IP Origen': alert.ipOrigen,
        'IP Destino': alert.ipDestino,
        'Puerto Destino': alert.puertoDestino,
        Protocolo: alert.protocolo,
      }));
      exportToCSV?.('alertas_filtradas.csv', rows, headers);
    };

    const handleRefresh = async () => {
      if (typeof refreshAlerts !== 'function') return;
      setIsRefreshing(true);
      try {
        await refreshAlerts();
      } finally {
        setIsRefreshing(false);
      }
    };

    return (
      <div className="p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Historial de Alertas</h1>
            <p className="text-sm text-gray-400 mt-1">
              Revise y filtre las detecciones registradas por el sistema de monitoreo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRefresh}
              className="self-start lg:self-center text-sm"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={handleExportAlerts}
              className="self-start lg:self-center text-sm"
              disabled={!filteredAlerts.length}
            >
              Descargar CSV ({filteredAlerts.length})
            </Button>
          </div>
        </div>

        {AlertFilters ? (
          <AlertFilters filters={filters} onChange={handleFilterChange} onReset={handleResetFilters} />
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {['Alta', 'Media', 'Baja'].map((level) => {
            const count = severityCounts[level] || 0;
            return (
              <div key={level} className="bg-gray-800/60 border border-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400">Alertas {level}</p>
                <p className="text-2xl font-bold text-white">{count}</p>
              </div>
            );
          })}
          <div className="bg-gray-800/60 border border-gray-800 rounded-lg p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-sm text-gray-400">Total visible</p>
            <p className="text-2xl font-bold text-white">{severityCounts.total || 0}</p>
          </div>
        </div>

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
                <th scope="col" className="px-6 py-3">
                  IP de Destino
                </th>
                <th scope="col" className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => {
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
                    <td className="px-6 py-4 font-mono">{alert.ipDestino || '—'}</td>
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
          {!filteredAlerts.length && (
            <div className="py-12 text-center text-sm text-gray-400">No se encontraron alertas con los filtros actuales.</div>
          )}
        </div>
      </div>
    );
  };

  window.Pages = window.Pages || {};
  window.Pages.AlertsPage = AlertsPage;
})();
