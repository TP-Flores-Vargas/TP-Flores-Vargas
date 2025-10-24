(function () {
  const { useMemo, useState } = React;

  const Sidebar = window.Components?.Layout?.Sidebar;
  const WindowFrame = window.Components?.Layout?.WindowFrame;
  const AlertDetailModal = window.Components?.Alerts?.AlertDetailModal;
  const { AuthProvider, AlertsProvider } = window.Context || {};
  const { useAuth, useAlerts } = window.Hooks || {};
  const { LoginPage } = window.Pages || {};
  const AppRoutes = window.Routes?.AppRoutes;

  const AppShell = () => {
    const { isAuthenticated, login, logout } = useAuth();
    const { selectedAlert, setSelectedAlert } = useAlerts();
    const availableWindows = useMemo(() => {
      const registry = new Map();
      const entries = AppRoutes?.all?.() || [];
      entries.forEach((entry) => {
        if (entry?.component) {
          registry.set(entry.id, entry);
        }
      });
      return registry;
    }, []);

    const defaultOrder = useMemo(() => {
      const defaults = ['dashboard', 'alertas'];
      const validDefaults = defaults.filter((id) => availableWindows.has(id));
      if (validDefaults.length) {
        return validDefaults;
      }
      if (availableWindows.size) {
        const firstAvailable = availableWindows.keys().next().value;
        return firstAvailable ? [firstAvailable] : [];
      }
      return [];
    }, [availableWindows]);

    const [openWindows, setOpenWindows] = useState(() => [...defaultOrder]);
    const [activeWindow, setActiveWindow] = useState(defaultOrder[0] || null);

    if (!isAuthenticated) {
      return <LoginPage onLogin={login} />;
    }

    const handleOpenWindow = (id) => {
      if (!availableWindows.has(id)) {
        return;
      }
      setOpenWindows((prev) => {
        if (prev.includes(id)) {
          const reordered = [...prev.filter((item) => item !== id), id];
          return reordered;
        }
        return [...prev, id];
      });
      setActiveWindow(id);
    };

    const handleFocusWindow = (id) => {
      if (availableWindows.has(id)) {
        setActiveWindow(id);
      }
    };

    const handleCloseWindow = (id) => {
      setOpenWindows((prev) => {
        const filtered = prev.filter((item) => item !== id);
        if (prev.includes(id)) {
          setActiveWindow((current) => {
            if (current !== id) return current;
            if (filtered.length) {
              return filtered[filtered.length - 1];
            }
            return null;
          });
        }
        return filtered;
      });
      if (id === 'alertas') {
        setSelectedAlert(null);
      }
    };

    const handleLogout = () => {
      logout();
      setOpenWindows([...defaultOrder]);
      setActiveWindow(defaultOrder[0] || null);
      setSelectedAlert(null);
    };

    const windowsToRender = openWindows
      .map((id) => ({ id, config: availableWindows.get(id) }))
      .filter(({ config }) => Boolean(config && config.component));

    return (
      <div className="flex h-screen bg-gray-900">
        <Sidebar
          activeWindow={activeWindow}
          openWindows={openWindows}
          onOpenWindow={handleOpenWindow}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto bg-gray-800/50 p-6">
          {windowsToRender.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {windowsToRender.map(({ id, config }) => {
                const WindowComponent = config.component;
                return (
                  <WindowFrame
                    key={id}
                    title={config.label}
                    isActive={activeWindow === id}
                    onClose={() => handleCloseWindow(id)}
                    onFocus={() => handleFocusWindow(id)}
                    className="min-h-[26rem]"
                  >
                    <WindowComponent onSelectAlert={setSelectedAlert} />
                  </WindowFrame>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-700 text-gray-400">
              Seleccione una ventana desde la barra lateral para comenzar.
            </div>
          )}
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
