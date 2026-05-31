const Button = ({ children, onClick, className = '', type = 'button', disabled = false, ...props }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 font-semibold text-white bg-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors duration-300 ${
      disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-blue-700'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button;
