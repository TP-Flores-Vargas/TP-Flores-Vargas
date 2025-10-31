import {
  BellIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  FileTextIcon,
} from '../assets/icons/index.jsx';

export const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { id: 'alertas', label: 'Alertas', icon: BellIcon },
  { id: 'reportes', label: 'Reportes', icon: FileTextIcon },
  { id: 'configuracion', label: 'Configuración', icon: SettingsIcon },
  { id: 'ayuda', label: 'Ayuda', icon: HelpCircleIcon },
];
