import "./styles/index.css";

import { useState } from "react";

import Sidebar from "./components/layout/Sidebar.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AlertsProvider } from "./context/AlertsContext.jsx";
import { useAuth } from "./hooks/useAuth.js";
import LoginPage from "./pages/LoginPage.jsx";
import { getPageComponent } from "./routes/AppRoutes.jsx";
import { useAlertsStore } from "./store/alerts";

const AppShell = () => {
  const { isAuthenticated, login, logout } = useAuth();
  const { selectedAlert, setSelectedAlert } = useAlertsStore();
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  const CurrentPage = getPageComponent(page);

  const handleLogout = () => {
    logout();
    setPage("dashboard");
    setSelectedAlert(null);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar
        page={page}
        setPage={setPage}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b border-gray-800 bg-gray-900/95 px-4 py-3 sticky top-0 z-20">
          <button
            type="button"
            className="lg:hidden text-gray-200"
            aria-label="Abrir menú"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="ml-auto text-xs text-gray-500 hidden sm:block">
            Sesión activa · {new Date().toLocaleTimeString()}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-800/50">
          {CurrentPage ? (
            <CurrentPage onSelectAlert={setSelectedAlert} onNavigate={setPage} />
          ) : null}
        </main>
      </div>
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

export default App;
