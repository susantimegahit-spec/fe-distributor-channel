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
  const controlClassName = [size === 'sm' ? 'form-control-sm' : '', size === 'lg' ? 'form-control-lg' : '', className]
    .filter(Boolean)
    .join(' ');

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
      className={controlClassName}
      aria-required={required || undefined}
    />
  );
}
