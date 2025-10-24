(function () {
  const { useMemo, useState } = React;

  const Sidebar = window.Components?.Layout?.Sidebar;
  const PageHeader = window.Components?.Layout?.PageHeader;
  const AlertDetailModal = window.Components?.Alerts?.AlertDetailModal;
  const { AuthProvider, AlertsProvider } = window.Context || {};
  const { useAuth, useAlerts } = window.Hooks || {};
  const { LoginPage } = window.Pages || {};
  const AppRoutes = window.Routes?.AppRoutes;

  const AppShell = () => {
    const { isAuthenticated, login, logout } = useAuth();
    const { selectedAlert, setSelectedAlert } = useAlerts();
    const [page, setPage] = useState('inicio');

    if (!isAuthenticated) {
      return <LoginPage onLogin={login} />;
    }

    const CurrentPage = useMemo(() => AppRoutes?.(page), [AppRoutes, page]);
    const pageMeta = useMemo(() => {
      const meta = window.Routes?.pageMeta?.[page];
      if (!meta) {
        return {
          title: 'IDS Educativo',
          description: 'Monitorea y gestiona la seguridad de la red académica en un solo lugar.',
          actions: [],
        };
      }
      return meta;
    }, [page]);

    const handleNavigate = (nextPage) => {
      if (!nextPage) return;
      setPage(nextPage);
    };

    const handleLogout = () => {
      logout();
      setPage('inicio');
      setSelectedAlert(null);
    };

    const handleSelectAlert = (alert) => {
      setSelectedAlert(alert);
    };

    return (
      <div className="flex h-screen bg-gray-900">
        <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto bg-gray-800/50">
          {PageHeader && (
            <PageHeader
              title={pageMeta.title}
              description={pageMeta.description}
              actions={pageMeta.actions}
              onNavigate={handleNavigate}
            />
          )}
          {CurrentPage ? (
            <CurrentPage
              onSelectAlert={handleSelectAlert}
              onNavigate={handleNavigate}
              currentPage={page}
              pageMeta={pageMeta}
            />
          ) : null}
        </main>
        {page !== 'detalles-alerta' && selectedAlert && (
          <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
        )}
      </div>
    );
  };

  const App = () => (
    <AuthProvider>
      <AlertsProvider>
        <AppShell />
      </AlertsProvider>
    </AuthProvider>
  );

  window.App = App;
})();
