const Input = ({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = true,
  className = '',
  autoComplete,
  autoCapitalize,
  spellCheck,
  ...rest
}) => (
  <input
    id={id}
    name={id}
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    autoComplete={autoComplete}
    autoCapitalize={autoCapitalize}
    spellCheck={spellCheck}
    className={`w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...rest}
  />
);

export default Input;
