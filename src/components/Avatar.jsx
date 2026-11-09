import { useEffect, useState } from 'react';
import { getInitials } from '../utils/initials.js';
import { getAvatarColorStyle, pickAvatarColor } from '../utils/avatarColors.js';

const SIZE_CLASS = {
  xs: 'avatar-xs',
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
};

export function Avatar({ name, src, color, size = 'md', title, className = '' }) {
  const label = title ?? name ?? 'Avatar';
  const sizeClass = SIZE_CLASS[size] ?? SIZE_CLASS.md;
  const fallbackColor = color || pickAvatarColor(name || label);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  // Se a imagem falhar (URL expirada, arquivo removido), cai para as iniciais
  // em vez de mostrar o texto alternativo quebrado.
  if (src && !broken) {
    return (
      <img
        className={`avatar ${sizeClass} ${className}`.trim()}
        src={src}
        alt={label}
        title={label}
        draggable={false}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className={`avatar avatar-fallback ${sizeClass} ${className}`.trim()}
      style={getAvatarColorStyle(fallbackColor)}
      title={label}
      aria-label={label}
    >
      {getInitials(name)}
    </span>
  );
}
