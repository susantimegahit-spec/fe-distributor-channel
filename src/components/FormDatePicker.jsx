import ThemedDatePicker from './ThemedDatePicker';

export default function FormDatePicker({
  value,
  onChange,
  name,
  id,
  min,
  max,
  disabled = false,
  readOnly = false,
  required = false,
  size,
  className = '',
  ...props
}) {
  const emitChange = (nextValue) => {
    onChange?.({
      target: { value: nextValue, name, id },
      currentTarget: { value: nextValue, name, id }
    });
  };

  return (
    <ThemedDatePicker
      {...props}
      value={value}
      onChange={emitChange}
      min={min}
      max={max}
      disabled={disabled || readOnly}
      size={size}
      className={className}
      aria-required={required || undefined}
    />
  );
}
