import { useContext } from 'react';

import { AlertsContext } from '../context/AlertsContext.jsx';

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts debe usarse dentro de AlertsProvider');
  }
  return context;
};
