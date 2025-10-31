const Card = ({ children, className = '' }) => (
  <div className={`bg-gray-800 rounded-lg shadow p-6 ${className}`}>{children}</div>
);

export default Card;
