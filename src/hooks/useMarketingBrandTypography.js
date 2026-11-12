import { useEffect, useState } from 'react';
import {
  ensureBrandTypographyForFont,
  getCachedBrandTypography,
  loadBrandTypography,
  shouldLoadBrandTypography,
} from '../utils/marketingBrandTypography.js';

export function useMarketingBrandTypography(fontFamily) {
  const [brandTypography, setBrandTypography] = useState(() => getCachedBrandTypography());

  useEffect(() => {
    let cancelled = false;

    if (!shouldLoadBrandTypography(fontFamily)) {
      return undefined;
    }

    const cached = getCachedBrandTypography();
    if (cached) {
      ensureBrandTypographyForFont(fontFamily);
      setBrandTypography(cached);
      return undefined;
    }

    loadBrandTypography().then((result) => {
      if (cancelled || !result) return;
      ensureBrandTypographyForFont(fontFamily);
      setBrandTypography(result);
    });

    return () => {
      cancelled = true;
    };
  }, [fontFamily]);

  return brandTypography;
}
