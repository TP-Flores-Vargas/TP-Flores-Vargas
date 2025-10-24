(function () {
  const { useState } = React;
  const { Button, Card, Input, Label } = window.Common || {};
  const { constants } = window.Config || {};

  const SettingsPage = () => {
    const [email, setEmail] = useState(constants?.SUPPORT_EMAIL || 'encargado.ti@colegio.edu.pe');
    const [notification, setNotification] = useState(null);

    const showNotification = (message, isError = false) => {
      setNotification({ message, isError });
      setTimeout(() => setNotification(null), 3000);
    };

    return (
      <div className="p-8 text-white max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Configuración</h1>
        {notification && (
          <div
            className={`p-4 rounded-md mb-6 text-sm ${
              notification.isError ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
            }`}
          >
            {notification.message}
          </div>
        )}
        <div className="space-y-8">
          <Card>
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Seguridad de Cuenta</h2>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                showNotification('Contraseña actualizada con éxito.');
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="currentPass">Contraseña Actual</Label>
                  <Input id="currentPass" type="password" />
                </div>
                <div>
                  <Label htmlFor="newPass">Nueva Contraseña</Label>
                  <Input id="newPass" type="password" />
                </div>
                <div>
                  <Label htmlFor="confirmPass">Confirmar Contraseña</Label>
                  <Input id="confirmPass" type="password" />
                </div>
              </div>
              <div className="text-right">
                <Button type="submit">Cambiar Contraseña</Button>
              </div>
            </form>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Configuración de Notificaciones</h2>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                showNotification('Correo de notificación guardado.');
              }}
            >
              <div>
                <Label htmlFor="email">Correo para Alertas Críticas</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="text-right">
                <Button type="submit">Guardar Correo</Button>
              </div>
            </form>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Mantenimiento del Sistema</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
              <Button onClick={() => showNotification('Copia de seguridad generada y descargada.')}>
                Crear Copia de Seguridad
              </Button>
              <Button variant="secondary">Restaurar Copia de Seguridad</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  window.Pages = window.Pages || {};
  window.Pages.SettingsPage = SettingsPage;
})();
