(function () {
  const {
    LayoutDashboardIcon,
    BellIcon,
    FileTextIcon,
    SettingsIcon,
    HelpCircleIcon,
  } = window.Icons || {};

  window.navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { id: 'alertas', label: 'Alertas', icon: BellIcon },
    { id: 'reportes', label: 'Reportes', icon: FileTextIcon },
    { id: 'configuracion', label: 'Configuración', icon: SettingsIcon },
    { id: 'ayuda', label: 'Ayuda', icon: HelpCircleIcon },
  ];
})();
