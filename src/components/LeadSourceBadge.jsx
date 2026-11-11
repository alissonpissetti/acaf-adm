/** Badge de origem do lead (cores vêm da API). */
export function LeadSourceBadge({ lead, compact = false }) {
  if (!lead?.sourceLabel) return null;

  const style = {
    color: lead.sourceColor ?? '#475569',
    background: lead.sourceSoft ?? 'rgba(71, 85, 105, 0.12)',
  };

  return (
    <span
      className={`commercial-lead-source-badge${compact ? ' commercial-lead-source-badge--compact' : ''}`}
      style={style}
      title={`Origem: ${lead.sourceLabel}`}
    >
      <span
        className="commercial-lead-source-badge-dot"
        style={{ background: lead.sourceColor ?? '#475569' }}
        aria-hidden
      />
      {lead.sourceLabel}
    </span>
  );
}

/** Legenda fixa das origens cadastradas (carregada da API ou fallback local). */
export function LeadSourcesLegend({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="commercial-lead-sources-legend" aria-label="Origens de lead">
      {items.map((item) => (
        <span
          key={item.key}
          className="commercial-lead-sources-legend-item"
          style={{
            color: item.color,
            background: item.soft,
          }}
        >
          <span className="commercial-lead-source-badge-dot" style={{ background: item.color }} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}
