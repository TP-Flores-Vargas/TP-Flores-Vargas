const Card = ({ children, className = '', ...rest }) => (
  <div className={`bg-gray-800 rounded-lg shadow p-6 ${className}`} {...rest}>
    {children}
  </div>
);

export default Card;
