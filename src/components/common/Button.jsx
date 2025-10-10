(function () {
  window.Common = window.Common || {};
  window.Common.Button = ({ children, onClick, className = '', type = 'button' }) => (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors duration-300 ${className}`}
    >
      {children}
    </button>
  );
})();
