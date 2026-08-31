import { useMemo } from 'react';
import {
  buildGradient,
  colorInputValue,
  GRADIENT_DIRECTIONS,
  GRADIENT_PRESETS,
  parseGradient,
} from '../utils/marketingFormBuilder.js';

function ColorControl({ label, value, onChange, disabled }) {
  const pickerValue = colorInputValue(value);

  return (
    <label className="marketing-color-field">
      <span>{label}</span>
      <div className="marketing-color-input">
        <input
          type="color"
          value={pickerValue}
          onChange={(ev) => onChange(ev.target.value)}
          disabled={disabled}
          aria-label={`${label} — seletor de cor`}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(ev) => onChange(ev.target.value)}
          disabled={disabled}
          placeholder="#000000"
        />
      </div>
    </label>
  );
}

export function MarketingGradientField({ label, value, onChange, disabled }) {
  const config = useMemo(() => parseGradient(value), [value]);
  const preview = buildGradient(config);

  const update = (patch) => {
    onChange(buildGradient({ ...config, ...patch }));
  };

  return (
    <div className="marketing-gradient-field field-span-2">
      <span className="marketing-gradient-label">{label}</span>

      <div
        className="marketing-gradient-preview"
        style={{ background: preview }}
        aria-hidden="true"
      />

      <div className="marketing-gradient-presets" role="list" aria-label="Presets de gradiente">
        {GRADIENT_PRESETS.map((preset) => {
          const presetValue = buildGradient(preset);
          return (
            <button
              key={preset.label}
              type="button"
              className={`marketing-gradient-preset${presetValue === value ? ' is-active' : ''}`}
              style={{ background: presetValue }}
              disabled={disabled}
              title={preset.label}
              onClick={() => onChange(presetValue)}
            >
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      <div className="marketing-gradient-controls">
        <ColorControl
          label="Cor inicial"
          value={config.startColor}
          onChange={(startColor) => update({ startColor })}
          disabled={disabled}
        />
        <ColorControl
          label="Cor final"
          value={config.endColor}
          onChange={(endColor) => update({ endColor })}
          disabled={disabled}
        />
      </div>

      <label className="marketing-gradient-direction">
        <span>Direção</span>
        <select
          value={String(config.angle)}
          onChange={(ev) => update({ angle: Number(ev.target.value) })}
          disabled={disabled}
        >
          {GRADIENT_DIRECTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
