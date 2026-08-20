import { X } from 'lucide-react';

export function ModalCloseButton({ onClick, label = 'Fechar', className = '' }) {
  return (
    <button
      type="button"
      className={`modal-close-btn ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
    >
      <X size={18} aria-hidden="true" />
    </button>
  );
}
