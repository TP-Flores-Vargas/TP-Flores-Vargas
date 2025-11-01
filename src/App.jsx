import { useState } from 'react';

import AlertDetailModal from './components/alerts/AlertDetailModal.jsx';
import DemoPredict from './components/DemoPredict.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AlertsProvider } from './context/AlertsContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useAlerts } from './hooks/useAlerts.js';
import LoginPage from './pages/LoginPage.jsx';
import { getPageComponent } from './routes/AppRoutes.jsx';

const AppShell = () => {
  const { isAuthenticated, login, logout } = useAuth();
  const { selectedAlert, setSelectedAlert } = useAlerts();
  const [page, setPage] = useState('dashboard');

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  const CurrentPage = getPageComponent(page);

  const handleLogout = () => {
    logout();
    setPage('dashboard');
    setSelectedAlert(null);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar page={page} setPage={setPage} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto bg-gray-800/50">
        <DemoPredict />
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

export default App;
