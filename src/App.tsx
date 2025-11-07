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
      <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto bg-gray-800/50">
        {CurrentPage ? <CurrentPage onSelectAlert={setSelectedAlert} /> : null}
      </main>
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
