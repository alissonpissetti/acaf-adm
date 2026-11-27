import { useEffect, useId, useRef, useState } from 'react';

function formatPtNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('pt-BR').format(Number(n));
}

function MetricChip({ chipKey, shortLabel, value, title, detail, openId, onToggle }) {
  const isOpen = openId === chipKey;
  const wrapRef = useRef(null);
  const chipId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        onToggle(null);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') onToggle(null);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onToggle]);

  return (
    <div ref={wrapRef} className={`acaf-lives-chip-wrap${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="acaf-lives-chip"
        title={title}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? `${chipId}-detail` : undefined}
        onClick={() => onToggle(isOpen ? null : chipKey)}
      >
        <strong className="acaf-lives-chip__value">{formatPtNumber(value)}</strong>
        <span className="acaf-lives-chip__abbr">{shortLabel}</span>
      </button>
      <div className="acaf-lives-chip__detail" id={`${chipId}-detail`} role="tooltip">
        {detail}
      </div>
    </div>
  );
}

export function PayingLivesDiagnosticsChips({ diagnostics }) {
  const [openChip, setOpenChip] = useState(null);

  if (!diagnostics) return null;

  const monthPrefix = diagnostics.monthPrefix ?? '—';
  const holders = diagnostics.checkInHoldersThisMonth ?? 0;
  const events = diagnostics.checkInEventsThisMonth ?? 0;
  const pending = diagnostics.pendingHoldersThisMonth ?? 0;

  const items = [
    {
      key: 'holders',
      shortLabel: 'Tit.',
      value: holders,
      title: 'Titulares únicos no mês',
      detail: `${formatPtNumber(holders)} titular(es) distinto(s) com check-in de plano no mês civil ${monthPrefix}. É a mesma regra do KPI de vidas pagantes (confirmado ou pendente na recepção).`,
    },
    {
      key: 'events',
      shortLabel: 'Log',
      value: events,
      title: 'Check-ins no log',
      detail: `${formatPtNumber(events)} check-in(s) de plano gravados no log neste mês (${monthPrefix}). Pode ser maior que titulares únicos quando a mesma pessoa visita mais de uma vez.`,
    },
  ];

  if (pending > 0) {
    items.push({
      key: 'pending',
      shortLabel: 'Pend.',
      value: pending,
      title: 'Pendentes na recepção',
      detail: `${formatPtNumber(pending)} titular(es) com solicitação de check-in aguardando confirmação na recepção. Entram na contagem de vidas pagantes enquanto estiverem pendentes.`,
    });
  }

  return (
    <div className="acaf-lives-kpi__chips" aria-label="Detalhes das vidas pagantes">
      {items.map((item) => (
        <MetricChip
          chipKey={item.key}
          shortLabel={item.shortLabel}
          value={item.value}
          title={item.title}
          detail={item.detail}
          openId={openChip}
          onToggle={setOpenChip}
        />
      ))}
    </div>
  );
}