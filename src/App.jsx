(function () {
  const { useState } = React;

  const Sidebar = window.Components?.Layout?.Sidebar;
  const AlertDetailModal = window.Components?.Alerts?.AlertDetailModal;
  const { AuthProvider, AlertsProvider } = window.Context || {};
  const { useAuth, useAlerts } = window.Hooks || {};
  const { LoginPage } = window.Pages || {};
  const AppRoutes = window.Routes?.AppRoutes;

  const AppShell = () => {
    const { isAuthenticated, login, logout, isLoading: authLoading } = useAuth();
    const { selectedAlert, setSelectedAlert } = useAlerts();
    const [page, setPage] = useState('dashboard');

    if (authLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white animate-pulse">
          Verificando sesión...
        </div>
      );
    }

    if (!isAuthenticated) {
      return <LoginPage onLogin={login} />;
    }

    const CurrentPage = AppRoutes?.(page);

    const handleLogout = () => {
      logout();
      setPage('dashboard');
      setSelectedAlert(null);
    };

    return (
      <div className="flex h-screen bg-gray-900">
        <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto bg-gray-800/50">
          {CurrentPage ? <CurrentPage onSelectAlert={setSelectedAlert} /> : null}
        </main>
        {selectedAlert && (
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
