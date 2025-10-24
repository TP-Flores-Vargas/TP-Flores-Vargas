(function () {
  const { Input, Label, Button } = window.Common || {};
  const { constants } = window.Config || {};

  const AlertFilters = ({ filters, onChange, onReset }) => {
    const handleChange = (field) => (event) => {
      onChange?.(field, event.target.value);
    };

    return (
      <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="severityFilter">Criticidad</Label>
            <select
              id="severityFilter"
              value={filters.severity}
              onChange={handleChange('severity')}
              className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm"
            >
              <option value="all">Todas</option>
              {(constants?.ALERT_LEVELS || []).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="timeRangeFilter">Periodo</Label>
            <select
              id="timeRangeFilter"
              value={filters.timeRange}
              onChange={handleChange('timeRange')}
              className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm"
            >
              <option value="all">Todo el historial</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="searchFilter">Buscar por amenaza o IP</Label>
            <Input
              id="searchFilter"
              type="search"
              value={filters.search}
              onChange={(event) => onChange?.('search', event.target.value)}
              placeholder="Ej. Malware, 192.168.1.10"
              required={false}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-400">
            Los filtros se aplican automáticamente sobre el historial de alertas.
          </p>
          <Button variant="secondary" onClick={onReset} className="w-full sm:w-auto">
            Limpiar filtros
          </Button>
        </div>
      </div>
    );
  };

  window.Components = window.Components || {};
  window.Components.Alerts = window.Components.Alerts || {};
  window.Components.Alerts.AlertFilters = AlertFilters;
})();
