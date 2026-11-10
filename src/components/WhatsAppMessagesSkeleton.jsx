const PATTERN = [
  { kind: 'in', lines: 2, width: '62%' },
  { kind: 'out', lines: 1, width: '48%' },
  { kind: 'group', lines: 2, width: '72%' },
  { kind: 'out', lines: 3, width: '55%' },
  { kind: 'in', lines: 1, width: '38%' },
  { kind: 'group', lines: 1, width: '58%' },
  { kind: 'in', lines: 2, width: '68%' },
  { kind: 'out', lines: 2, width: '42%' },
];

function SkeletonBubble({ kind, lines, width }) {
  const tone = kind === 'out' ? 'out' : 'in';

  const bubble = (
    <div
      className={`whatsapp-wa-msg-skeleton-bubble whatsapp-wa-msg-skeleton-bubble--${tone}`}
      style={{ width: `min(${width}, 85%)` }}
      aria-hidden="true"
    >
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className="whatsapp-wa-skeleton whatsapp-wa-skeleton--line"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
      <span className="whatsapp-wa-msg-skeleton-bubble__time whatsapp-wa-skeleton whatsapp-wa-skeleton--time" />
    </div>
  );

  if (kind === 'group') {
    return (
      <div className="whatsapp-wa-msg-skeleton-group" aria-hidden="true">
        <span className="whatsapp-wa-skeleton whatsapp-wa-skeleton--avatar whatsapp-wa-skeleton--avatar-sm" />
        {bubble}
      </div>
    );
  }

  return bubble;
}

export function WhatsAppMessagesSkeleton() {
  return (
    <div
      className="whatsapp-wa-msg-skeleton"
      aria-label="Carregando mensagens"
      aria-busy="true"
    >
      {PATTERN.map((row, i) => (
        <SkeletonBubble key={i} kind={row.kind} lines={row.lines} width={row.width} />
      ))}
    </div>
  );
}
