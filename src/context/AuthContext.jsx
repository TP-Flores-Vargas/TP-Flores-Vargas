(function () {
  const { createContext, useMemo, useState } = React;

  const AuthContext = createContext(null);

  const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const value = useMemo(
      () => ({
        isAuthenticated,
        login: () => setIsAuthenticated(true),
        logout: () => setIsAuthenticated(false),
      }),
      [isAuthenticated],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  window.Context = window.Context || {};
  window.Context.AuthContext = AuthContext;
  window.Context.AuthProvider = AuthProvider;
})();

