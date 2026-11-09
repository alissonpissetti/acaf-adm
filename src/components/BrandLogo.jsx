import { brandLogoDimensions, BRAND_LOGO_SRC } from './brandLogoPaths.js';

export function BrandLogo({ height = 28, variant = 'purple', className = '', noFixedDimensions = false }) {
  const src = BRAND_LOGO_SRC[variant];
  const dims = brandLogoDimensions(variant, height);
  const style = noFixedDimensions ? undefined : { width: dims.width, height: dims.height };
  const classes = ['brand-logo', 'brand-logo--img', `brand-logo--${variant}`, className].filter(Boolean).join(' ').trim();

  return (
    <span className={classes} role="img" aria-label="movly. by ACAF" style={style}>
      <img className="brand-logo-img" src={src} alt="" width={dims.width} height={dims.height} decoding="async" />
    </span>
  );
}

export function BrandMark({ size = 36, tone = 'purple', className = '', bg, fg }) {
  const fontSize = Math.max(12, Math.round(size * 0.45));
  const style = {
    width: size,
    height: size,
    fontSize,
    ...(bg ? { background: bg } : {}),
    ...(fg ? { color: fg } : {}),
  };

  return (
    <div
      className={['brand-mark', `brand-mark--${tone}`, className].filter(Boolean).join(' ').trim()}
      role="img"
      aria-label="movly."
      style={style}
    >
      m
    </div>
  );
}
