import { useEffect, useState } from 'react';
import { fetchWhatsAppContactAvatarBlob } from '../api/evolution.js';
import { Avatar } from './Avatar.jsx';

export function WhatsAppContactAvatar({
  name,
  instanceId,
  contactPhone,
  avatarUrl,
  size = 'md',
  className = '',
}) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!avatarUrl) {
      setSrc('');
      return undefined;
    }

    if (avatarUrl.startsWith('http')) {
      setSrc(avatarUrl);
      return undefined;
    }

    if (!instanceId || !contactPhone) {
      setSrc('');
      return undefined;
    }

    let objectUrl = '';
    let cancelled = false;

    void fetchWhatsAppContactAvatarBlob(instanceId, contactPhone)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc('');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl, instanceId, contactPhone]);

  const fallbackName =
    name && !/^contato\s*·/i.test(name) && name !== 'Contato WhatsApp' ? name : 'WhatsApp';

  return (
    <Avatar
      name={fallbackName}
      src={src || undefined}
      size={size}
      className={`whatsapp-contact-avatar${className ? ` ${className}` : ''}`}
    />
  );
}
