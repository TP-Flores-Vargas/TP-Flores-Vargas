(function () {
  const baseClass =
    'px-4 py-2 font-semibold text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-400',
    success: 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-400',
    danger: 'bg-red-600 hover:bg-red-500 focus:ring-red-400',
  };

  window.Common = window.Common || {};
  window.Common.Button = ({
    children,
    onClick,
    className = '',
    type = 'button',
    variant = 'primary',
    ...rest
  }) => (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClass} ${variants[variant] || variants.primary} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
})();
