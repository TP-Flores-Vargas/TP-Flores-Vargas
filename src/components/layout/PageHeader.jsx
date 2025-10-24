(function () {
  const { Button } = window.Common || {};

  const PageHeader = ({ title, description, actions = [], onNavigate }) => (
    <header className="sticky top-0 z-10 border-b border-gray-800/80 bg-gray-900/70 backdrop-blur">
      <div className="px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          {description && <p className="mt-2 text-sm text-gray-400 max-w-3xl">{description}</p>}
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant || 'secondary'}
                size={action.size || 'sm'}
                onClick={() => {
                  if (typeof action.onClick === 'function') {
                    action.onClick();
                    return;
                  }
                  if (action.target) {
                    onNavigate?.(action.target);
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );

  window.Components = window.Components || {};
  window.Components.Layout = window.Components.Layout || {};
  window.Components.Layout.PageHeader = PageHeader;
})();
