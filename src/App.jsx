(function () {
  const { useState } = React;

  const providers = window.Context?.Providers || {};
  const AuthProvider = providers.AuthProvider || window.Context?.AuthProvider;
  const AlertsProvider = providers.AlertsProvider || window.Context?.AlertsProvider;

  const Sidebar = window.Components?.Layout?.Sidebar;
  const AlertDetailModal = window.Components?.Alerts?.AlertDetailModal;
  const useAuth = window.Hooks?.useAuth;
  const useAlerts = window.Hooks?.useAlerts;
  const LoginPage = window.Pages?.LoginPage;
  const AppRoutes = window.Routes?.AppRoutes;

  const requiredDependencies = {
    AuthProvider,
    AlertsProvider,
    useAuth,
    useAlerts,
    LoginPage,
    AppRoutes,
    Sidebar,
  };

  const dependencyLabels = {
    AuthProvider: 'AuthProvider (contexto de autenticación)',
    AlertsProvider: 'AlertsProvider (contexto de alertas)',
    useAuth: 'useAuth (hook de autenticación)',
    useAlerts: 'useAlerts (hook de alertas)',
    LoginPage: 'LoginPage',
    AppRoutes: 'AppRoutes',
    Sidebar: 'Sidebar',
  };

  const missingDependencies = Object.entries(requiredDependencies)
    .filter(([, value]) => typeof value === 'undefined' || value === null)
    .map(([name]) => name);

  const missingLabels = missingDependencies.map((name) => dependencyLabels[name] || name);

  if (missingDependencies.length) {
    console.error('[App] No se pudo inicializar la aplicación. Dependencias faltantes:', missingLabels);

    const MissingDependencies = () => (
      <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center px-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">No se pudo cargar la aplicación</h1>
        <p className="text-sm text-gray-400 max-w-lg">
          {`Faltan las siguientes dependencias: ${missingLabels.join(', ')}. Verifica que todos los archivos se hayan cargado correctamente e intenta recargar.`}
        </p>
      </div>
    );

    window.App = MissingDependencies;
    return;
  }

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
        {AlertDetailModal && page !== 'detalles-alerta' && selectedAlert ? (
          <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
        ) : null}
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
