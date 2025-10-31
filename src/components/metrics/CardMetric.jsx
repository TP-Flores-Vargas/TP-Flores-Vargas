import Card from '../common/Card.jsx';

const CardMetric = ({ title, value, description, tone = 'text-white' }) => (
  <Card>
    <p className="text-sm font-medium text-gray-400">{title}</p>
    <p className={`text-3xl font-bold ${tone}`}>{value}</p>
    {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
  </Card>
);

export default CardMetric;
