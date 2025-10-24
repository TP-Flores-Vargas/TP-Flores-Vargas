(function () {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-transparent text-blue-300 border border-blue-500/40 hover:bg-blue-500/10 focus:ring-blue-400',
    ghost: 'bg-gray-700/70 text-gray-200 border border-gray-600/60 hover:bg-gray-600/70 focus:ring-gray-400',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  window.Common = window.Common || {};
  window.Common.Button = ({
    children,
    onClick,
    className = '',
    type = 'button',
    variant = 'primary',
    size = 'md',
    ...rest
  }) => (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
})();
