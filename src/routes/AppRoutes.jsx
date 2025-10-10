(function () {
  const AppRoutes = (page) => {
    const { DashboardPage, AlertsPage, ReportsPage, SettingsPage, HelpPage } = window.Pages || {};
    switch (page) {
      case 'dashboard':
        return DashboardPage;
      case 'alertas':
        return AlertsPage;
      case 'reportes':
        return ReportsPage;
      case 'configuracion':
        return SettingsPage;
      case 'ayuda':
        return HelpPage;
      default:
        return DashboardPage;
    }
  };

  window.Routes = window.Routes || {};
  window.Routes.AppRoutes = AppRoutes;
})();

