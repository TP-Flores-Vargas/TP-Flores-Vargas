(function () {
  const { createContext, useCallback, useEffect, useMemo, useState } = React;

  const STORAGE_KEY = 'ids-edu-auth';

  const AuthContext = createContext(null);

  const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
      try {
        return window.localStorage?.getItem(STORAGE_KEY) === 'true';
      } catch (error) {
        console.warn('No se pudo leer el estado de autenticación persistido.', error);
        return false;
      }
    });

    useEffect(() => {
      try {
        if (isAuthenticated) {
          window.localStorage?.setItem(STORAGE_KEY, 'true');
        } else {
          window.localStorage?.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.warn('No se pudo sincronizar el estado de autenticación.', error);
      }
    }, [isAuthenticated]);

    const login = useCallback(() => {
      setIsAuthenticated(true);
    }, []);

    const logout = useCallback(() => {
      setIsAuthenticated(false);
    }, []);

    const value = useMemo(
      () => ({
        isAuthenticated,
        login,
        logout,
      }),
      [isAuthenticated, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  window.Context = window.Context || {};
  window.Context.AuthContext = AuthContext;
  window.Context.AuthProvider = AuthProvider;
})();

