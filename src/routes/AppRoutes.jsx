import AlertsPage from '../pages/AlertsPage';
import DashboardPage from '../pages/DashboardPage.jsx';
import HelpPage from '../pages/HelpPage.jsx';
import ReportsPage from '../pages/ReportsPage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';

const routes = {
  dashboard: DashboardPage,
  alertas: AlertsPage,
  reportes: ReportsPage,
  configuracion: SettingsPage,
  ayuda: HelpPage,
};

export const getPageComponent = (page) => routes[page] || DashboardPage;
