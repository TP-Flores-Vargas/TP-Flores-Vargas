(function () {
  const { HomeIcon, LayoutDashboardIcon, BellIcon, AlertTriangleIcon, FileTextIcon, SettingsIcon } = window.Icons || {};

  window.navigationItems = [
    { id: 'inicio', label: 'Inicio', icon: HomeIcon },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { id: 'alertas', label: 'Alertas', icon: BellIcon },
    { id: 'detalles-alerta', label: 'Detalles de Alerta', icon: AlertTriangleIcon },
    { id: 'reportes', label: 'Reportes', icon: FileTextIcon },
    { id: 'configuracion', label: 'Configuración', icon: SettingsIcon },
  ];
})();
