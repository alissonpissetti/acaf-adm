import { useEffect, useState } from 'react';

const MQ = '(max-width: 1024px)';

/** Lista no celular/tablet estreito — evita Gantt com scroll horizontal. */
export function useCronogramaMobileLayout() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MQ);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return mobile;
}