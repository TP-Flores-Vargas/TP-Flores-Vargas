(function () {
  const getRouteComponent = {
    dashboard: () => window.Pages?.DashboardPage,
    alertas: () => window.Pages?.AlertsPage,
    reportes: () => window.Pages?.ReportsPage,
    configuracion: () => window.Pages?.SettingsPage,
    ayuda: () => window.Pages?.HelpPage,
  };

  const getNavigationItems = () => window.navigationItems || [];

  const buildRouteEntry = (id) => {
    const navItem = getNavigationItems().find((item) => item.id === id);
    const component = getRouteComponent[id]?.();
    return component
      ? {
          id,
          label: navItem?.label || id,
          icon: navItem?.icon,
          component,
        }
      : null;
  };

  const resolve = (pageId) => {
    const fallbackId = 'dashboard';
    const validId = getRouteComponent[pageId] ? pageId : fallbackId;
    return buildRouteEntry(validId) || buildRouteEntry(fallbackId);
  };

  const all = () => {
    const uniqueIds = Array.from(
      new Set([
        ...getNavigationItems()
          .map((item) => item.id)
          .filter((id) => Boolean(getRouteComponent[id])),
        'dashboard',
      ]),
    );

    return uniqueIds
      .map((id) => buildRouteEntry(id))
      .filter(Boolean);
  };

  window.Routes = window.Routes || {};
  window.Routes.AppRoutes = {
    resolve,
    all,
  };
})();

