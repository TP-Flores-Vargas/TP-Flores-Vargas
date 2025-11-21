import { LogOutIcon, ShieldIcon } from "../../assets/icons/index.jsx";
import { constants } from "../../config/constants.js";
import { navigationItems } from "../../routes/navigation.js";
import { useAuth } from "../../hooks/useAuth.js";

const Sidebar = ({
  page,
  setPage,
  onLogout,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  setMobileOpen,
}) => {
  const widthClass = collapsed ? "w-20" : "w-64";
  const { user } = useAuth();
  const allowedItems = navigationItems.filter(
    (item) => !item.requiresAdmin || user?.role === "admin",
  );

  const handleNavigate = (id) => {
    setPage(id);
    setMobileOpen(false);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />
      <div
        className={`bg-gray-900 text-gray-300 flex flex-col transition-all duration-300 h-full w-64 ${
          collapsed ? "lg:w-20" : "lg:w-64"
        } fixed z-30 inset-y-0 left-0 transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:translate-x-0 lg:z-auto`}
      >
        <div className="flex items-center justify-between h-20 border-b border-gray-800 px-5">
          <button
            type="button"
            className="flex items-center gap-3 focus:outline-none transition hover:opacity-80"
            onClick={onToggleCollapse}
            aria-label="Alternar tamaño del menú"
          >
            <ShieldIcon className="w-8 h-8 text-blue-500" />
            {!collapsed && (
              <span className="text-xl font-bold text-white whitespace-nowrap">{constants.APP_NAME}</span>
            )}
          </button>
          <button
            type="button"
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {allowedItems.map((item) => {
            const isActive = page === item.id;
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  isActive ? "bg-blue-600 text-white" : "hover:bg-gray-800"
                }`}
                title={item.label}
              >
                <ItemIcon className="w-5 h-5" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-6 border-t border-gray-800">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <LogOutIcon className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
