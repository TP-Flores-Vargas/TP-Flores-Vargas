(function () {
  const { ShieldIcon, LogOutIcon } = window.Icons || {};
  const { constants } = window.Config || {};
  const appName = constants?.APP_NAME || 'IDS Educativo';

  const Sidebar = ({ activeWindow, openWindows = [], onOpenWindow, onLogout }) => (
    <div className="flex flex-col w-64 bg-gray-900 text-gray-300">
      <div className="flex items-center justify-center h-20 border-b border-gray-800">
        <ShieldIcon className="w-8 h-8 text-blue-500" />
        <span className="ml-3 text-xl font-bold text-white">{appName}</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {(window.navigationItems || []).map((item) => {
          const isActive = activeWindow === item.id;
          const isOpen = openWindows.includes(item.id);
          const ItemIcon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenWindow?.(item.id)}
              className={`flex w-full items-center justify-between px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : isOpen
                  ? 'bg-gray-800/70 text-white'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="flex items-center">
                {ItemIcon ? <ItemIcon className="w-5 h-5" /> : null}
                <span className="ml-4 font-medium">{item.label}</span>
              </span>
              {isOpen && (
                <span
                  className={`text-xs font-semibold tracking-wide ${
                    isActive ? 'text-blue-100' : 'text-blue-300'
                  }`}
                >
                  {isActive ? 'Activa' : 'Abierta'}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-6 border-t border-gray-800">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors duration-200"
        >
          <LogOutIcon className="w-5 h-5" />
          <span className="ml-4 font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  window.Components = window.Components || {};
  window.Components.Layout = window.Components.Layout || {};
  window.Components.Layout.Sidebar = Sidebar;
})();
