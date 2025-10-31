(function () {
  window.Common = window.Common || {};
  window.Common.Button = ({
    children,
    onClick,
    className = '',
    type = 'button',
    disabled = false,
  }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 font-semibold text-white bg-blue-600 rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
      } ${className}`}
    >
      {children}
    </button>
  );
})();
