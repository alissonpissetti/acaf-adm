import { CalendarClock, Coins, Link2, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  accountPlanDisplayName,
  costCenterDisplayName,
} from './cashEntryDisplay.js';
import { formatDate, formatDateTime, formatMoney, statusClass, statusLabel } from '../utils/finance.js';

function ViewSection({ title, children }) {
  return (
    <section className="cash-entry-view-section">
      <h3 className="cash-entry-view-section-title">{title}</h3>
      <dl className="cash-entry-view-grid">{children}</dl>
    </section>
  );
}

function ViewField({ label, children, wide = false, mono = false }) {
  const empty = children == null || children === '' || (Array.isArray(children) && children.every((c) => !c));
  return (
    <div className={`cash-entry-view-field${wide ? ' cash-entry-view-field--wide' : ''}`}>
      <dt className="cash-entry-view-label">{label}</dt>
      <dd className={`cash-entry-view-value${mono ? ' cash-entry-view-value--mono' : ''}`}>
        {empty ? '—' : children}
      </dd>
    </div>
  );
}

function userProfileHref(userId) {
  return `/m/operacao/usuarios?id=${encodeURIComponent(userId)}&mode=view`;
}

export function CashEntryView({
  entry,
  counterpartLabel,
  enablePayerSelect = false,
  enableReimbursement = false,
  onViewLinkedEntry,
}) {
  const isSettled = entry.status === 'settled';
  const costCenterName = costCenterDisplayName(entry);
  const costCenterCode = entry.costCenter?.code;
  const costCenterText =
    costCenterCode && costCenterName ? `${costCenterCode} — ${costCenterName}` : costCenterName || costCenterCode;
  const planText = entry.accountPlan
    ? `${entry.accountPlan.code} — ${entry.accountPlan.name}`
    : accountPlanDisplayName(entry);
  const platformUserId = entry.platformUserId ?? entry.userId ?? entry.payer?.userId;
  const showConnect =
    enablePayerSelect &&
    (entry.asaasPaymentId ||
      entry.asaasSubscriptionId ||
      entry.connectHolderKey ||
      entry.transactionId);

  return (
    <div className="cash-entry-view">
      <section className="panel cash-entry-view-hero" aria-label="Resumo do lançamento">
        <div className="cash-entry-view-hero-inner">
          <div className="cash-entry-view-hero-main">
            <div className="cash-entry-view-hero-title-row">
              <h2 className="cash-entry-view-title">{entry.description || 'Lançamento'}</h2>
              {entry.status ? (
                <span className={statusClass(entry.status)}>{statusLabel(entry.status)}</span>
              ) : null}
            </div>
            {entry.recurrenceTotal > 1 ? (
              <p className="cash-entry-view-hero-meta">
                Série mensal · parcela {entry.recurrenceIndex} de {entry.recurrenceTotal}
              </p>
            ) : null}
            {entry.counterpartName ? (
              <p className="cash-entry-view-hero-meta">
                {counterpartLabel}: <strong>{entry.counterpartName}</strong>
              </p>
            ) : null}
          </div>
          <div className="cash-entry-view-hero-stats">
            <div className="company-detail-stat cash-entry-view-stat cash-entry-view-stat--amount">
              <Coins size={18} aria-hidden="true" />
              <span>Valor</span>
              <strong className="cash-entry-view-amount">{formatMoney(entry.amount)}</strong>
            </div>
            <div className="company-detail-stat cash-entry-view-stat">
              <CalendarClock size={18} aria-hidden="true" />
              <span>Vencimento</span>
              <strong>{formatDate(entry.dueDate)}</strong>
            </div>
          </div>
        </div>
      </section>

      {enableReimbursement && entry.reimbursementPayable ? (
        <div className="payable-reimbursement-info cash-entry-view-linked">
          <span className="muted">Reembolso gerado</span>
          <div className="payable-reimbursement-info-body">
            <div>
              <strong>{entry.reimbursementPayable.description}</strong>
              <div className="table-sub">
                {entry.reimbursementPayable.counterpartName} · {formatMoney(entry.reimbursementPayable.amount)} ·{' '}
                <span className={statusClass(entry.reimbursementPayable.status)}>
                  {statusLabel(entry.reimbursementPayable.status)}
                </span>
              </div>
            </div>
            {onViewLinkedEntry ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => onViewLinkedEntry(entry.reimbursementPayable.id)}
              >
                Ver reembolso
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {enableReimbursement && entry.reimbursementSourcePayable ? (
        <div className="payable-reimbursement-info cash-entry-view-linked">
          <span className="muted">Reembolso vinculado ao lançamento</span>
          <div className="payable-reimbursement-info-body">
            <div>
              <strong>{entry.reimbursementSourcePayable.description}</strong>
              <div className="table-sub">
                {formatMoney(entry.reimbursementSourcePayable.amount)} ·{' '}
                <span className={statusClass(entry.reimbursementSourcePayable.status)}>
                  {statusLabel(entry.reimbursementSourcePayable.status)}
                </span>
              </div>
            </div>
            {onViewLinkedEntry ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => onViewLinkedEntry(entry.reimbursementSourcePayable.id)}
              >
                Ver lançamento original
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-body cash-entry-view-body">
          <ViewSection title="Identificação">
            <ViewField label={counterpartLabel}>{entry.counterpartName}</ViewField>
            {enablePayerSelect ? (
              <ViewField label="Tipo de pagador">
                {entry.payerKindLabel ?? entry.payer?.kindLabel ?? entry.payerKind ?? '—'}
              </ViewField>
            ) : null}
            {enablePayerSelect && platformUserId ? (
              <ViewField label="Usuário na plataforma" wide>
                <Link className="crud-link-btn" to={userProfileHref(platformUserId)}>
                  <UserRound size={14} aria-hidden="true" style={{ marginRight: '0.35rem', verticalAlign: '-2px' }} />
                  Ver perfil do usuário
                </Link>
                <span className="cash-entry-view-id-hint">ID {platformUserId}</span>
              </ViewField>
            ) : null}
            {entry.id ? (
              <ViewField label="ID do lançamento" mono>
                {entry.id}
              </ViewField>
            ) : null}
          </ViewSection>

          <ViewSection title="Datas">
            <ViewField label="Vencimento">{formatDate(entry.dueDate)}</ViewField>
            <ViewField label="Execução / baixa">{entry.settledAt ? formatDateTime(entry.settledAt) : '—'}</ViewField>
            <ViewField label={isSettled ? 'Compensação' : 'Previsão de baixa'}>
              {entry.expectedSettledAt ? formatDate(entry.expectedSettledAt) : '—'}
            </ViewField>
            {entry.createdAt ? (
              <ViewField label="Criado em">{formatDateTime(entry.createdAt)}</ViewField>
            ) : null}
            {entry.updatedAt ? (
              <ViewField label="Atualizado em">{formatDateTime(entry.updatedAt)}</ViewField>
            ) : null}
          </ViewSection>

          <ViewSection title="Classificação">
            <ViewField label="Centro de custo">{costCenterText}</ViewField>
            <ViewField label={entry.accountPlan ? 'Plano de conta' : 'Categoria'}>{planText || entry.category}</ViewField>
          </ViewSection>

          {showConnect ? (
            <ViewSection title="Gateway / Asaas">
              {entry.asaasPaymentId ? (
                <ViewField label="Asaas — cobrança (payment)" mono wide>
                  {entry.asaasPaymentId}
                </ViewField>
              ) : null}
              {entry.asaasSubscriptionId ? (
                <ViewField label="Asaas — assinatura" mono wide>
                  {entry.asaasSubscriptionId}
                </ViewField>
              ) : null}
              {entry.connectHolderKey ? (
                <ViewField label="Titular da assinatura" mono>
                  {entry.connectHolderKey}
                </ViewField>
              ) : null}
              {entry.transactionId ? (
                <ViewField label="Transação" wide>
                  <span className="cash-entry-view-value--mono">{entry.transactionId}</span>
                  {platformUserId ? (
                    <Link className="crud-link-btn cash-entry-view-inline-link" to={userProfileHref(platformUserId)}>
                      <Link2 size={14} aria-hidden="true" />
                      Ver no perfil do usuário
                    </Link>
                  ) : null}
                </ViewField>
              ) : null}
            </ViewSection>
          ) : null}

          {entry.notes?.trim() ? (
            <ViewSection title="Observações">
              <ViewField label="Notas" wide>
                <span className="cash-entry-view-notes">{entry.notes.trim()}</span>
              </ViewField>
            </ViewSection>
          ) : null}
        </div>
      </section>
    </div>
  );
}
