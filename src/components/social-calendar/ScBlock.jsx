import { ChevronDown } from 'lucide-react';

/** Seção recolhível padrão do calendário de redes */
export function ScBlock({ title, meta, metaTone, children, defaultOpen = false }) {
  return (
    <details className="sc-block" open={defaultOpen || undefined}>
      <summary className="sc-block-summary">
        <ChevronDown className="sc-block-chevron" size={16} strokeWidth={2.25} aria-hidden />
        <span className="sc-block-title">{title}</span>
        {meta ? (
          <span className={`sc-block-meta${metaTone ? ` sc-block-meta--${metaTone}` : ''}`} title={meta}>
            {meta}
          </span>
        ) : (
          <span className="sc-block-meta sc-block-meta--empty" aria-hidden />
        )}
      </summary>
      <div className="sc-block-body">{children}</div>
    </details>
  );
}