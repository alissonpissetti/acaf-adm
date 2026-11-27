import { useEffect, useState } from 'react';

const MOBILE_TOOLBAR_MQ = '(max-width: 960px)';

export function useCrudToolbarMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_TOOLBAR_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_TOOLBAR_MQ);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}