(function () {
  const { useContext } = React;

  const useAuth = () => {
    const context = useContext(window.Context?.AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
  };

  window.Hooks = window.Hooks || {};
  window.Hooks.useAuth = useAuth;
})();

