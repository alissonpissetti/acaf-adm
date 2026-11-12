import { getMarketingBrandTypography } from '../api/public.js';

export const APP_DEFAULT_FONT_FAMILY = 'app-default';

export const MOVEMENT_FONT_STACK =
  "'Figtree', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const FONT_FAMILY_STACKS = {
  'system-ui': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  Georgia: 'Georgia, "Times New Roman", Times, serif',
  Roboto: 'Roboto, system-ui, sans-serif',
  Inter: MOVEMENT_FONT_STACK,
  Figtree: MOVEMENT_FONT_STACK,
};

export function isAppDefaultMarketingFont(fontFamily) {
  const value = String(fontFamily ?? '').trim();
  return !value || value === APP_DEFAULT_FONT_FAMILY || value === 'Inter';
}

export function resolveMarketingFontFamily(fontFamily, brandTypography) {
  if (isAppDefaultMarketingFont(fontFamily)) {
    return brandTypography?.cssFamily ?? MOVEMENT_FONT_STACK;
  }
  const stack = FONT_FAMILY_STACKS[fontFamily];
  if (stack) return stack;
  if (fontFamily === 'Figtree' && brandTypography?.cssFamily) {
    return brandTypography.cssFamily;
  }
  return fontFamily;
}

export function shouldLoadBrandTypography(fontFamily) {
  if (fontFamily == null) return false;
  const value = String(fontFamily).trim();
  if (isAppDefaultMarketingFont(value)) return true;
  return value === 'Figtree' || value === 'Inter';
}

export function injectBrandFontFaces(brandTypography, styleId = 'marketing-brand-fonts') {
  if (typeof document === 'undefined' || !brandTypography?.faces?.length) return;

  const css = brandTypography.faces
    .map(
      (face) =>
        `@font-face{font-family:'${face.family}';src:url('${face.url}') format('woff2');font-weight:${face.weight};font-style:${face.style ?? 'normal'};font-display:swap;}`,
    )
    .join('');

  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

let brandTypographyCache = null;
let brandTypographyPromise = null;

export function getCachedBrandTypography() {
  return brandTypographyCache;
}

export function seedBrandTypographyCache(typography) {
  if (!typography) return;
  brandTypographyCache = typography;
}

export async function loadBrandTypography() {
  if (brandTypographyCache) return brandTypographyCache;
  if (!brandTypographyPromise) {
    brandTypographyPromise = getMarketingBrandTypography()
      .then((result) => {
        brandTypographyCache = result;
        return result;
      })
      .catch(() => {
        brandTypographyPromise = null;
        return null;
      });
  }
  return brandTypographyPromise;
}

export async function ensureBrandTypographyForFont(fontFamily) {
  if (!shouldLoadBrandTypography(fontFamily)) return null;
  const typography = await loadBrandTypography();
  if (typography) injectBrandFontFaces(typography);
  return typography;
}
