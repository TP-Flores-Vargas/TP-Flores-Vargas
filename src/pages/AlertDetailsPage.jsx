(function () {
  const { Card, Button } = window.Common || {};
  const { AlertTriangleIcon, CheckCircleIcon, FileTextIcon } = window.Icons || {};
  const { severityTheme } = window.Utils || {};
  const { formatDate } = window.Utils || {};
  const { useAlerts } = window.Hooks || {};

  const severityOrder = ['Alta', 'Media', 'Baja'];

  const AlertDetailsPage = ({ onNavigate }) => {
    const { alerts, selectedAlert, setSelectedAlert } = useAlerts();

    const fallbackAlert = React.useMemo(() => {
      if (!alerts.length) return null;
      const toIndex = (criticidad) => {
        const index = severityOrder.indexOf(criticidad);
        return index === -1 ? severityOrder.length : index;
      };
      const sorted = [...alerts].sort((a, b) => toIndex(a.criticidad) - toIndex(b.criticidad));
      return sorted[0];
    }, [alerts]);

    React.useEffect(() => {
      if (!selectedAlert && fallbackAlert) {
        setSelectedAlert(fallbackAlert);
      }
    }, [selectedAlert, fallbackAlert, setSelectedAlert]);

    const activeAlert = selectedAlert || fallbackAlert;

    if (!alerts.length) {
      return (
        <div className="p-10 text-center text-gray-300">
          <p className="text-2xl font-semibold text-white mb-3">No hay alertas registradas</p>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Una vez que el motor de detección identifique incidentes de seguridad, encontrarás aquí un análisis detallado con recomendaciones personalizadas.
          </p>
        </div>
      );
    }

    const theme = severityTheme?.[activeAlert?.criticidad] || severityTheme?.default || {};

    return (
      <div className="p-10 space-y-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest">Detalle de Alerta</p>
            <h1 className="text-3xl font-bold">{activeAlert?.tipo}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full border ${
                theme.border || 'border-gray-500/60'
              } ${theme.badge || 'bg-gray-500/20 text-gray-200'}`}
            >
              {activeAlert?.criticidad}
            </span>
            <span className="px-3 py-1 text-sm rounded-full bg-gray-800/80 border border-gray-700 text-gray-300">
              {formatDate?.(activeAlert?.timestamp)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 bg-gray-900/70 border border-gray-800/80 space-y-6">
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangleIcon className="w-6 h-6 text-rose-400" />
                <h2 className="text-xl font-semibold">Resumen del incidente</h2>
              </div>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">{activeAlert?.detalles}</p>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-semibold">Pasos recomendados</h2>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-sm text-emerald-200 whitespace-pre-line">{activeAlert?.recomendacion}</p>
              </div>
            </section>
          </Card>

          <div className="space-y-6">
            <Card className="bg-gray-900/70 border border-gray-800/80 space-y-4">
              <h2 className="text-xl font-semibold">Datos técnicos</h2>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">IP de Origen</span>
                  <span className="font-mono">{activeAlert?.ipOrigen}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IP de Destino</span>
                  <span className="font-mono">{activeAlert?.ipDestino}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Puerto / Servicio</span>
                  <span className="font-mono">{activeAlert?.puertoDestino}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Protocolo</span>
                  <span className="font-semibold">{activeAlert?.protocolo}</span>
                </div>
              </div>
            </Card>
            <Card className="bg-gray-900/70 border border-gray-800/80 space-y-4">
              <div className="flex items-center gap-3">
                <FileTextIcon className="w-6 h-6 text-blue-300" />
                <h2 className="text-xl font-semibold">Alertas recientes</h2>
              </div>
              <ul className="space-y-3 text-sm">
                {alerts.slice(0, 5).map((alert) => {
                  const itemTheme = severityTheme?.[alert.criticidad] || severityTheme?.default || {};
                  return (
                    <li
                      key={alert.id}
                      className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2 border cursor-pointer transition-colors duration-200 ${
                        alert.id === activeAlert?.id
                          ? 'bg-blue-600/20 border-blue-500/40'
                          : 'bg-gray-800/60 border-gray-700 hover:bg-gray-700/60'
                      }`}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div>
                        <p className="font-medium text-white">{alert.tipo}</p>
                        <p className="text-xs text-gray-400">{formatDate?.(alert.timestamp)}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                          itemTheme.border || 'border-gray-500/60'
                        } ${itemTheme.badge || 'bg-gray-500/20 text-gray-200'}`}
                      >
                        {alert.criticidad}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Button className="w-full" onClick={() => onNavigate?.('alertas')} variant="secondary">
                Ir al historial completo
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  window.Pages = window.Pages || {};
  window.Pages.AlertDetailsPage = AlertDetailsPage;
})();
