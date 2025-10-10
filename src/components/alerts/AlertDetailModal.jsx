(function () {
  const { XCircleIcon } = window.Icons || {};
  const { severityTheme } = window.Utils || {};

  const AlertDetailModal = ({ alert, onClose }) => {
    if (!alert) return null;

    const theme = severityTheme?.[alert.criticidad] || severityTheme?.default || {};
    const borderColor = theme.tone || '#6b7280';
    const badgeClass = `${theme.badge || 'bg-gray-500/20 text-gray-300'} ${
      theme.border ? `border ${theme.border}` : 'border border-gray-500/60'
    }`.trim();

    return (
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border-t-4 modal-fade-in"
          onClick={(event) => event.stopPropagation()}
          style={{ borderColor }}
        >
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-3 py-1 text-sm font-bold rounded-full ${badgeClass}`}>
                  {alert.criticidad}
                </span>
                <h2 className="text-2xl font-bold text-white mt-3">{alert.tipo}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {dayjs(alert.timestamp).format('dddd, D [de] MMMM [de] YYYY, h:mm A')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <XCircleIcon className="w-8 h-8" />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div className="bg-gray-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Resumen del Incidente</h3>
                <p className="text-gray-300 text-sm">{alert.detalles}</p>
              </div>

              <div className="bg-green-900/30 border border-green-500/50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-300 mb-2">
                  QUÉ HACER AHORA (Pasos Recomendados)
                </h3>
                <div className="text-green-200 text-sm space-y-2 whitespace-pre-line">
                  {alert.recomendacion}
                </div>
              </div>

              <details className="bg-gray-900/50 p-4 rounded-lg cursor-pointer">
                <summary className="font-semibold text-white text-sm">Ver Detalles Técnicos</summary>
                <div className="mt-4 text-xs text-gray-400 font-mono grid grid-cols-2 gap-x-4 gap-y-2">
                  <p>
                    <strong>IP Origen:</strong> {alert.ipOrigen}
                  </p>
                  <p>
                    <strong>IP Destino:</strong> {alert.ipDestino}
                  </p>
                  <p>
                    <strong>Puerto Destino:</strong> {alert.puertoDestino}
                  </p>
                  <p>
                    <strong>Protocolo:</strong> {alert.protocolo}
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  };

  window.Components = window.Components || {};
  window.Components.Alerts = window.Components.Alerts || {};
  window.Components.Alerts.AlertDetailModal = AlertDetailModal;
})();
