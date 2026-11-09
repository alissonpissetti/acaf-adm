/**
 * PNG extraídos do manual `movly-by-acaf.app.pdf` (p. 3).
 */
export const BRAND_LOGO_NATURAL = {
  lime: { w: 791, h: 386 },
  purple: { w: 813, h: 414 },
  white: { w: 791, h: 386 },
  gradient: { w: 791, h: 387 },
  black: { w: 791, h: 386 },
};

export const BRAND_LOGO_SRC = {
  lime: '/branding/movly-logo-lime-on-purple.png',
  purple: '/branding/movly-logo-purple-on-lime.png',
  white: '/branding/movly-logo-lime-on-purple.png',
  gradient: '/branding/movly-logo-lime-on-gradient.png',
  black: '/branding/movly-logo-purple-on-lime.png',
};

export function brandLogoDimensions(variant, height) {
  const { w, h } = BRAND_LOGO_NATURAL[variant] ?? BRAND_LOGO_NATURAL.purple;
  return { width: Math.round((height * w) / h), height };
}
