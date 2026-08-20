import { useEffect, useRef, useState } from 'react';
import {
  amountFromDigitStream,
  clampAmount,
  formatBrlInputDigits,
  maxDigitsForAmount,
  parseBrlInput,
} from '../utils/currency.js';

export function CurrencyBrlInput({
  id,
  label,
  hint,
  value,
  min = 0,
  max = 999_999.99,
  disabled = false,
  onChange,
}) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatBrlInputDigits(value));

  useEffect(() => {
    if (!focused) {
      setText(formatBrlInputDigits(clampAmount(value, min, max)));
    }
  }, [value, min, max, focused]);

  const commit = (raw) => {
    const parsed = parseBrlInput(raw);
    const next = clampAmount(parsed, min, max);
    onChange(next);
    setText(formatBrlInputDigits(next));
    setFocused(false);
  };

  const onInputChange = (raw) => {
    const limit = maxDigitsForAmount(max);
    const digits = raw.replace(/\D/g, '').slice(0, limit);
    const amount = amountFromDigitStream(digits);
    const next = clampAmount(amount, min, max);
    setText(formatBrlInputDigits(next));
    onChange(next);
  };

  return (
    <label className="currency-brl-field">
      {label ? <span>{label}</span> : null}
      {hint ? <small className="muted currency-brl-hint">{hint}</small> : null}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        className="input"
        value={text}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onFocus={() => {
          setFocused(true);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onBlur={() => commit(text)}
        onChange={(e) => onInputChange(e.target.value)}
      />
    </label>
  );
}
