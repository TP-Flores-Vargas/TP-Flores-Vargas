import { createContext, useEffect, useMemo, useState } from 'react';

import { mockAlerts } from '../data/mockAlerts.js';
import { alertsService } from '../services/alertsService.js';

export const AlertsContext = createContext(null);

export const AlertsProvider = ({ children }) => {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadAlerts = async () => {
      try {
        const data = await alertsService.fetchAlerts();
        if (isMounted) {
          setAlerts(data);
        }
      } catch (error) {
        console.error('Error al cargar alertas', error);
      }
    };

    loadAlerts();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      alerts,
      setAlerts,
      selectedAlert,
      setSelectedAlert,
    }),
    [alerts, selectedAlert],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
};
