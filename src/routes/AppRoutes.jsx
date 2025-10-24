(function () {
  const AppRoutes = (page) => {
    const {
      HomePage,
      DashboardPage,
      AlertsPage,
      AlertDetailsPage,
      ReportsPage,
      SettingsPage,
      HelpPage,
    } = window.Pages || {};
    switch (page) {
      case 'inicio':
        return HomePage;
      case 'dashboard':
        return DashboardPage;
      case 'alertas':
        return AlertsPage;
      case 'detalles-alerta':
        return AlertDetailsPage;
      case 'reportes':
        return ReportsPage;
      case 'configuracion':
        return SettingsPage;
      case 'ayuda':
        return HelpPage;
      default:
        return HomePage;
    }
  };

  window.Routes = window.Routes || {};
  window.Routes.AppRoutes = AppRoutes;
})();

