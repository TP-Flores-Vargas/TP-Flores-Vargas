import Card from "../common/Card.jsx";
import { HelpCircleIcon } from "../../assets/icons/index.jsx";
import { InfoTooltip } from "../InfoTooltip";

const CardMetric = ({ title, value, description, tone = "text-white", onClick, helperText }) => {
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        {helperText && (
          <InfoTooltip content={helperText}>
            <button
              type="button"
              aria-label={helperText}
              className="rounded-full border border-white/10 bg-white/5 p-1 text-gray-400 hover:text-white"
            >
              <HelpCircleIcon className="w-4 h-4" aria-hidden />
            </button>
          </InfoTooltip>
        )}
      </div>
      <p className={`text-3xl font-bold ${tone}`}>{value}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </Card>
  );
};

export default CardMetric;
