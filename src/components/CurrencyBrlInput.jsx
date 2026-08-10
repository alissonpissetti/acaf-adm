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
  showSteppers = false,
  step = 1,
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

  const commit = (raw, blur = false) => {
    const parsed = parseBrlInput(raw);
    const next = clampAmount(parsed, min, max);
    onChange(next);
    setText(formatBrlInputDigits(next));
    if (blur) setFocused(false);
  };

  const onInputChange = (raw) => {
    const limit = maxDigitsForAmount(max);
    const digits = raw.replace(/\D/g, '').slice(0, limit);
    const amount = amountFromDigitStream(digits);
    const next = clampAmount(amount, min, max);
    setText(formatBrlInputDigits(next));
    onChange(next);
  };

  const nudge = (delta) => {
    const next = clampAmount(value + delta, min, max);
    onChange(next);
    setText(formatBrlInputDigits(next));
  };

  const atMin = value <= min + 0.001;
  const atMax = value >= max - 0.001;

  return (
    <label className="currency-brl-field">
      {label ? <span>{label}</span> : null}
      {hint ? <small className="muted currency-brl-hint">{hint}</small> : null}
      <div
        className={`currency-brl-control ${focused ? 'is-focused' : ''} ${disabled ? 'is-disabled' : ''}`}
      >
        <span className="currency-brl-prefix" aria-hidden="true">
          R$
        </span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          className="currency-brl-input"
          value={text}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onFocus={() => {
            setFocused(true);
            requestAnimationFrame(() => inputRef.current?.select());
          }}
          onBlur={() => commit(text, true)}
          onChange={(e) => onInputChange(e.target.value)}
        />
        {showSteppers ? (
          <div className="currency-brl-steppers">
            <button
              type="button"
              className="currency-brl-step"
              disabled={disabled || atMin}
              aria-label="Diminuir um real"
              onClick={() => nudge(-step)}
            >
              −
            </button>
            <button
              type="button"
              className="currency-brl-step"
              disabled={disabled || atMax}
              aria-label="Aumentar um real"
              onClick={() => nudge(step)}
            >
              +
            </button>
          </div>
        ) : null}
      </div>
    </label>
  );
}
