(function () {
  const { useState } = React;

  const Sidebar = window.Components?.Layout?.Sidebar;
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

    const CurrentPage = AppRoutes?.(page);

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
          {CurrentPage ? (
            <CurrentPage onSelectAlert={handleSelectAlert} onNavigate={handleNavigate} currentPage={page} />
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
