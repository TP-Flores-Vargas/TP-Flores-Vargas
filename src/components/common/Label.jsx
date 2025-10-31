const Label = ({ htmlFor, children, className = '' }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-300 ${className}`}>
    {children}
  </label>
);

export default Label;
