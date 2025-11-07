import Card from "../common/Card.jsx";

const CardMetric = ({ title, value, description, tone = "text-white", onClick }) => {
  const clickable = typeof onClick === "function";
  const handleKeyDown = (event) => {
    if (!clickable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };
  return (
    <Card
      className={`${clickable ? "cursor-pointer hover:border-sky-500 border border-transparent" : ""}`}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </Card>
  );
};

export default CardMetric;
