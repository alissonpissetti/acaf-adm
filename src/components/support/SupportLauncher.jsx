import { Headphones } from 'lucide-react';
import { useSupport } from './SupportContext.jsx';
import '../../styles/support.css';

export function SupportLauncher({ compact = false }) {
  const { openSupport } = useSupport();

  if (compact) {
    return (
      <button
        type="button"
        className="support-launcher support-launcher--compact"
        aria-label="Abrir chamado de atendimento"
        title="Atendimento"
        onClick={() => openSupport()}
      >
        <Headphones size={18} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="support-launcher-fab"
      aria-label="Abrir chamado de atendimento"
      onClick={() => openSupport()}
    >
      <Headphones size={20} aria-hidden="true" />
      <span>Atendimento</span>
    </button>
  );
}
