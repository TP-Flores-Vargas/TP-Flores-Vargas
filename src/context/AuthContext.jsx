(function () {
  const { createContext, useEffect, useMemo, useState } = React;
  const api = window.Services?.api;

  const AuthContext = createContext(null);

  const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [authError, setAuthError] = useState('');
    const [sessions, setSessions] = useState([]);

    const loadCurrentUser = async () => {
      if (!api?.getToken) {
        setIsLoading(false);
        return;
      }
      const token = api.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await api.getCurrentUser();
        setUser(response?.user || response || null);
        setAuthError('');
      } catch (error) {
        console.warn('No se pudo validar la sesión activa', error);
        api?.clearToken?.();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    const refreshSessions = async () => {
      if (!api?.fetchSessions) return;
      try {
        const response = await api.fetchSessions();
        setSessions(response?.sessions || []);
      } catch (error) {
        console.warn('No se pudieron recuperar las sesiones activas', error);
      }
    };

    useEffect(() => {
      loadCurrentUser();
    }, []);

    useEffect(() => {
      if (!api?.onUnauthorized) return undefined;
      const unsubscribe = api.onUnauthorized(() => {
        setUser(null);
        setSessions([]);
        setAuthError('La sesión ha expirado. Inicie sesión nuevamente.');
        setIsLoading(false);
      });
      return unsubscribe;
    }, []);

    useEffect(() => {
      if (user?.id) {
        refreshSessions();
      }
    }, [user?.id]);

    const login = async ({ email, password }) => {
      if (!api?.login) {
        if (email === 'admin@colegio.edu.pe' && password === 'admin123') {
          setUser({ id: 'demo', email, name: 'Administrador (demo)' });
          setAuthError('');
          setIsLoading(false);
          return { success: true };
        }
        const message = 'Credenciales inválidas';
        setAuthError(message);
        return { success: false, message };
      }

      setIsProcessing(true);
      setAuthError('');
      try {
        const response = await api.login(email, password);
        setUser(response?.user || null);
        await refreshSessions();
        setIsLoading(false);
        return { success: true, user: response?.user || null };
      } catch (error) {
        const message = error.message || 'No se pudo iniciar sesión';
        setAuthError(message);
        setUser(null);
        return { success: false, message };
      } finally {
        setIsProcessing(false);
      }
    };

    const logout = async () => {
      try {
        await api?.logout?.();
      } catch (error) {
        console.warn('Error al cerrar sesión', error);
      } finally {
        setUser(null);
        setSessions([]);
        setAuthError('');
        setIsLoading(false);
      }
    };

    const value = useMemo(
      () => ({
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        isProcessing,
        authError,
        sessions,
        login,
        logout,
        refreshSessions,
        clearError: () => setAuthError(''),
      }),
      [user, isLoading, isProcessing, authError, sessions],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  window.Context = window.Context || {};
  window.Context.AuthContext = AuthContext;
  window.Context.AuthProvider = AuthProvider;
})();
