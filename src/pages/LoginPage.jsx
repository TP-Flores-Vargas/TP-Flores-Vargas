(function () {
  const { useEffect, useState } = React;
  const { Button, Input, Label } = window.Common || {};
  const { ShieldIcon } = window.Icons || {};
  const { useAuth } = window.Hooks || {};

  const LoginPage = ({ onLogin }) => {
    const auth = useAuth?.();
    const [email, setEmail] = useState('admin@colegio.edu.pe');
    const [password, setPassword] = useState('admin123');
    const [error, setError] = useState(auth?.authError || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      if (auth?.authError) {
        setError(auth.authError);
      }
    }, [auth?.authError]);

    const handleSubmit = async (event) => {
      event.preventDefault();
      setError('');
      const loginFn = auth?.login || onLogin;
      if (!loginFn) return;

      try {
        setIsSubmitting(true);
        const result = await loginFn({ email, password });
        if (!result?.success) {
          setError(result?.message || auth?.authError || 'No se pudo iniciar sesión.');
        }
      } catch (submitError) {
        setError(submitError.message || 'No se pudo iniciar sesión.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg modal-fade-in">
          <div className="text-center">
            <ShieldIcon className="w-16 h-16 mx-auto text-blue-500" />
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
              Sistema de Detección de Intrusiones
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Consola de monitoreo para colegios · Proyecto de IDS con Machine Learning
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Correo institucional</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                  auth?.clearError?.();
                }}
                placeholder="admin@colegio.edu.pe"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                  auth?.clearError?.();
                }}
                placeholder="********"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div>
              <Button type="submit" className="w-full" disabled={isSubmitting || auth?.isProcessing}>
                {isSubmitting || auth?.isProcessing ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  window.Pages = window.Pages || {};
  window.Pages.LoginPage = LoginPage;
})();
