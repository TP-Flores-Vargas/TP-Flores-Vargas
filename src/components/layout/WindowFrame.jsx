(function () {
  const WindowFrame = ({
    title,
    children,
    isActive = false,
    onClose,
    onFocus,
    className = '',
  }) => {
    const handleClick = () => {
      onFocus?.();
    };

    const handleClose = (event) => {
      event.stopPropagation();
      onClose?.();
    };

    return (
      <section
        className={`group relative flex h-full min-h-[22rem] flex-col overflow-hidden rounded-xl border bg-gray-900/80 backdrop-blur transition-all duration-200 ${
          isActive
            ? 'border-blue-500 shadow-lg shadow-blue-500/20'
            : 'border-gray-800 hover:border-gray-700/70 hover:shadow-lg hover:shadow-blue-500/10'
        } ${className}`}
        onClick={handleClick}
        onFocus={handleClick}
        tabIndex={0}
        role="group"
      >
        <header
          className={`flex items-center justify-between border-b px-4 py-3 ${
            isActive ? 'border-blue-500/40 bg-gray-900/70' : 'border-gray-800 bg-gray-900/50'
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">Ventana</p>
            <h2 className="text-sm font-bold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 transition-colors hover:text-white"
            aria-label={`Cerrar ventana ${title}`}
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </section>
    );
  };

  window.Components = window.Components || {};
  window.Components.Layout = window.Components.Layout || {};
  window.Components.Layout.WindowFrame = WindowFrame;
})();
