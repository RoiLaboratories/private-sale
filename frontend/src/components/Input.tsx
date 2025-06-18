interface InputProps {
  type?: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string;
  min?: number;
  max?: number;
  step?: string;
  id?: string;
}

const Input = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  label,
  min,
  max,
  step,
  id,
}: InputProps) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className="input"
      />
    </div>
  );
};

export default Input;
