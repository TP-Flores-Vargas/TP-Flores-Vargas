(function () {
  window.Common = window.Common || {};
  window.Common.Button = ({
    children,
    onClick,
    className = '',
    type = 'button',
    disabled = false,
    ...props
  }) => {
    const baseClasses =
      'px-4 py-2 font-semibold text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-300';
    const enabledClasses = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    const disabledClasses = 'bg-blue-600 opacity-60 cursor-not-allowed';

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${disabled ? disabledClasses : enabledClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  };
})();
