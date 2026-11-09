import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput({
  id: idProp,
  value,
  onChange,
  onBlur,
  disabled,
  autoComplete,
  placeholder,
  required,
  minLength,
  className,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const uid = useId();
  const id = idProp ?? uid;
  const [visible, setVisible] = useState(false);

  return (
    <div className={`password-input-wrap${className ? ` ${className}` : ''}`}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
      <button
        type="button"
        className="password-input-toggle"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
      </button>
    </div>
  );
}
