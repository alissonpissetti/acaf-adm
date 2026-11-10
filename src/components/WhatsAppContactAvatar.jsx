import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar.jsx';
import {
  getCachedWhatsAppAvatarSrc,
  isWhatsAppAvatarMiss,
  loadWhatsAppAvatarQueued,
  subscribeWhatsAppAvatarCache,
  whatsAppAvatarCacheKey,
} from '../utils/whatsappAvatarCache.js';

export function WhatsAppContactAvatar({
  name,
  instanceId,
  contactPhone,
  avatarUrl,
  size = 'md',
  className = '',
  lazy = true,
  rootRef = null,
}) {
  const hostRef = useRef(null);
  const [src, setSrc] = useState('');
  const [visible, setVisible] = useState(!lazy);

  const cacheKey =
    instanceId && contactPhone ? whatsAppAvatarCacheKey(instanceId, contactPhone) : '';

  useEffect(() => {
    if (!lazy) {
      setVisible(true);
      return undefined;
    }
    const node = hostRef.current;
    if (!node) return undefined;
    const root = rootRef?.current ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root, rootMargin: '120px 0px', threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lazy, rootRef]);

  useEffect(() => {
    const syncFromCache = () => {
      if (!cacheKey) return;
      setSrc(getCachedWhatsAppAvatarSrc(cacheKey));
    };
    syncFromCache();
    return subscribeWhatsAppAvatarCache(syncFromCache);
  }, [cacheKey]);

  useEffect(() => {
    if (!visible) return undefined;

    if (!avatarUrl) {
      setSrc('');
      return undefined;
    }

    if (avatarUrl.startsWith('http')) {
      setSrc(avatarUrl);
      return undefined;
    }

    if (!instanceId || !contactPhone || !cacheKey) {
      setSrc('');
      return undefined;
    }

    const cached = getCachedWhatsAppAvatarSrc(cacheKey);
    if (cached) {
      setSrc(cached);
      return undefined;
    }
    if (isWhatsAppAvatarMiss(cacheKey)) {
      setSrc('');
      return undefined;
    }

    let cancelled = false;
    void loadWhatsAppAvatarQueued(instanceId, contactPhone).then((url) => {
      if (!cancelled) setSrc(url || '');
    });

    return () => {
      cancelled = true;
    };
  }, [visible, avatarUrl, instanceId, contactPhone, cacheKey]);

  const fallbackName =
    name && !/^contato\s*·/i.test(name) && name !== 'Contato WhatsApp' ? name : 'WhatsApp';

  return (
    <span ref={hostRef} className="whatsapp-contact-avatar-host">
      <Avatar
        name={fallbackName}
        src={src || undefined}
        size={size}
        className={`whatsapp-contact-avatar${className ? ` ${className}` : ''}`}
      />
    </span>
  );
}
